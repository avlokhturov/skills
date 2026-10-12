#!/usr/bin/env node
/**
 * The kinds registry's conformance run. What a run proves live, with
 * nothing but this repository: the registry the set writes at setup is the
 * writer's own bytes, and it reads under the set's own reader — the line
 * reader that refuses the shapes and the YAML features the contract's
 * schema refuses and this reader can see.
 *
 * The schema-conformance lane — the registry the set writes, checked
 * against the product-repository contract's published schema — runs with
 * the set's own code against the set's own copy of the schema, at the
 * contract version the set targets (the owner's refinement, 2026-10-12:
 * no repository depends on another, so nothing here is checked out or run
 * from another repository). While the copy is not on this branch the lane
 * is absent, and that absence is the state this file states. It returns
 * with the copy, the same commit that carries it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SETUP = join(ROOT, "skills/backlog/setup-shady2k-skills");

test("the example the set publishes is the kinds the writer renders, verified by the set's own reader", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--selftest"], { encoding: "utf8" });
  assert.equal(run.status, 0, `the registry writer's selftest failed:\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /verifies under the set's reader/);
});

test("the example product verifies as a whole with --check", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--check", "--root", join(SETUP, "fixtures/product/good")], { encoding: "utf8" });
  assert.equal(run.status, 0, `the example product's registry does not verify:\n${run.stdout}${run.stderr}`);
});
