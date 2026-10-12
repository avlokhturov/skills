#!/usr/bin/env node
/**
 * The kinds registry — the set's map of the document kinds it owns, written
 * into a product repository as the product's own `kinds.yaml`.
 *
 * Decision 0021 (the engine repository's product-repository record) makes
 * the kinds data a product holds: the wiki groups its pages by kind and
 * stage and reads the "what to do next" hints from this file alone, so one
 * change of the set's vocabulary is a data change here, never a change in
 * the engine's code. Per kind the registry carries the contract's own
 * fields — `name` (the kind's word for a reader), `prefix` (its documents'
 * id prefix, empty for a kind whose place, not an id, is its identity),
 * `folder` (where its documents are written), `stage` (the stage of the
 * set's life cycle it belongs to) and `hint` (the next step for a person
 * mid-stage, in the set's own wording). The stages are the set's life
 * cycle, in its own order, with no fixed kinds: verify, release and operate
 * keep their records where the set records them, so they hold none of
 * these pages.
 *
 * A product may rename the kinds or retune their hints in its own language;
 * the prefixes, folders and stages are the set's forms. Kind fields are
 * only ever added beside these, so a registry from a later version still
 * opens: fields nobody knows are carried, not refused. Setup never resets a
 * registry that stands — it verifies it and reports, and writes one only
 * where the product holds none.
 *
 * The published example is the kind table rendered into the set's own
 * example product: `fixtures/product/good/kinds.yaml`. When the contract's
 * schema and check command land in the engine repository (the contract's
 * lane), the set's conformance run (`test/kinds-conformance.test.mjs`)
 * checks that example against them; until that landing the set's own
 * reader is what keeps the example in step, and the conformance run skips
 * with that named.
 *
 *   node kinds-registry.mjs [--root <product folder>] [--check] [--json]
 *   node kinds-registry.mjs --selftest
 *
 * EXIT CODES. 0: the registry stands — written now, or verified as it was.
 * 1: a registry there cannot be read, is out of shape, or has lost a kind
 * or prefix the set owns — each finding names the file and the line. 2:
 * misuse, or a product folder that cannot be used.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REGISTRY_FILE = "kinds.yaml";
/** The set's life cycle, in its own order: the stages hold no fixed kinds — every kind names its own. */
export const STAGES = ["idea", "requirements", "design", "build", "verify", "release", "operate"];

/** The kinds the set owns, in the order a reader meets them: the side rail from the vision to the practices. */
export const KINDS = [
  { name: "Vision", prefix: "VISION", folder: "docs/vision.md", stage: "idea", hint: "the product's direction; when it stands, the beliefs behind it are written as hypotheses and what people said is kept as sources" },
  { name: "Roadmap", prefix: "", folder: "docs/roadmap.md", stage: "idea", hint: "what is near and what is far, and why in that order; the current milestone's charter narrows it" },
  { name: "Milestone", prefix: "", folder: "docs/milestones/", stage: "idea", hint: "the charter of one version — outcomes, observable criteria, exclusions and a budget — agreed with the owner before its work runs" },
  { name: "Source", prefix: "S", folder: "docs/sources/", stage: "idea", hint: "what people actually said, kept with consent; the product's documents quote it by place" },
  { name: "Hypothesis", prefix: "H", folder: "docs/hypotheses/", stage: "idea", hint: "a belief worth testing — its test, its metric, its threshold; the result is read onto the record when the test comes due" },
  { name: "Open question", prefix: "Q", folder: "docs/questions/", stage: "idea", hint: "what is not known, with who can answer and what settles it; an answer, or a not-applicable with a reason, closes it" },
  { name: "Prototype", prefix: "P", folder: "docs/prototypes/", stage: "idea", hint: "code that tests one hypothesis and is thrown away once its results are kept" },
  { name: "Result", prefix: "R", folder: "docs/results/", stage: "idea", hint: "what was observed against the threshold — confirmed, refuted or unclear, and why" },
  { name: "User story", prefix: "US", folder: "docs/stories/", stage: "requirements", hint: "one slice of value for one role; it accepts through the use cases and requirements that grew from it" },
  { name: "Use case", prefix: "UC", folder: "docs/use-cases/", stage: "requirements", hint: "one goal with its main success scenario; the product requirements it serves are written from it" },
  { name: "Product requirement", prefix: "FR", folder: "docs/requirements/", stage: "requirements", hint: "one thing a user can observe; the capability specs reference it by id, never restate it" },
  { name: "Decision", prefix: "", folder: "docs/decisions/", stage: "design", hint: "a consequential, hard-to-reverse choice with its reason kept where a reader needs it" },
  { name: "Design record", prefix: "", folder: "docs/changes/", stage: "design", hint: "one change's design — drivers, options traded, the recorded decision — written before code" },
  { name: "Architecture", prefix: "", folder: "docs/system/architecture.md", stage: "design", hint: "how the system does it — the parts, their zones and the boundaries, kept with the code's shape" },
  { name: "Capability", prefix: "", folder: "docs/system/capabilities/", stage: "design", hint: "the unit the accepted behaviour is kept by — its EARS requirements and Given/When/Then scenarios" },
  { name: "Change record", prefix: "", folder: "docs/changes/", stage: "build", hint: "one feature's proposal against the current specs; acceptance merges it into the capabilities it touches" },
  { name: "Exploration", prefix: "", folder: "docs/explorations/", stage: "idea", hint: "questions and observations kept where retention is asked for; it commits to nothing" },
  { name: "Practice", prefix: "PRA", folder: "docs/practices/", stage: "operate", hint: "a class of error answered once as a rule; learned as the work went on, retired with its reason" },
];

/** The fields each kind carries, as the contract names them. */
const FIELDS = ["name", "prefix", "folder", "stage", "hint"];
const FIELD_WORDS = {
  name: "the word the wiki shows for the kind",
  prefix: 'the kind\'s id prefix ("" where the documents name themselves by place)',
  folder: "the folder or file the kind is written at",
  stage: "the stage of the registry's life cycle the kind belongs to",
  hint: "what a person mid-stage does next with the kind",
};


/** The registry rendered: the only bytes the writer writes. */
export function renderRegistry() {
  const lines = [
    "# The kinds this product keeps. Written at setup from the set's kind",
    "# table (the product-documents reference); the wiki reads this file alone",
    "# for its groups, its kind words and its next-step hints, so one change",
    "# of the set's vocabulary belongs here as data, never as engine code. A",
    "# product may rename the kinds or retune the hints in its own language;",
    "# the prefixes, folders and stages are the set's forms. Kind fields are",
    "# only ever added beside these: name, prefix, folder, stage, hint. The",
    "# stages are the set's life cycle; verify, release and operate keep",
    "# their records outside the kinds.",
    "",
    "schemaVersion: 1",
    "stages:",
    ...STAGES.map((stage) => `  - ${stage}`),
    "kinds:",
  ];
  for (const kind of KINDS) {
    lines.push("  - name: " + kind.name);
    lines.push(`    prefix: "${kind.prefix}"`);
    lines.push("    folder: " + kind.folder);
    lines.push("    stage: " + kind.stage);
    lines.push("    hint: " + kind.hint);
  }
  return lines.join("\n") + "\n";
}

/** A scalar read from one line: its quoted or bare self, and the line it stood on. */
function scalar(raw, line) {
  const quoted = /^"([^"]*)"$/.exec(raw) ?? /^'([^']*)'$/.exec(raw);
  return { value: quoted ? quoted[1] : raw, line };
}

/** The line the registry's `kinds:` list begins on, for a finding that names the product's kinds when no kind stands to name. */
function firstKindLine(value) {
  for (const kind of value.kinds) for (const key of FIELDS) if (kind[key]) return kind[key].line;
  return 1;
}

const fail = (file, line, message) => ({ ok: false, line, message: `${file}:${line}: ${message}` });

/**
 * A registry text, read as the shape the example holds. Value carries
 * `schemaVersion` (a scalar), `stages` (a list of scalars) and `kinds` (a
 * list of maps, whose field values carry the line they were read on), or the
 * first refusal ({ ok: false, line, message }), already `file:`-prefixed.
 * Fields added beside the known ones are carried, not refused. A comment
 * line (# ...) or a blank line stands nowhere but between the blocks.
 */
export function parseKinds(text, file) {
  const lines = text.split("\n");
  const code = (l) => l.replace(/(^|\s)#.*$/, "").trimEnd();
  const trim = (l) => code(l).trim();
  const skip = (i) => {
    while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    return i;
  };
  let i = skip(0);
  if (i >= lines.length) return fail(file, Math.max(lines.length, 1), "the registry is empty: it carries schemaVersion, stages and kinds");

  // schemaVersion, a scalar on its own line.
  const head = code(lines[i]).trimStart();
  const headPair = /^schemaVersion:\s*(.*)$/.exec(head);
  if (!headPair) return fail(file, i + 1, "the registry begins with something other than `schemaVersion:`");
  if (headPair[1].trim() === "") return fail(file, i + 1, "`schemaVersion:` holds no version");
  const schemaVersion = scalar(headPair[1].trim(), i + 1);
  i = skip(i + 1);

  // `stages:` and its list of scalars, each at the same leading spaces.
  if (i >= lines.length || !/^stages:\s*$/.test(trim(lines[i])))
    return fail(file, i < lines.length ? i + 1 : Math.max(lines.length, 1), "`schemaVersion` is not followed by `stages:` with the product's life cycle under it");
  const stagesLine = i + 1;
  i = skip(i + 1);
  if (i >= lines.length || !/^\s*-\s/.test(lines[i]))
    return fail(file, stagesLine, "`stages:` holds no list — each stage stands on its own line as `- <stage>`");
  const stages = [];
  while (i < lines.length && /^\s*-\s/.test(lines[i])) {
    const seen = lines[i];
    const stage = scalar(seen.trimStart().replace(/^-\s*/, "").trim(), i + 1);
    if (stage.value === "") return fail(file, i + 1, "a stage stands with no name on it");
    stages.push(stage);
    i = skip(i + 1);
  }

  // `kinds:` and its list of maps, one kind per item.
  if (i >= lines.length || !/^kinds:\s*$/.test(trim(lines[i])))
    return fail(file, i < lines.length ? i + 1 : Math.max(lines.length, 1), "the stages list is not followed by `kinds:` with the product's kinds under it");
  const kindsLine = i + 1;
  i = skip(i + 1);
  if (i >= lines.length || !/^\s*-\s/.test(lines[i]))
    return fail(file, kindsLine, "`kinds:` holds no kinds — each stands as a `- name: <name>` item with the kind's fields under it");
  const kinds = [];
  while (i < lines.length && /^\s*-\s/.test(lines[i])) {
    const lead = lines[i].match(/^(\s*)-/)[1].length;
    const map = Object.create(null);
    const first = lines[i].trimStart().replace(/^-\s*/, "").trimStart();
    const fields = [];
    if (first !== "") fields.push({ word: first, line: i + 1 });
    i++;
    while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    while (i < lines.length && /^\s+\S/.test(lines[i]) && lines[i].length - lines[i].trimStart().length > lead) {
      if (!/^([a-zA-Z-]+):/.test(lines[i].trimStart()))
        return fail(file, i + 1, `under a kind stands a line that is no kind field name and value — a kind carries ${FIELDS.join(", ")}, and a field added beside them is carried, not refused`);
      fields.push({ word: lines[i].trimStart(), line: i + 1 });
      i++;
      while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    }
    if (!fields.length) return fail(file, i < lines.length ? i + 1 : Math.max(lines.length, 1), "an item of `kinds:` carries no fields — a kind stands as `- name: <name>` with its fields under it");
    for (const field of fields) {
      const pair = /^([a-zA-Z-]+):\s*(.*)$/.exec(field.word);
      const key = pair ? pair[1] : "";
      if (!key) return fail(file, field.line, `a kind field has no \`name:\` on it — a kind carries ${FIELDS.join(", ")}`);
      if (key in map) return fail(file, field.line, `the kind carries "${key}" on it twice — each field is given once`);
      map[key] = scalar(pair[2], field.line);
      if (key !== "prefix" && map[key].value === "")
        return fail(file, field.line, `the kind's "${key}" holds no value — ${FIELD_WORDS[key]}`);
    }
    kinds.push(map);
  }
  if (i < lines.length && trim(lines[i]) !== "")
    return fail(file, i + 1, "the registry holds a line outside schemaVersion, stages and kinds");
  return { ok: true, value: { schemaVersion, stages, kinds } };
}

/** The line a kind stands on, for a finding that names one kind when no field of it is known. */
function anchorOf(kind, kindsLine) {
  for (const key of FIELDS) if (kind[key]) return kind[key].line;
  return kindsLine;
}

/**
 * The registry with the set's rules applied: { ok, findings, notes, value }.
 * A finding names the file and the line with what is wrong. A note reports a
 * choice the registry may legitimately make. Nothing is silently absent: a
 * kind the set owns that no kind of the registry carries any more — by
 * prefix, name or folder — is a finding, because the wiki's groups and
 * next-step hints lose the set's chain without anything saying so.
 */
export function verifyRegistry(text, file) {
  const read = parseKinds(text, file);
  if (!read.ok) return { ok: false, findings: [read.message], notes: [] };
  const value = read.value;
  const findings = [];
  const notes = [];
  const out = (line, message) => `${file}:${line}: ${message}`;

  if (value.schemaVersion.value !== "1")
    findings.push(out(value.schemaVersion.line, `schemaVersion reads "${value.schemaVersion.value}": this reader reads the contract's version 1, as the manifest reads`));
  if (value.stages.length !== STAGES.length || value.stages.some((seen, x) => seen.value !== STAGES[x]))
    notes.push(out(value.stages[0].line, `the registry's stages read ${value.stages.map((s) => s.value).join(", ")}: the set's life cycle is ${STAGES.join(", ")} — a renamed stage is this product's choice, and the kinds it renamed still live on the words they name`));

  const stageNames = new Set(value.stages.map((s) => s.value));
  const seenPrefix = new Map();
  for (const kind of value.kinds) {
    for (const field of FIELDS)
      if (!kind[field]) findings.push(out(anchorOf(kind, firstKindLine(value)), `a kind carries no "${field}" — it is ${FIELD_WORDS[field]}`));
    if (kind.stage?.value && !stageNames.has(kind.stage.value))
      findings.push(out(kind.stage.line, `the kind names stage "${kind.stage.value}", which the registry's own stages list does not hold`));
    if (kind.prefix?.value) {
      if (seenPrefix.has(kind.prefix.value))
        findings.push(out(kind.prefix.line, `the id prefix "${kind.prefix.value}" stands on another kind as well — each prefix names one kind`));
      seenPrefix.set(kind.prefix.value, kind);
      if (!/^[A-Z]([A-Z0-9-]*)$/.test(kind.prefix.value))
        findings.push(out(kind.prefix.line, `the id prefix reads "${kind.prefix.value}": a prefix is capitals and dashes, like the set's own`));
    }
  }

  // The kinds the set owns, carried by their prefix, name or folder.
  for (const owned of KINDS) {
    const here = value.kinds.find((kind) =>
      (owned.prefix !== "" && kind.prefix && kind.prefix.value === owned.prefix) ||
      (kind.name && kind.name.value === owned.name) ||
      (kind.folder && kind.folder.value === owned.folder));
    if (!here) {
      const proof = value.kinds.length ? anchorOf(value.kinds[0], firstKindLine(value)) : firstKindLine(value);
      findings.push(out(proof, `the set's ${owned.name} kind (${owned.prefix ? `its ids are ${owned.prefix}-…` : "its documents name themselves by place"}, written at ${owned.folder}) stands in no kind of the registry — the wiki loses the ${owned.stage} stage's word without it`));
    }
  }
  return findings.length ? { ok: false, findings, notes } : { ok: true, findings, notes, value };
}

/** Read one product root into { ok, root, path } or the exit-2 refusal's words. */
function productRoot({ root }) {
  if (!root) root = process.cwd();
  if (!existsSync(root) || !statSync(root).isDirectory())
    return { ok: false, message: `no folder at "${root}"` };
  if (!existsSync(join(root, "workspace.yaml")))
    return { ok: false, message: `"${root}" holds no workspace.yaml: kinds-registry.mjs writes a product's kinds registry, and a product is recognised by its manifest — run it at a product's root or with --root <product folder>` };
  return { ok: true, root, path: join(root, REGISTRY_FILE) };
}

/** The selftest: the example registry is the words the set renders, and verifies under the set's reader. */
export function selftest(dir) {
  const path = join(dir, REGISTRY_FILE);
  const findings = [];
  if (!existsSync(path)) {
    findings.push(`${path} stands nowhere: the published example is not there`);
    return { ok: false, findings, words: [] };
  }
  const kept = readFileSync(path, "utf8");
  if (kept !== renderRegistry())
    findings.push(`${path} differs from the set's rendered registry — the example the conformance run reads is the writer's own bytes; rerun the writer (node kinds-registry.mjs --root <a copy of the example product>) and commit what it changed, never a hand edit`);
  const verified = verifyRegistry(kept, REGISTRY_FILE);
  if (!verified.ok) findings.push(...verified.findings);
  return verified.ok ? { ok: true, findings, words: [`kinds registry: the example at ${path} is the writer's own bytes and verifies under the set's reader`] } : { ok: false, findings, words: [] };
}

/** One run of the tool. Returns its exit code. */
function main(args) {
  const json = args.includes("--json");
  const check = args.includes("--check");
  if (args.includes("--selftest")) {
    const dir = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "product", "good");
    const run = selftest(dir);
    for (const word of run.words) console.log(word);
    if (!run.ok) {
      for (const finding of run.findings) console.log(`FAIL  ${finding}`);
      return 1;
    }
    return 0;
  }
  let root;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json" || arg === "--check") continue;
    if (arg === "--root") {
      root = args[++i];
      if (root === undefined) {
        console.error("usage: node kinds-registry.mjs [--root <product folder>] [--check] [--json] | --selftest");
        return 2;
      }
      continue;
    }
    if (arg === "--selftest") continue;
    rest.push(arg);
  }
  if (rest.length) {
    console.error(`unexpected argument "${rest[0]}" — usage: node kinds-registry.mjs [--root <product folder>] [--check] [--json] | --selftest`);
    return 2;
  }
  const place = productRoot({ root });
  if (!place.ok) {
    if (json) console.log(JSON.stringify({ status: "misuse", message: place.message }));
    else console.error(place.message);
    return 2;
  }
  if (!existsSync(place.path)) {
    if (check) {
      const words = `${place.path} stands nowhere: the product keeps no kinds registry — nothing to verify`;
      if (json) console.log(JSON.stringify({ status: "missing", message: words }));
      else console.error(words);
      return 2;
    }
    writeFileSync(place.path, renderRegistry());
    const words = `wrote ${place.path}: the set's kinds, each with its stage and its next-step hint; the product may rename the kinds or retune the hints, and the wiki reads this file alone`;
    if (json) console.log(JSON.stringify({ status: "wrote", path: place.path }));
    else console.log(words);
    return 0;
  }
  const verified = verifyRegistry(readFileSync(place.path, "utf8"), REGISTRY_FILE);
  if (!verified.ok) {
    if (json) console.log(JSON.stringify({ status: "findings", findings: verified.findings }));
    else for (const finding of verified.findings) console.error(finding);
    return 1;
  }
  for (const note of verified.notes) console.log(note);
  const words = `${place.path} stands verified: ${verified.value.kinds.length} kinds, each with its stage and its next-step hint`;
  if (json) console.log(JSON.stringify({ status: "verified", path: place.path, notes: verified.notes }));
  else console.log(words);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
