import test from "node:test";
import assert from "node:assert/strict";
import { buildDiff, buildSections, countChanges } from "../src/diff.ts";

test("buildDiff returns visible stats and sections for changed JSON", () => {
  const left = {
    service: "jsondiff",
    version: 1,
    theme: {
      accent: "cyan",
    },
    owners: ["anna", "li"],
  };

  const right = {
    service: "jsondiff",
    version: 2,
    theme: {
      accent: "emerald",
      dense: true,
    },
    owners: ["anna", "zhao", "li"],
  };

  const root = buildDiff(left, right);
  const sections = buildSections(root);

  assert.equal(countChanges(root.stats), 5);
  assert.equal(root.stats.changed, 3);
  assert.equal(root.stats.added, 2);
  assert.equal(root.stats.removed, 0);
  assert.ok(sections.length > 0);
  assert.deepEqual(
    sections.map((section) => section.path),
    ["$.version", "$.theme.accent", "$.theme.dense", "$.owners[1]", "$.owners[2]"],
  );
});

test("buildDiff reports no sections for equal JSON", () => {
  const left = {
    name: "same",
    meta: {
      enabled: true,
    },
  };

  const root = buildDiff(left, left);
  const sections = buildSections(root);

  assert.equal(countChanges(root.stats), 0);
  assert.equal(sections.length, 0);
  assert.equal(root.stats.unchanged, 2);
});

test("buildDiff expands added object branches into collapsible children", () => {
  const left = {
    service: "jsondiff",
  };

  const right = {
    service: "jsondiff",
    pipeline: {
      enabled: true,
      targets: ["prod", "staging"],
    },
  };

  const root = buildDiff(left, right);
  const pipelineNode = root.children.find((node) => node.path === "$.pipeline");

  assert.ok(pipelineNode);
  assert.equal(pipelineNode.kind, "added");
  assert.ok(pipelineNode.children.length > 0);
  assert.deepEqual(
    pipelineNode.children.map((child) => child.path),
    ["$.pipeline.enabled", "$.pipeline.targets"],
  );
});

test("buildDiff expands changed object to array branches into collapsible children", () => {
  const left = {
    config: {
      mode: "strict",
      retry: 2,
    },
  };

  const right = {
    config: [
      "strict",
      {
        retry: 3,
      },
    ],
  };

  const root = buildDiff(left, right);
  const configNode = root.children.find((node) => node.path === "$.config");

  assert.ok(configNode);
  assert.equal(configNode.kind, "changed");
  assert.equal(configNode.leftType, "object");
  assert.equal(configNode.rightType, "array");
  assert.ok(configNode.children.length > 0);
  assert.deepEqual(
    configNode.children.map((child) => child.path),
    ["$.config.mode", "$.config.retry", "$.config[0]", "$.config[1]"],
  );
});
