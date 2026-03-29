export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export type DiffKind = "equal" | "added" | "removed" | "changed" | "nested";

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  total: number;
}

export interface DiffNode {
  id: string;
  path: string;
  key: string | number | null;
  kind: DiffKind;
  leftValue?: JsonValue;
  rightValue?: JsonValue;
  leftType: JsonType | "missing";
  rightType: JsonType | "missing";
  children: DiffNode[];
  stats: DiffStats;
}

export interface DiffSection {
  id: string;
  path: string;
  kind: "added" | "removed" | "changed";
  leftLines: string[];
  rightLines: string[];
  leftType: JsonType | "missing";
  rightType: JsonType | "missing";
  stats: DiffStats;
  summary: string;
}

const MISSING = Symbol("missing");
type Missing = typeof MISSING;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export function buildDiff(left: JsonValue, right: JsonValue): DiffNode {
  return diffValue(left, right, "$", null);
}

export function buildSections(root: DiffNode): DiffSection[] {
  const sections: DiffSection[] = [];

  function visit(node: DiffNode) {
    if (node.kind === "equal") {
      return;
    }

    if (node.children.length > 0) {
      node.children.forEach(visit);
      return;
    }

    sections.push({
      id: node.id,
      path: node.path,
      kind: node.kind,
      leftLines: serializeValue(node.leftValue),
      rightLines: serializeValue(node.rightValue),
      leftType: node.leftType,
      rightType: node.rightType,
      stats: node.stats,
      summary: summarizeNode(node),
    });
  }

  visit(root);

  return sections;
}

export function countChanges(stats: DiffStats): number {
  return stats.added + stats.removed + stats.changed;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function diffValue(
  left: JsonValue | Missing,
  right: JsonValue | Missing,
  path: string,
  key: string | number | null,
): DiffNode {
  const leftMissing = left === MISSING;
  const rightMissing = right === MISSING;
  const leftType = leftMissing ? "missing" : getJsonType(left);
  const rightType = rightMissing ? "missing" : getJsonType(right);

  if (leftMissing) {
    return createNode(
      "added",
      path,
      key,
      undefined,
      right,
      "missing",
      rightType,
      expandMissingBranch("added", right, path),
    );
  }

  if (rightMissing) {
    return createNode(
      "removed",
      path,
      key,
      left,
      undefined,
      leftType,
      "missing",
      expandMissingBranch("removed", left, path),
    );
  }

  if (leftType === "object" && rightType === "object") {
    const children = diffObject(
      left as Record<string, JsonValue>,
      right as Record<string, JsonValue>,
      path,
    );
    const kind = children.every((child) => child.kind === "equal") ? "equal" : "nested";
    return createNode(kind, path, key, left, right, leftType, rightType, children);
  }

  if (leftType === "array" && rightType === "array") {
    const children = diffArray(left as JsonValue[], right as JsonValue[], path);
    const kind = children.every((child) => child.kind === "equal") ? "equal" : "nested";
    return createNode(kind, path, key, left, right, leftType, rightType, children);
  }

  if (isBranchType(leftType) || isBranchType(rightType)) {
    const children = diffMismatchedBranch(left, right, leftType, rightType, path);

    if (children.length > 0) {
      return createNode("changed", path, key, left, right, leftType, rightType, children);
    }
  }

  if (deepEqual(left, right)) {
    return createNode("equal", path, key, left, right, leftType, rightType);
  }

  return createNode("changed", path, key, left, right, leftType, rightType);
}

function diffObject(
  left: Record<string, JsonValue>,
  right: Record<string, JsonValue>,
  path: string,
): DiffNode[] {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  const seen = new Set(leftKeys);
  const orderedKeys = [...leftKeys, ...rightKeys.filter((key) => !seen.has(key))];

  return orderedKeys.map((key) =>
    diffValue(
      Object.prototype.hasOwnProperty.call(left, key) ? left[key] : MISSING,
      Object.prototype.hasOwnProperty.call(right, key) ? right[key] : MISSING,
      appendObjectPath(path, key),
      key,
    ),
  );
}

function diffArray(left: JsonValue[], right: JsonValue[], path: string): DiffNode[] {
  const length = Math.max(left.length, right.length);

  return Array.from({ length }, (_, index) =>
    diffValue(
      index < left.length ? left[index] : MISSING,
      index < right.length ? right[index] : MISSING,
      `${path}[${index}]`,
      index,
    ),
  );
}

function diffMismatchedBranch(
  left: JsonValue,
  right: JsonValue,
  leftType: JsonType,
  rightType: JsonType,
  path: string,
): DiffNode[] {
  const children: DiffNode[] = [];

  if (leftType === "object") {
    children.push(
      ...expandMissingBranch("removed", left as Record<string, JsonValue>, path),
    );
  } else if (leftType === "array") {
    children.push(...expandMissingBranch("removed", left as JsonValue[], path));
  }

  if (rightType === "object") {
    children.push(
      ...expandMissingBranch("added", right as Record<string, JsonValue>, path),
    );
  } else if (rightType === "array") {
    children.push(...expandMissingBranch("added", right as JsonValue[], path));
  }

  return children;
}

function expandMissingBranch(
  kind: "added" | "removed",
  value: JsonValue,
  path: string,
): DiffNode[] {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      kind === "added"
        ? diffValue(MISSING, item, `${path}[${index}]`, index)
        : diffValue(item, MISSING, `${path}[${index}]`, index),
    );
  }

  if (isObject(value)) {
    return Object.keys(value).map((key) =>
      kind === "added"
        ? diffValue(MISSING, value[key], appendObjectPath(path, key), key)
        : diffValue(value[key], MISSING, appendObjectPath(path, key), key),
    );
  }

  return [];
}

function createNode(
  kind: DiffKind,
  path: string,
  key: string | number | null,
  leftValue?: JsonValue,
  rightValue?: JsonValue,
  leftType: JsonType | "missing" = "missing",
  rightType: JsonType | "missing" = "missing",
  children: DiffNode[] = [],
): DiffNode {
  return {
    id: path,
    path,
    key,
    kind,
    leftValue,
    rightValue,
    leftType,
    rightType,
    children,
    stats: buildStats(kind, leftValue, rightValue, children),
  };
}

function buildStats(
  kind: DiffKind,
  leftValue: JsonValue | undefined,
  rightValue: JsonValue | undefined,
  children: DiffNode[],
): DiffStats {
  if (children.length > 0) {
    return children.reduce(
      (stats, child) => mergeStats(stats, child.stats),
      createEmptyStats(),
    );
  }

  if (kind === "added") {
    const total = countEntries(rightValue);
    return {
      added: total,
      removed: 0,
      changed: 0,
      unchanged: 0,
      total,
    };
  }

  if (kind === "removed") {
    const total = countEntries(leftValue);
    return {
      added: 0,
      removed: total,
      changed: 0,
      unchanged: 0,
      total,
    };
  }

  if (kind === "changed") {
    return {
      added: 0,
      removed: 0,
      changed: 1,
      unchanged: 0,
      total: 1,
    };
  }

  return {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 1,
    total: 1,
  };
}

function createEmptyStats(): DiffStats {
  return {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
    total: 0,
  };
}

function mergeStats(base: DiffStats, next: DiffStats): DiffStats {
  return {
    added: base.added + next.added,
    removed: base.removed + next.removed,
    changed: base.changed + next.changed,
    unchanged: base.unchanged + next.unchanged,
    total: base.total + next.total,
  };
}

function countEntries(value: JsonValue | undefined): number {
  if (value === undefined) {
    return 0;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 1;
    }

    return value.reduce((sum, item) => sum + countEntries(item), 0);
  }

  if (isObject(value)) {
    const keys = Object.keys(value);

    if (keys.length === 0) {
      return 1;
    }

    return keys.reduce((sum, key) => sum + countEntries(value[key]), 0);
  }

  return 1;
}

function serializeValue(value: JsonValue | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return JSON.stringify(value, null, 2).split("\n");
}

function summarizeNode(node: DiffNode): string {
  if (node.kind === "added") {
    return `${formatCount(node.stats.added)} 项新增`;
  }

  if (node.kind === "removed") {
    return `${formatCount(node.stats.removed)} 项删除`;
  }

  if (node.leftType !== node.rightType) {
    return `类型变更: ${typeLabel(node.leftType)} -> ${typeLabel(node.rightType)}`;
  }

  return "值已变更";
}

function typeLabel(type: JsonType | "missing"): string {
  switch (type) {
    case "object":
      return "object";
    case "array":
      return "array";
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    default:
      return "missing";
  }
}

function isBranchType(type: JsonType | "missing"): type is "object" | "array" {
  return type === "object" || type === "array";
}

function appendObjectPath(base: string, key: string): string {
  if (IDENTIFIER.test(key)) {
    return `${base}.${key}`;
  }

  return `${base}[${JSON.stringify(key)}]`;
}

function getJsonType(value: JsonValue): JsonType {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (typeof value === "object") {
    return "object";
  }

  return typeof value;
}

function deepEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => deepEqual(item, right[index]));
  }

  if (isObject(left) || isObject(right)) {
    if (!isObject(left) || !isObject(right)) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        deepEqual(left[key], right[key]),
    );
  }

  return false;
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
