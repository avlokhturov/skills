#!/usr/bin/env node
/**
 * The kinds registry's conformance run (madarch-d3yt; the standalone
 * milestone's outcome 7). Two lanes join here:
 *
 * - Lane 1 (this repository, live today): the registry the set writes at
 *   setup is the writer's own bytes and reads under the set's own reader —
 *   every kind the set owns carries its stage and a next-step hint, the
 *   example product fixture holds the published example.
 * - Lane 2 (the engine's contract, madarch-mr8i's landing): the contract's
 *   check command (`contract:check` or the name it lands under) checks the
 *   same written example against the contract's schema and conformance
 *   examples, so a registry that drifts out of the contract is a red CI in
 *   the set too.
 *
 * Lane 2's call is one variable, `PRODUCT_CONTRACT_CHECK`: the contract
 * check's command as the contract's landing names it. Until that landing the
 * variable is unset and the lane skips with its own named reason — the skip
 * is the gate's honest "not yet", never a pass. When the contract lands, its
 * landing sets the variable in this repository's CI (the value names the
 * command as the contract publishes it) and the lane starts refusing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SETUP = join(ROOT, "skills/backlog/setup-shady2k-skills");
const EXAMPLE_PRODUCT = join(SETUP, "fixtures/product/good");
const EXAMPLE = join(EXAMPLE_PRODUCT, "kinds.yaml");
const CONTRACT_CHECK = process.env.PRODUCT_CONTRACT_CHECK;

const SKIPPED = CONTRACT_CHECK
  ? undefined
  : "the product-repository contract's schema and check command are not landed yet (madarch's outcome 1, row madarch-mr8i): where the contract lands, its landing sets PRODUCT_CONTRACT_CHECK to the check command the contract publishes, and this lane checks the written example against the schema and the conformance examples — until then the set's own reader (kinds-registry.mjs) is what keeps the example in step";

test("the example the set publishes is the kinds the writer renders, verified by the set's own reader", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--selftest"], { encoding: "utf8" });
  assert.equal(run.status, 0, `the registry writer's selftest failed:\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /verifies under the set's reader/);
});

test("the example product verifies as a whole with --check", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--check", "--root", EXAMPLE_PRODUCT], { encoding: "utf8" });
  assert.equal(run.status, 0, `the example product's registry does not verify:\n${run.stdout}${run.stderr}`);
});

test("the written example reads against the contract's schema and examples, once the contract's check command is named", { skip: SKIPPED }, () => {
  // The contract check reads a product folder; the written example is the
  // set's example product, which is itself a product folder the check can
  // read. The call's own exit status is the gate's: 0 conforms, anything
  // else is a red conformance run with the check's printed words.
  const run = spawnSync("sh", ["-c", `${CONTRACT_CHECK} ${JSON.stringify(EXAMPLE_PRODUCT)}`], { encoding: "utf8" });
  assert.equal(
    run.status, 0,
    `the contract check refused the written example (exit ${run.status}):\n${run.stdout}${run.stderr}`
  );
});
