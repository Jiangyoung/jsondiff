import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  buildDiff,
  buildSections,
  countChanges,
  formatCount,
  type DiffKind,
  type DiffNode,
  type DiffStats,
  type JsonType,
  type JsonValue,
} from "./diff";

const SAMPLE_LEFT = `{
  "service": "jsondiff",
  "version": 2,
  "enabled": true,
  "theme": {
    "mode": "modern",
    "density": "comfortable",
    "accent": "cyan"
  },
  "owners": ["anna", "li"],
  "threshold": 0.76,
  "meta": {
    "env": "prod",
    "region": "us-east-1"
  }
}`;

const SAMPLE_RIGHT = `{
  "service": "jsondiff",
  "version": 3,
  "enabled": false,
  "theme": {
    "mode": "modern",
    "density": "compact",
    "accent": "emerald",
    "shadow": true
  },
  "owners": ["anna", "zhao", "li"],
  "threshold": 0.82,
  "meta": {
    "env": "staging",
    "region": "us-east-1"
  },
  "pipeline": {
    "status": "active",
    "updatedAt": "2026-03-29T18:30:00Z"
  }
}`;

interface ParseResult {
  value?: JsonValue;
  error?: string;
}

interface CompareResult {
  leftError?: string;
  rightError?: string;
  root?: DiffNode;
  diffLeafCount: number;
  stats?: DiffStats;
  comparedAt: string;
}

interface TreeRow {
  id: string;
  node: DiffNode;
  depth: number;
  collapsed: boolean;
  branch: boolean;
}

const initialResult = compareJson(SAMPLE_LEFT, SAMPLE_RIGHT);

export default function App() {
  const [leftText, setLeftText] = useState(SAMPLE_LEFT);
  const [rightText, setRightText] = useState(SAMPLE_RIGHT);
  const [result, setResult] = useState<CompareResult>(initialResult);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(
    createCollapsedState(initialResult.root),
  );
  const [showUnchanged, setShowUnchanged] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const resultSectionRef = useRef<HTMLElement | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const totalChanges = result.stats ? countChanges(result.stats) : 0;
  const hasErrors = Boolean(result.leftError || result.rightError);
  const hasChanges = totalChanges > 0;
  const treeRows = result.root
    ? buildTreeRows(result.root, collapsedMap, showUnchanged)
    : [];

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 520);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handleCompare() {
    const next = compareJson(leftText, rightText);
    setResult(next);
    setCollapsedMap(createCollapsedState(next.root));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!resultSectionRef.current) {
          return;
        }

        const targetTop =
          resultSectionRef.current.getBoundingClientRect().top + window.scrollY - 12;

        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: "smooth",
        });
      });
    });
  }

  function handleLoadSample() {
    setLeftText(SAMPLE_LEFT);
    setRightText(SAMPLE_RIGHT);

    const next = compareJson(SAMPLE_LEFT, SAMPLE_RIGHT);
    setResult(next);
    setCollapsedMap(createCollapsedState(next.root));
  }

  function handleSwap() {
    const nextLeft = rightText;
    const nextRight = leftText;

    setLeftText(nextLeft);
    setRightText(nextRight);

    const next = compareJson(nextLeft, nextRight);
    setResult(next);
    setCollapsedMap(createCollapsedState(next.root));
  }

  function handleClear() {
    setLeftText("");
    setRightText("");
    setResult({
      leftError: "左侧 JSON 为空",
      rightError: "右侧 JSON 为空",
      diffLeafCount: 0,
      comparedAt: formatTimestamp(),
    });
    setCollapsedMap({});
  }

  function handleFormat(side: "left" | "right") {
    const source = side === "left" ? leftText : rightText;
    const parsed = parseJson(source);

    if (parsed.error) {
      setResult((current) => ({
        ...current,
        leftError: side === "left" ? parsed.error : current.leftError,
        rightError: side === "right" ? parsed.error : current.rightError,
        comparedAt: formatTimestamp(),
      }));
      return;
    }

    const formatted = JSON.stringify(parsed.value, null, 2);

    if (side === "left") {
      setLeftText(formatted);
      setResult((current) => ({
        ...current,
        leftError: undefined,
      }));
      return;
    }

    setRightText(formatted);
    setResult((current) => ({
      ...current,
      rightError: undefined,
    }));
  }

  function toggleNode(nodeId: string) {
    setCollapsedMap((current) => ({
      ...current,
      [nodeId]: !current[nodeId],
    }));
  }

  function expandAll() {
    setCollapsedMap(createUniformCollapsedState(result.root, false));
  }

  function collapseAll() {
    setCollapsedMap(createUniformCollapsedState(result.root, true));
  }

  function dismissPwaBanner() {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <main className="app-shell">
        <section className="hero card">
          <div className="hero-copy">
            <p className="eyebrow">Vite + Modern UI</p>
            <h1>JSON Diff 对比工具</h1>
            <p className="hero-text">
              左右输入 JSON，点击对比后生成左右 JSON 树对照视图。通过树形层级、
              折叠展开和颜色高亮，更直接地定位字段、数组项和结构差异。
            </p>
          </div>

          <div className="hero-actions">
            <button className="ghost-button" onClick={handleLoadSample} type="button">
              载入示例
            </button>
            <button className="ghost-button" onClick={handleSwap} type="button">
              左右互换
            </button>
            <button className="ghost-button" onClick={handleClear} type="button">
              清空
            </button>
            <button className="primary-button" onClick={handleCompare} type="button">
              开始对比
            </button>
          </div>
        </section>

        {(offlineReady || needRefresh) && (
          <section className="card pwa-banner">
            <div>
              <p className="eyebrow">PWA</p>
              <h2>{needRefresh ? "检测到新版本" : "离线模式已就绪"}</h2>
              <p className="hero-text pwa-text">
                {needRefresh
                  ? "已有新版本可用，刷新后即可更新到最新资源。"
                  : "当前应用已经缓存关键静态资源，断网时仍可继续打开。"}
              </p>
            </div>

            <div className="hero-actions">
              {needRefresh && (
                <button
                  className="primary-button"
                  onClick={() => updateServiceWorker(true)}
                  type="button"
                >
                  立即更新
                </button>
              )}
              <button className="ghost-button" onClick={dismissPwaBanner} type="button">
                关闭
              </button>
            </div>
          </section>
        )}

        <section className="editor-grid">
          <EditorCard
            title="左侧 JSON"
            subtitle={`${countLines(leftText)} 行`}
            value={leftText}
            error={result.leftError}
            onChange={setLeftText}
            onFormat={() => handleFormat("left")}
          />
          <EditorCard
            title="右侧 JSON"
            subtitle={`${countLines(rightText)} 行`}
            value={rightText}
            error={result.rightError}
            onChange={setRightText}
            onFormat={() => handleFormat("right")}
          />
        </section>

        <section className="card result-card" ref={resultSectionRef}>
          <div className="result-header">
            <div>
              <p className="eyebrow">Tree Compare</p>
              <h2>对比结果</h2>
              <p className="result-meta">最近一次对比时间: {result.comparedAt}</p>
            </div>

            {result.root && (
              <div className="toolbar">
                <button
                  className={`ghost-button${showUnchanged ? " ghost-button-active" : ""}`}
                  onClick={() => setShowUnchanged((current) => !current)}
                  type="button"
                >
                  {showUnchanged ? "仅显示差异" : "显示完整树"}
                </button>
                <button className="ghost-button" onClick={expandAll} type="button">
                  展开全部
                </button>
                <button className="ghost-button" onClick={collapseAll} type="button">
                  折叠全部
                </button>
              </div>
            )}
          </div>

          {hasErrors && (
            <div className="empty-state error-state">
              <h3>JSON 解析失败</h3>
              <p>至少有一侧不是合法 JSON，修正后再执行对比。</p>
              {result.leftError && <p className="error-line">左侧: {result.leftError}</p>}
              {result.rightError && <p className="error-line">右侧: {result.rightError}</p>}
            </div>
          )}

          {!hasErrors && !hasChanges && (
            <div className="empty-state success-state">
              <h3>没有发现差异</h3>
              <p>两侧 JSON 结构和值完全一致。</p>
            </div>
          )}

          {!hasErrors && hasChanges && (
            <TreeComparePanel rows={treeRows} onToggle={toggleNode} />
          )}

          {result.stats && (
            <div className="stats-grid result-stats-grid">
              <StatCard label="总差异" value={formatCount(totalChanges)} tone="accent" />
              <StatCard label="新增" value={formatCount(result.stats.added)} tone="added" />
              <StatCard label="删除" value={formatCount(result.stats.removed)} tone="removed" />
              <StatCard label="修改" value={formatCount(result.stats.changed)} tone="changed" />
              <StatCard
                label="一致字段"
                value={formatCount(result.stats.unchanged)}
                tone="neutral"
              />
              <StatCard
                label="差异叶子"
                value={formatCount(result.diffLeafCount)}
                tone="soft"
              />
            </div>
          )}
        </section>
      </main>

      <button
        aria-label="返回顶部"
        className={`back-to-top${showBackToTop ? " back-to-top-visible" : ""}`}
        onClick={scrollToTop}
        type="button"
      >
        <span className="back-to-top-arrow">↑</span>
        <span>顶部</span>
      </button>
    </div>
  );
}

interface EditorCardProps {
  title: string;
  subtitle: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onFormat: () => void;
}

function EditorCard({
  title,
  subtitle,
  value,
  error,
  onChange,
  onFormat,
}: EditorCardProps) {
  return (
    <section className="card editor-card">
      <div className="editor-header">
        <div>
          <h2>{title}</h2>
          <p className="editor-meta">{subtitle}</p>
        </div>

        <button className="ghost-button" onClick={onFormat} type="button">
          格式化
        </button>
      </div>

      <textarea
        className={`editor-input${error ? " editor-input-error" : ""}`}
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="请输入合法 JSON"
      />

      <div className="editor-footer">
        <span>{value.length} chars</span>
        {error ? <span className="error-inline">{error}</span> : <span>JSON ready</span>}
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  tone: "accent" | "added" | "removed" | "changed" | "neutral" | "soft";
}

function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

interface TreeComparePanelProps {
  rows: TreeRow[];
  onToggle: (nodeId: string) => void;
}

function TreeComparePanel({ rows, onToggle }: TreeComparePanelProps) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const hoveredRow = rows.find((row) => row.id === hoveredRowId) ?? null;

  return (
    <section className="tree-panel">
      <div className="tree-pathbar">
        <span className="tree-pathbar-label">PATH</span>
        <code className="tree-pathbar-value">
          {hoveredRow ? hoveredRow.node.path : "$"}
        </code>
        <span className="tree-pathbar-meta">
          {hoveredRow
            ? `${typeLabel(hoveredRow.node.leftType)} ↔ ${typeLabel(hoveredRow.node.rightType)}`
            : "hover a node to inspect its path"}
        </span>
      </div>

      <div className="tree-header">
        <span>LEFT TREE</span>
        <span className="tree-status-head">STATUS</span>
        <span>RIGHT TREE</span>
      </div>

      <div className="tree-scroll">
        <div className="tree-table">
          {rows.map((row) => (
            <div
              className={`tree-row${hoveredRowId === row.id ? " tree-row-hovered" : ""}${
                row.node.path === "$" ? " tree-row-root" : ""
              }`}
              key={row.id}
              onMouseEnter={() => setHoveredRowId(row.id)}
              onMouseLeave={() => setHoveredRowId(null)}
              title={row.node.path}
            >
              <TreeNodeCell
                hovered={hoveredRowId === row.id}
                row={row}
                side="left"
                onToggle={onToggle}
              />
              <div className={`tree-status-cell${hoveredRowId === row.id ? " tree-status-cell-hovered" : ""}`}>
                <span className={`status-pill ${statusClass(row.node.kind)}`}>
                  {statusText(row.node.kind)}
                </span>
              </div>
              <TreeNodeCell
                hovered={hoveredRowId === row.id}
                row={row}
                side="right"
                onToggle={onToggle}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface TreeNodeCellProps {
  hovered: boolean;
  row: TreeRow;
  side: "left" | "right";
  onToggle: (nodeId: string) => void;
}

function TreeNodeCell({ hovered, row, side, onToggle }: TreeNodeCellProps) {
  const type = side === "left" ? row.node.leftType : row.node.rightType;
  const value = side === "left" ? row.node.leftValue : row.node.rightValue;
  const preview = formatValuePreview(value, type);
  const cellClass = `tree-cell ${treeCellTone(row.node.kind, side, type)}${
    hovered ? " tree-cell-hovered" : ""
  }`;
  const canToggle =
    row.branch && (type === "object" || type === "array");

  return (
    <div className={cellClass} title={row.node.path}>
      <div className="tree-node">
        <div className="tree-node-main">
          <span className="tree-indent" aria-hidden="true">
            {Array.from({ length: row.depth }, (_, index) => (
              <span className="tree-guide" key={`${row.id}-guide-${index}`} />
            ))}
          </span>

          {canToggle ? (
            <button
              aria-label={row.collapsed ? "展开节点" : "折叠节点"}
              className={`tree-toggle${row.collapsed ? " tree-toggle-collapsed" : ""}`}
              onClick={() => onToggle(row.node.id)}
              type="button"
            >
              <span className="tree-toggle-icon">▾</span>
            </button>
          ) : (
            <span className="tree-toggle-placeholder" />
          )}

          <span className="tree-connector" aria-hidden="true" />
          <span className={`tree-key${row.node.path === "$" ? " tree-key-root" : ""}`}>
            {formatNodeLabel(row.node)}
          </span>
          <span className="tree-colon">:</span>
          <code className={type === "missing" ? "tree-preview tree-preview-missing" : "tree-preview"}>
            {preview}
          </code>
        </div>

        <span className="tree-type-chip">{typeLabel(type)}</span>
      </div>
    </div>
  );
}

function buildTreeRows(
  root: DiffNode,
  collapsedMap: Record<string, boolean>,
  showUnchanged: boolean,
) {
  const rows: TreeRow[] = [];

  function visit(node: DiffNode, depth: number) {
    if (!showUnchanged && node.kind === "equal") {
      return;
    }

    const branch = node.children.length > 0;
    const collapsed = branch ? Boolean(collapsedMap[node.id]) : false;

    rows.push({
      id: node.id,
      node,
      depth,
      collapsed,
      branch,
    });

    if (branch && !collapsed) {
      node.children.forEach((child) => visit(child, depth + 1));
    }
  }

  visit(root, 0);

  return rows;
}

function createCollapsedState(root?: DiffNode) {
  if (!root) {
    return {};
  }

  const state: Record<string, boolean> = {};

  function visit(node: DiffNode) {
    if (node.children.length > 0) {
      state[node.id] = false;
      node.children.forEach(visit);
    }
  }

  visit(root);

  return state;
}

function createUniformCollapsedState(root: DiffNode | undefined, collapsed: boolean) {
  if (!root) {
    return {};
  }

  const state: Record<string, boolean> = {};

  function visit(node: DiffNode) {
    if (node.children.length > 0) {
      state[node.id] = collapsed;
      node.children.forEach(visit);
    }
  }

  visit(root);

  return state;
}

function treeCellTone(kind: DiffKind, side: "left" | "right", type: JsonType | "missing") {
  if (type === "missing") {
    return "tree-cell-missing";
  }

  if (kind === "added") {
    return side === "right" ? "tree-cell-add" : "tree-cell-muted";
  }

  if (kind === "removed") {
    return side === "left" ? "tree-cell-remove" : "tree-cell-muted";
  }

  if (kind === "changed") {
    return side === "left" ? "tree-cell-remove" : "tree-cell-add";
  }

  if (kind === "nested") {
    return "tree-cell-branch";
  }

  return "tree-cell-equal";
}

function formatNodeLabel(node: DiffNode) {
  if (node.path === "$") {
    return "root";
  }

  if (typeof node.key === "number") {
    return `[${node.key}]`;
  }

  if (node.key === null) {
    return "root";
  }

  return node.key;
}

function formatValuePreview(value: JsonValue | undefined, type: JsonType | "missing") {
  if (type === "missing") {
    return "missing";
  }

  if (type === "object") {
    return `Object {${Object.keys(value as Record<string, JsonValue>).length}}`;
  }

  if (type === "array") {
    return `Array [${(value as JsonValue[]).length}]`;
  }

  const serialized = JSON.stringify(value);

  if (!serialized) {
    return String(value);
  }

  return serialized.length > 48 ? `${serialized.slice(0, 45)}...` : serialized;
}

function typeLabel(type: JsonType | "missing") {
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

function statusClass(kind: DiffKind) {
  switch (kind) {
    case "added":
      return "status-added";
    case "removed":
      return "status-removed";
    case "changed":
      return "status-changed";
    case "nested":
      return "status-branch";
    default:
      return "status-equal";
  }
}

function statusText(kind: DiffKind) {
  switch (kind) {
    case "added":
      return "新增";
    case "removed":
      return "删除";
    case "changed":
      return "修改";
    case "nested":
      return "分支";
    default:
      return "一致";
  }
}

function parseJson(source: string): ParseResult {
  if (!source.trim()) {
    return {
      error: "内容为空",
    };
  }

  try {
    return {
      value: JSON.parse(source) as JsonValue,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "无法解析 JSON",
    };
  }
}

function compareJson(leftSource: string, rightSource: string): CompareResult {
  const leftParsed = parseJson(leftSource);
  const rightParsed = parseJson(rightSource);

  if (leftParsed.error || rightParsed.error) {
    return {
      leftError: leftParsed.error,
      rightError: rightParsed.error,
      diffLeafCount: 0,
      comparedAt: formatTimestamp(),
    };
  }

  const root = buildDiff(leftParsed.value as JsonValue, rightParsed.value as JsonValue);

  return {
    root,
    diffLeafCount: buildSections(root).length,
    stats: root.stats,
    comparedAt: formatTimestamp(),
  };
}

function countLines(value: string) {
  if (!value) {
    return 0;
  }

  return value.split("\n").length;
}

function formatTimestamp() {
  return new Date().toLocaleString("zh-CN", {
    hour12: false,
  });
}
