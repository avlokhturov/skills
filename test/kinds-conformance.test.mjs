#!/usr/bin/env node
/**
 * The kinds registry's conformance run. What a run proves live, with
 * nothing but this repository:
 *
 *   - the registry the set writes at setup is the writer's own bytes, and
 *     it reads under the set's own reader — the line reader that refuses
 *     the shapes and the YAML features it cannot read;
 *   - the written registry validates against the set's own copy of the
 *     product-repository contract's published schema, at the contract
 *     version the set targets, by the set's own validator: no repository
 *     depends on another, so nothing here checks out or runs another
 *     repository (the owner's refinement, 2026-10-12);
 *   - the validator refuses what the schema refuses, by its own words,
 *     and the refusal battery names each case: a version the set does not
 *     carry, a field no kind knows, a list emptied where the schema reads
 *     one.
 *
 * The set's own copies stand at test/schemas/product-registry.schema.json
 * and test/schemas/registry-cases.json, pinned byte for byte to the
 * published words of contract version 1; moving either is a deliberate
 * change on each side.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SETUP = join(ROOT, "skills/backlog/setup-shady2k-skills");
const SCHEMA_COPY = join(ROOT, "test/schemas/product-registry.schema.json");

test("the example the set publishes is the kinds the writer renders, verified by the set's own reader", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--selftest"], { encoding: "utf8" });
  assert.equal(run.status, 0, `the registry writer's selftest failed:\n${run.stdout}${run.stderr}`);
  assert.match(run.stdout, /verifies under the set's reader/);
});

test("the example product verifies as a whole with --check", () => {
  const run = spawnSync(process.execPath, [join(SETUP, "kinds-registry.mjs"), "--check", "--root", join(SETUP, "fixtures/product/good")], { encoding: "utf8" });
  assert.equal(run.status, 0, `the example product's registry does not verify:\n${run.stdout}${run.stderr}`);
});

// ---- the set's own validator, over the set's own schema copy --------------

/** The keywords the validator reads. Anything else the copy carries is a
 *  refusal of the copy itself: the standalone-registry-0021 code names what
 *  it reads, and the copy moves beside it, never ahead of it. */
const READ = new Set([
  "type", "properties", "required", "additionalProperties", "items", "pattern",
  "const", "anyOf", "minItems", "minLength",
  // The sketch's own words, read as words, not as rules.
  "$schema", "$id", "title", "description",
]);

const SCHEMA = JSON.parse(readFileSync(SCHEMA_COPY, "utf8"));

function walkSchema(node, at, failures) {
  if (Array.isArray(node)) {
    for (const [i, item] of node.entries()) walkSchema(item, `${at}[${i}]`, failures);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (!READ.has(key)) {
        failures.push(`${at} carries "${key}": the validator reads ${[...READ].sort().join(", ")}`);
        continue;
      }
      // The keywords whose values are schemas of their own keep the walk
      // inside them; every other keyword's words are words.
      if (key === "properties") {
        if (value && typeof value === "object") for (const [k, sub] of Object.entries(value)) walkSchema(sub, `${at}.properties.${k}`, failures);
        else if (value !== undefined) failures.push(`${at}.properties holds no map of schemas`);
      } else if (key === "anyOf") {
        if (Array.isArray(value)) for (const [i, sub] of value.entries()) walkSchema(sub, `${at}.anyOf[${i}]`, failures);
        else failures.push(`${at}.anyOf holds no list of schemas`);
      } else if (typeof value === "object" && key === "items" && value !== null && !Array.isArray(value)) {
        walkSchema(value, `${at}.items`, failures);
      }
    }
  }
}

/** One validation: the findings the instance gathers against the schema,
 *  each naming the place it stands at. */
function validate(node, schema, at, findings) {
  if (schema.anyOf) {
    for (const branch of schema.anyOf) {
      const probe = [];
      validate(node, branch, at, probe);
      if (probe.length === 0) return;
    }
    findings.push(`${at} reads ${JSON.stringify(node)}: none of the alternatives the schema reads holds`);
    return;
  }
  const type = schema.type;
  if (type === "object") {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
      findings.push(`${at}: an object is read here, and this is not one`);
      return;
    }
    for (const key of schema.required ?? [])
      if (!(key in node)) findings.push(`${at} carries no "${key}": the schema requires it`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(node))
        if (!schema.properties || !(key in schema.properties))
          findings.push(`${at} carries "${key}": the object reads exactly the properties it names, so a field nobody knows is refused`);
    }
    if (schema.properties)
      for (const [key, value] of Object.entries(node))
        if (key in schema.properties) validate(value, schema.properties[key], `${at}.${key}`, findings);
    return;
  }
  if (type === "array") {
    if (!Array.isArray(node)) {
      findings.push(`${at}: a list is read here, and this is not one`);
      return;
    }
    if (schema.minItems !== undefined && node.length < schema.minItems)
      findings.push(`${at} carries ${node.length} entries: the schema reads ${schema.minItems} or more`);
    if (schema.items)
      for (const [i, item] of node.entries()) validate(item, schema.items, `${at}[${i}]`, findings);
    return;
  }
  if (type === "string") {
    if (typeof node !== "string") {
      findings.push(`${at}: a word is read here, and this is not one`);
      return;
    }
    if (schema.const !== undefined && node !== schema.const)
      findings.push(`${at} reads ${JSON.stringify(node)}: the value read here is ${JSON.stringify(schema.const)}`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(node))
      findings.push(`${at} reads ${JSON.stringify(node)}: the shape it must match is ${schema.pattern}`);
    if (schema.minLength !== undefined && node.length < schema.minLength)
      findings.push(`${at} holds ${node.length} letters, and ${schema.minLength} are read at least`);
    return;
  }
  if (type === "number" || type === "boolean") {
    if (typeof node !== type) {
      findings.push(`${at}: ${type === "number" ? "a number" : "true or false"} is read here, and this is not one`);
      return;
    }
    if (schema.const !== undefined && node !== schema.const)
      findings.push(`${at} reads ${JSON.stringify(node)}: the value read here is ${JSON.stringify(schema.const)}`);
    return;
  }
  findings.push(`${at}: the schema reads nothing the validator can say here`);
}

const reading = () => {
  const failures = [];
  walkSchema(SCHEMA, "the schema copy", failures);
  return failures;
};

test("the set's copy of the schema is the published version 1, named, and read whole by the validator", () => {
  const failures = reading();
  assert.deepEqual([], failures, `the schema copy carries a form the validator does not read:\n${failures.join("\n")}`);
  assert.equal(SCHEMA.properties.contract.const, 1);
  assert.match(String(SCHEMA.$id ?? ""), /schema\/v1\/product-registry\.schema\.json$/);
});

test("the registry the writer renders validates against the set's own copy of the published schema", async () => {
  const writer = await import("file://" + join(SETUP, "kinds-registry.mjs"));
  const written = writer.registryJson();
  // The bytes the writer renders are the example the set publishes: one
  // source, read two ways.
  assert.equal(readFileSync(join(SETUP, "fixtures/product/good/docs/kinds.yaml"), "utf8"), writer.renderRegistry());
  const findings = [];
  validate(written, SCHEMA, "the registry", findings);
  assert.deepEqual([], findings, `the written registry does not conform:\n${findings.join("\n")}`);
});

test("the validator refuses what the schema refuses, by its own words", async () => {
  const writer = await import("file://" + join(SETUP, "kinds-registry.mjs"));
  const written = writer.registryJson();
  const refuse = (words, mutate) => {
    const mutant = structuredClone(written);
    mutate(mutant);
    const findings = [];
    validate(mutant, SCHEMA, "the registry", findings);
    assert.ok(findings.length > 0, `${words}: nothing was refused`);
    assert.ok(findings.some((f) => f.includes(words)), `${words}: the refusal names it:\n${findings.join("\n")}`);
  };
  // The battery walks the constraint range the schema reads: a value the
  // const refuses, a field nobody knows, an emptied list, a missing
  // required field, a shape a pattern refuses, anyOf's alternatives, a
  // type the word is not, and a word the minimum length cuts short.
  refuse("contract", (m) => { m.contract = 2; });
  refuse("heroKind", (m) => { m.kinds[0].heroKind = true; });
  refuse("a list is read here", (m) => { m.kinds[17].statuses = "draft"; });
  refuse("targets", (m) => { delete m.kinds[4].links[0].targets; });
  refuse("9bad", (m) => { m.stages.push({ id: "9bad" }); });
  refuse("often", (m) => { m.kinds[4].links[0].cardinality = "often"; });
  refuse("field", (m) => { delete m.kinds[4].links[0].field; });
  refuse("a word is read here", (m) => { m.kinds[17].statuses[0] = 5; });
  refuse("true or false is read here", (m) => { m.kinds[4].links[0].required = "true"; });
  refuse("letters", (m) => { m.kinds[4].hint = ""; });
  refuse("the shape it must match is", (m) => { m.kinds[17].statuses[0] = "9bad"; });
  refuse("name", (m) => { m.kinds[4].name = "9bad"; });
  // The contract's own refusal at v1: the evidence shape rides the fact
  // storage form (the schema reads storage; the check carries the rule).
  refuse("storage", (m) => { m.kinds[4].storage = "not-a-form"; });
});

test("every link field reads back as written, the one after the targets list included", async () => {
  const writer = await import("file://" + join(SETUP, "kinds-registry.mjs"));
  const read = writer.parseKinds(writer.renderRegistry(), "docs/kinds.yaml");
  assert.ok(read.ok, read.message);
  const written = writer.registryJson().kinds.filter((kind) => kind.links);
  const back = read.value.kinds.filter((kind) => kind.links);
  for (const [k, kind] of written.entries())
    for (const [l, link] of kind.links.entries())
      for (const key of Object.keys(link))
        assert.ok(back[k].links[l][key] !== undefined, `${kind.name}'s link "${link.field}" loses its ${key} on reading`);
  const afterTargets = (field) => [
    "contract: 1", "stages:", "  - id: idea", "kinds:", "  - name: Source", "    prefix: SRC",
    "    folder: docs/sources", "    stage: idea", "    hint: one", "    links:", "      - field: Grew from",
    "        targets:", "          - Source", `        ${field}`, "",
  ].join("\n");
  for (const field of ["cardinality: some", "required: yes", "backlink: 9bad", "colour: red"]) {
    const refused = writer.parseKinds(afterTargets(field), "docs/kinds.yaml");
    assert.equal(refused.ok, false, `"${field}" right after the targets list is read past, not refused`);
    assert.match(refused.message, /^docs\/kinds\.yaml:14: /);
  }
});

// ---- the contract's own cases, over the set's reader ----------------------

/** A pinned byte copy of the published contract's registry cases (version 1),
 *  beside the schema copy. Moving it is a deliberate change, like the schema. */
const CASES = JSON.parse(readFileSync(join(ROOT, "test/schemas/registry-cases.json"), "utf8")).cases;

/** The set's own policy on top of the contract: every kind the set owns is
 *  carried, each at the set's stage. A finding of these classes is the set's
 *  rule, not a reading of the contract, and is set aside for every case. */
const SET_POLICY = [/ stands in no kind of the registry /, / kind is filed under \S+: its stage is /];

/** Where the set's reader says the same refusal on another line, or refuses
 *  by its own policy what the contract reads. Each is named and must still
 *  hold: an exception that no longer differs fails the run. */
const EXCEPTIONS = {
  "no-stages": { line: 2, why: "the line reader names the line that stands where stages: belongs; the contract's check names the mapping at line 1" },
  "parse-error": { line: 4, why: "the line reader names the line with the unclosed flow; the YAML parser names the end of the text" },
  "statuses-with-links-read": { policy: true, why: "the set files the Use case kind under requirements, and the case files it under design" },
  "a-kind-may-name-its-document-storage": { policy: true, why: "the set files the User story kind under requirements, and the case files it under idea" },
};

test("the set's reader judges the contract's own cases as the contract does, its named exceptions aside", async () => {
  const writer = await import("file://" + join(SETUP, "kinds-registry.mjs"));
  assert.ok(CASES.length > 0, "the cases copy holds no case");
  const wrong = [];
  for (const c of CASES) {
    const read = writer.verifyRegistry(c.text ?? "", "docs/kinds.yaml");
    const all = read.findings;
    const own = all.filter((f) => !SET_POLICY.some((rule) => rule.test(f)));
    const refuses = "message" in c;
    const exception = EXCEPTIONS[c.name];
    if (exception?.policy) {
      if (refuses || own.length || !all.length)
        wrong.push(`${c.name}: named as refused by the set's policy, and it is not so (${all[0] ?? "it verified"})`);
      continue;
    }
    if (!refuses) {
      if (own.length) wrong.push(`${c.name}: the contract reads it, and the set refuses it: ${own[0]}`);
      continue;
    }
    if (!own.length) { wrong.push(`${c.name}: the contract refuses it at line ${c.line}, and the set reads it`); continue; }
    if (c.line === undefined) continue;
    const at = exception?.line ?? c.line;
    if (!own.some((f) => f.startsWith(`docs/kinds.yaml:${at}: `)))
      wrong.push(`${c.name}: refused at line ${at} is expected, and the set says ${own[0]}`);
    else if (exception && own.some((f) => f.startsWith(`docs/kinds.yaml:${c.line}: `)))
      wrong.push(`${c.name}: the named exception no longer differs — the set refuses at line ${c.line} as the contract does; drop the exception`);
  }
  for (const name of Object.keys(EXCEPTIONS))
    if (!CASES.some((c) => c.name === name)) wrong.push(`${name}: a named exception for a case the copy does not carry`);
  assert.deepEqual(wrong, []);
});
