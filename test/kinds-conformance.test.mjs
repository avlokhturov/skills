#!/usr/bin/env node
/**
 * The kinds registry's conformance run (madarch-d3yt; the standalone
 * milestone's outcome 7). Three lanes join here:
 *
 * - Lane 1 (this repository, live today): the registry the set writes at
 *   setup is the writer's own bytes and reads under the set's own reader,
 *   a line reader that refuses the contract schema's shapes and the YAML
 *   features it can see; the contract's check is the word for what a full
 *   YAML reader would read beyond those lines.
 * - Lane 2 (the engine's contract, madarch-mr8i's landing): the contract's
 *   check command (`bun run contract:check`) runs over its own published
 *   conformance examples — the plain and registry products, the registry
 *   and document cases — and the same check reads the set's written
 *   example once more, through `--src`.
 *
 * The check's command is one variable, `PRODUCT_CONTRACT_CHECK`: the value
 * names the command the contract publishes, run from the engine's checkout
 * (`cd <engine checkout> && bun run contract:check`). This
 * repository carries no configuration of its own that would set it: the
 * wiring is one variable at the place this set's checks are run — a CI
 * runner passes MADARCH (the engine checkout that carries the contract) or
 * PRODUCT_CONTRACT_CHECK (the command) and the lane runs; nothing else
 * knows about it. Where no variable is set, the lane
 * skips with its own named reason: the skip is the gate's honest "the
 * engine's contract is not on this machine", never a pass. The wiring also
 * takes `MADARCH` — an engine checkout that carries the contract — as the
 * variable's derived form, so a CI runner passes the checkout once:
 * `MADARCH=<engine checkout> npm test` turns the lane on and every lane
 * green in one run.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SETUP = join(ROOT, "skills/backlog/setup-shady2k-skills");
const EXAMPLE_PRODUCT = join(SETUP, "fixtures/product/good");
const EXAMPLE = join(EXAMPLE_PRODUCT, "docs/kinds.yaml");
/** One path quoted for the shell: the single quotes a POSIX shell reads as literal text. */
function shellQuote(path) {
  return `'${path.replace(/'/g, `'\\''`)}'`;
}
const CONTRACT_CHECK = process.env.PRODUCT_CONTRACT_CHECK ??
  (process.env.MADARCH && existsSync(join(process.env.MADARCH, "scripts", "check-contract.ts"))
    ? `cd ${shellQuote(process.env.MADARCH)} && bun run contract:check`
    : undefined);
const SKIPPED = CONTRACT_CHECK
  ? undefined
  : "the product-repository contract's check command is not named on this machine: the contract lane (madarch-mr8i's landing) publishes `bun run contract:check` beside its schemas and examples, and the conformance run sets PRODUCT_CONTRACT_CHECK to it — or passes MADARCH, the engine checkout that carries the contract, and the lane derives the same. Until either is set, this lane skips; it never passes a registry it did not check.";

test("the example the set publishes is the kinds the writer renders, verified by the set's own reader", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--selftest"], { encoding: "utf8" });
  assert.equal(run.status, 0, `the registry writer's selftest failed:\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /verifies under the set's reader/);
});

test("the example product verifies as a whole with --check", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--check", "--root", EXAMPLE_PRODUCT], { encoding: "utf8" });
  assert.equal(run.status, 0, `the example product's registry does not verify:\n${run.stdout}${run.stderr}`);
});

test("the contract's check reads its own schema and conformance examples", { skip: SKIPPED }, () => {
  // The contract's own walk: the layout's example products, the registry
  // refusal cases and the document cases, exit 0 when every case reads as
  // its words say.
  const run = spawnSync("sh", ["-c", CONTRACT_CHECK], { encoding: "utf8" });
  assert.equal(run.status, 0, `the contract check did not conform (exit ${run.status}):\n${run.stdout}${run.stderr}`);
});

test("the contract's check reads the registry the set's writer rendered, too", { skip: SKIPPED }, () => {
  // `--src` checks one registry file against the contract's schema; what it
  // names is the set's published example, the writer's own bytes. The
  // call's own exit status is the gate's: 0 conforms, anything else is a
  // red conformance run with the check's printed words.
  assert.ok(existsSync(EXAMPLE), `the fixture registry ${EXAMPLE} stands nowhere`);
  // The registry's path rides as the shell call's positional argument, not
  // interpolated into the command's words, so a path with anything the
  // shell would read reaches the check as itself.
  const run = spawnSync("sh", ["-c", `${CONTRACT_CHECK} --src "$1"`, "sh", EXAMPLE], { encoding: "utf8" });
  assert.equal(run.status, 0, `the contract check refused the written example (exit ${run.status}):\n${run.stdout}${run.stderr}`);
});
