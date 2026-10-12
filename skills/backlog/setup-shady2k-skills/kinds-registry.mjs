#!/usr/bin/env node
/**
 * The kinds registry — the set's map of the document kinds it owns, written
 * into a product repository at the product's `docs/kinds.yaml`, the place the
 * engine's landed contract reads it from (the contract lane: schema
 * schema/product-registry.schema.json, check `bun run contract:check`).
 *
 * Decision 0021 makes the kinds data a product holds: the wiki groups its
 * pages by kind and stage and reads the "what to do next" hints from this
 * file alone, so one change of the set's vocabulary is a data change here,
 * never a change in the engine's code. Per kind the registry carries the
 * contract's own fields — `name` (the kind's word for a reader), `prefix`
 * (its documents' id prefix, one to four capitals, unique among the kinds),
 * `folder` (where the kind's documents are written, a place under docs/),
 * `stage` (the stage of the set's life cycle it belongs to) and `hint` (the
 * next step for a person mid-stage, in the set's own wording). The stages
 * are the set's life cycle, in its own order, as `id:` entries, with no
 * fixed kinds: verify, release and operate keep their records where the set
 * records them, so they hold none of these pages.
 *
 * A product may rename the kinds or retune their hints in its own language;
 * the id prefix and the stage are the set's forms' words, and the folder is
 * the set's default: a chain document keeps its kind by its id wherever
 * under docs/ it stands, so a described repository's derived documents are
 * laid out beside the repository they describe. Fields nobody knows are
 * refused, the way the contract's schema refuses them — the set's reader
 * and the contract's check read the same refusals, so a registry this
 * reader reads is a registry the check passes. Setup never resets a
 * registry that stands — it verifies it and reports, and writes one only
 * where the product holds none.
 *
 * The published example is the kind table rendered into the set's own
 * example product: `fixtures/product/good/docs/kinds.yaml`. The contract's
 * schema and its refusal cases are the engine repository's to publish; the
 * set's conformance run (`test/kinds-conformance.test.mjs`) runs this
 * example through the contract's own check command, the one the contract's
 * landing names by the `PRODUCT_CONTRACT_CHECK` variable.
 *
 *   node kinds-registry.mjs [--root <product folder>] [--check] [--json]
 *   node kinds-registry.mjs --selftest
 *
 * EXIT CODES. 0: the registry stands — written now, or verified as it was.
 * 1: a registry there cannot be read, is out of shape, or has lost a kind
 * or prefix the set owns — each finding names the file and the line. 2:
 * misuse, or a product folder that cannot be used.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REGISTRY_FILE = "docs/kinds.yaml";

/** The set's life cycle, in its own order: the stages hold no fixed kinds — every kind names its own. */
export const STAGES = ["idea", "requirements", "design", "build", "verify", "release", "operate"];

/** The kinds the set owns, in the order a reader meets them: the side rail from the vision to the practices. */
export const KINDS = [
  { name: "Vision", prefix: "VIS", folder: "docs/vision.md", stage: "idea", hint: "the product's direction; when it stands, the beliefs behind it are written as hypotheses and what people said is kept as sources" },
  { name: "Roadmap", prefix: "ROA", folder: "docs/roadmap.md", stage: "idea", hint: "what is near and what is far, and why in that order; the current milestone's charter narrows it" },
  { name: "Milestone", prefix: "MIL", folder: "docs/milestones", stage: "idea", hint: "the charter of one version — outcomes, observable criteria, exclusions and a budget — agreed with the owner before its work runs" },
  { name: "Source", prefix: "S", folder: "docs/sources", stage: "idea", hint: "what people actually said, kept with consent; the product's documents quote it by place" },
  { name: "Hypothesis", prefix: "H", folder: "docs/hypotheses", stage: "idea", hint: "a belief worth testing — its test, its metric, its threshold; the result is read onto the record when the test comes due" },
  { name: "Open question", prefix: "Q", folder: "docs/questions", stage: "idea", hint: "what is not known, with who can answer and what settles it; an answer, or a not-applicable with a reason, closes it" },
  { name: "Prototype", prefix: "P", folder: "docs/prototypes", stage: "idea", hint: "code that tests one hypothesis and is thrown away once its results are kept" },
  { name: "Result", prefix: "R", folder: "docs/results", stage: "idea", hint: "what was observed against the threshold — confirmed, refuted or unclear, and why" },
  { name: "User story", prefix: "US", folder: "docs/stories", stage: "requirements", hint: "one slice of value for one role; it accepts through the use cases and requirements that grew from it" },
  { name: "Use case", prefix: "UC", folder: "docs/use-cases", stage: "requirements", hint: "one goal with its main success scenario; the product requirements it serves are written from it" },
  { name: "Product requirement", prefix: "FR", folder: "docs/requirements", stage: "requirements", hint: "one thing a user can observe; the capability specs reference it by id, never restate it" },
  { name: "Decision", prefix: "DEC", folder: "docs/decisions", stage: "design", hint: "a consequential, hard-to-reverse choice with its reason kept where a reader needs it" },
  { name: "Design record", prefix: "DES", folder: "docs/changes", stage: "design", hint: "one change's design — drivers, options traded, the recorded decision — written before code" },
  { name: "Architecture", prefix: "ARC", folder: "docs/system/architecture.md", stage: "design", hint: "how the system does it — the parts, their zones and the boundaries, kept with the code's shape" },
  { name: "Capability", prefix: "CAP", folder: "docs/system/capabilities", stage: "design", hint: "the unit the accepted behaviour is kept by — its EARS requirements and Given/When/Then scenarios" },
  { name: "Change record", prefix: "CHG", folder: "docs/changes", stage: "build", hint: "one feature's proposal against the current specs; acceptance merges it into the capabilities it touches" },
  { name: "Exploration", prefix: "EXP", folder: "docs/explorations", stage: "idea", hint: "questions and observations kept where retention is asked for; it commits to nothing" },
  { name: "Practice", prefix: "PRA", folder: "docs/practices", stage: "operate", hint: "a class of error answered once as a rule; learned as the work went on, retired with its reason" },
]
/** The fields each kind carries, as the contract names them. */
const FIELDS = ["name", "prefix", "folder", "stage", "hint"];
const FIELD_WORDS = {
  name: "the word the wiki shows for the kind",
  prefix: "the kind's id prefix, one to four capitals, unique among the kinds",
  folder: "the place under docs/ the kind's documents live in",
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
    "# the id prefixes and the stages are the set's forms' words, and a folder",
    "# is the set's default: a chain document keeps its kind by its id",
    "# wherever under docs/ it stands, so a described repository's derived",
    "# documents stand beside the repository they describe. The stages are",
    "# the set's life cycle; verify, release and operate keep their records",
    "# outside the kinds.",
    "",
    "stages:",
    ...STAGES.map((stage) => `  - id: ${stage}`),
    "kinds:",
  ];
  for (const kind of KINDS) {
    lines.push("  - name: " + kind.name);
    lines.push("    prefix: " + kind.prefix);
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
 * A registry text, read as the contract's shape the set renders. Value
 * carries `stages` (a list of {id, name?} entries) and `kinds` (a list of
 * maps with the five fields), or the first refusal ({ ok: false, line,
 * message }), already `file:`-prefixed. Nothing else is read or carried:
 the contract's
 * schema refuses an unknown property at any level, and so does this reader.
 * The contract's check is the word when it stands: this reader refuses what
 * it can line by line (anchors, aliases, merge keys, custom tags, the name
 * and prefix shapes), and the conformance run carries the refusals the set's
 * reader cannot see.
 */
export function parseKinds(text, file) {
  const lines = text.split("\n");
  // What the contract's strict YAML reader refuses, refused here at the
  // line it stands on: an anchor, an alias, a merge key or a custom tag
  // carries meaning the line reader does not hold, so it may not pass as
  // words.
  for (let x = 0; x < lines.length; x++) {
    if (lines[x].trim() === "" || lines[x].trim().startsWith("#")) continue;
    if (/(^|\s)[&*][A-Za-z]|(^|\s)!|<<:/.test(lines[x].replace(/(^|\s)#.*$/, "")))
      return { ok: false, line: x + 1, message: `${file}:${x + 1}: this line reads ${JSON.stringify(lines[x].trim())} — anchors (&), aliases (*), merge keys (<<:) and custom tags (!) are refused: the registry is plain words, and a line this reader cannot read is not a line to pass` };
  }
  const code = (l) => l.replace(/(^|\s)#.*$/, "").trimEnd();
  const trim = (l) => code(l).trim();
  const skip = (i) => {
    while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    return i;
  };
  let i = skip(0);
  if (i >= lines.length) return fail(file, Math.max(lines.length, 1), "the registry is empty: it carries the stages and the kinds");

  // `stages:` and its list of `{ id }` entries, each at the same leading spaces.
  if (i >= lines.length || !/^stages:\s*$/.test(trim(lines[i])))
    return fail(file, i < lines.length ? i + 1 : Math.max(lines.length, 1), "the registry begins with something other than `stages:` and the life cycle's order under it");
  const stagesLine = i + 1;
  i = skip(i + 1);
  if (i >= lines.length || !/^\s*-\s/.test(lines[i]))
    return fail(file, stagesLine, "`stages:` holds no list — each stage stands as `- id: <stage>` on its own line");
  const stages = [];
  while (i < lines.length && /^\s*-\s/.test(lines[i])) {
    const lead = lines[i].length - lines[i].trimStart().length;
    const first = lines[i].trimStart().replace(/^-\s*/, "").trimStart();
    const fields = [];
    if (first !== "") fields.push({ word: first, line: i + 1 });
    i++;
    while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    while (i < lines.length && /^\s+\S/.test(lines[i]) && lines[i].length - lines[i].trimStart().length > lead) {
      fields.push({ word: lines[i].trimStart(), line: i + 1 });
      i++;
      while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    }
    const map = Object.create(null);
    for (const field of fields) {
      const pair = /^([a-zA-Z-]+):\s*(.*)$/.exec(field.word);
      if (!pair) return fail(file, field.line, `a stage entry's line is no field "id:" or name the registry names`);
      const key = pair[1];
      if (key === "id") {
        const id = scalar(pair[2].trim(), field.line);
        if (id.value === "" || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(id.value))
          return fail(file, field.line, `the stage id "${id.value}" is not a stage name: letters, digits, dashes and underscores, starting with a letter`);
        if ("id" in map) return fail(file, field.line, `the stage carries "id" on it twice — each stage is given once`);
        map.id = id;
      } else if (key === "name") {
        const name = scalar(pair[2].trim(), field.line);
        if (name.value === "" || !/^[A-Za-z][A-Za-z0-9 _-]*$/.test(name.value))
          return fail(file, field.line, `the stage name "${name.value}" is not a reader's word: letters, digits, spaces, dashes and underscores`);
        if ("name" in map) return fail(file, field.line, `the stage carries "name" on it twice — each field is given once`);
        map.name = name;
      } else {
        return fail(file, field.line, `a stage entry carries "${key}", which the registry's stage list does not know — a stage carries id and its optional reader name`);
      }
    }
    if (!map.id) return fail(file, fields.length ? fields[0].line : i, "a stage entry carries no `id:`");
    stages.push(map);
    i = skip(i);
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
        return fail(file, i + 1, `under a kind stands a line that is no kind field name and value — a kind carries ${FIELDS.join(", ")}`);
      fields.push({ word: lines[i].trimStart(), line: i + 1 });
      i++;
      while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("#"))) i++;
    }
    if (!fields.length) return fail(file, i < lines.length ? i + 1 : Math.max(lines.length, 1), "an item of `kinds:` carries no fields — a kind stands as `- name: <name>` with its fields under it");
    for (const field of fields) {
      const pair = /^([a-zA-Z-]+):\s*(.*)$/.exec(field.word);
      const key = pair ? pair[1] : "";
      if (!/^([a-zA-Z-]+):\s*(.*)$/.test(field.word) || !FIELDS.slice(0, 5).includes(key))
        return fail(file, field.line, `a kind field has no name the registry knows on it — a kind carries ${FIELDS.join(", ")}`);
      if (key in map) return fail(file, field.line, `the kind carries "${key}" on it twice — each field is given once`);
      map[key] = scalar(pair[2], field.line);
      if (map[key].value === "") return fail(file, field.line, `the kind's "${key}" holds no value — ${FIELD_WORDS[key]}`);
      if ((key === "name" || key === "stage") && !/^[A-Za-z][A-Za-z0-9 _-]*$/.test(map[key].value))
        return fail(file, field.line, `the kind's "${key}" reads "${map[key].value}": a reader's word of letters, digits, spaces, dashes and underscores, starting with a letter`);
    }
    kinds.push(map);
  }
  if (i < lines.length && trim(lines[i]) !== "")
    return fail(file, i + 1, "the registry holds a line outside stages and kinds");
  return { ok: true, value: { stages, kinds } };
}

/** Where a kind's own record stands: the kind's first field's line. */
function anchorOf(kind, kindsLine) {
  for (const key of FIELDS) if (kind[key]) return kind[key].line;
  return kindsLine;
}

/**
 * The registry with the set's rules applied: { ok, findings, notes, value }.
 * A finding names the file and the line with what is wrong. A note reports a
 * choice the registry may legitimately make. The reader alone enforces what
 * the contract's check enforces (the prefix's shape, the folder under docs/,
 * the stage naming the list's stage, the hint's words, each name given
 * once), and the set's own rules beside them: one registry kind carries
 * exactly one of the set's kinds, matched by the kind's id prefix, one to
 * one — a kind the set owns that no kind of the registry carries any more
 * is a finding, because the wiki's groups and next-step hints lose the
 * set's chain without anything saying so.
 */
export function verifyRegistry(text, file) {
  const read = parseKinds(text, file);
  if (!read.ok) return { ok: false, findings: [read.message], notes: [] };
  const value = read.value;
  const findings = [];
  const notes = [];
  const out = (line, message) => `${file}:${line}: ${message}`;

  const stageNames = new Set(value.stages.map((s) => s.id.value));
  const seenStage = new Map();
  for (const stage of value.stages) {
    if (seenStage.has(stage.id.value))
      findings.push(out(stage.id.line, `the stage "${stage.id.value}" is named twice, first on line ${seenStage.get(stage.id.value)}: each stage is given once`));
    else seenStage.set(stage.id.value, stage.id.line);
  }

  const seenPrefix = new Map();
  for (const kind of value.kinds) {
    for (const field of FIELDS)
      if (!kind[field])
        findings.push(out(anchorOf(kind, firstKindLine(value)), `a kind carries no "${field}" — it is ${FIELD_WORDS[field]}`));
    if (kind.prefix?.value) {
      if (!/^[A-Z]{1,4}$/.test(kind.prefix.value))
        findings.push(out(kind.prefix.line, `"${kind.prefix.value}" is not an id prefix: one to four capitals (A-Z)`));
      if (seenPrefix.has(kind.prefix.value))
        findings.push(out(kind.prefix.line, `the id prefix "${kind.prefix.value}" is named twice, first on line ${seenPrefix.get(kind.prefix.value)}: each kind is given one prefix`));
      else seenPrefix.set(kind.prefix.value, kind.prefix.line);
    }
    if (kind.folder?.value) {
      if (!kind.folder.value.startsWith("docs/"))
        findings.push(out(kind.folder.line, `"${kind.folder.value}" is not a place under the documents: a kind lives inside docs/`));
      else
        for (const leg of kind.folder.value.slice("docs/".length).split("/")) {
          if (leg === "..")
            findings.push(out(kind.folder.line, `"${kind.folder.value}" climbs out of the documents: a kind lives inside docs/`));
          if (leg === "")
            findings.push(out(kind.folder.line, `"${kind.folder.value}" holds an empty segment: a kind lives inside docs/`));
        }
    }
    if (kind.stage?.value && !stageNames.has(kind.stage.value))
      findings.push(out(kind.stage.line, `"${kind.stage.value}" is not a stage of the list the registry names`));
    if (kind.hint?.value && kind.hint.value.trim() === "")
      findings.push(out(kind.hint.line, "the hint is empty: a reader stands where no word is"));
  }

  // The kinds the set owns, one registry kind each, matched by prefix.
  const taken = new Set();
  for (const owned of KINDS) {
    const here = value.kinds.find((kind) => !taken.has(kind) && kind.prefix?.value === owned.prefix);
    if (!here) {
      const proof = value.kinds.length ? anchorOf(value.kinds[0], firstKindLine(value)) : firstKindLine(value);
      findings.push(out(proof, `the set's ${owned.name} kind (its ids are ${owned.prefix}-…, written at ${owned.folder}) stands in no kind of the registry — the wiki loses the ${owned.stage} stage's word without it`));
      continue;
    }
    taken.add(here);
    if (here.folder?.value !== owned.folder)
      notes.push(out(here.folder.line, `the ${owned.name} kind's documents collect at "${here.folder.value}": the set's default is ${owned.folder} — the product's own choice, named for what the wiki now reads the kind's place from`));
    if (here.stage?.value !== owned.stage)
      if (value.stages.some((seen, x) => !STAGES[x] || !seen || seen.id?.value !== STAGES[x]))
        notes.push(out(here.stage.line, `the ${owned.name} kind reads stage "${here.stage.value}": the set's life cycle words its stage ${owned.stage} — a renamed stage is this product's choice, named so the stage a person reads stays the set's word in their head`));
      else
        findings.push(out(here.stage.line, `the set's ${owned.name} kind is filed under ${here.stage.value}: its stage is ${owned.stage} of the set's life cycle`));
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
  const verified = verifyRegistry(kept, "docs/kinds.yaml");
  if (!verified.ok) findings.push(...verified.findings);
  return verified.ok ? { ok: true, findings, words: [`kinds registry: the example at ${path} is the writer's own bytes and verifies under the set's reader`] } : { ok: false, findings, words: [] };
}

/** One run of the tool. Returns its exit code. */
function main(args) {
  const json = args.includes("--json");
  const check = args.includes("--check");
  const doSelftest = args.includes("--selftest");
  const wrong = args.filter((arg) => !arg.startsWith("--") || !["--json", "--check", "--selftest"].includes(arg));
  const badRoot = args.filter((arg) => arg === "--root").length;
  if (doSelftest && (wrong.length || badRoot)) {
    console.error("usage: node kinds-registry.mjs --selftest | [--root <product folder>] [--check] [--json]");
    return 2;
  }
  if (doSelftest) {
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
      const words = `${place.path} stands nowhere: the product keeps no kinds registry — nothing to verify; a product without one serves its plain pages, and setup writes one on its next run`;
      if (json) console.log(JSON.stringify({ status: "missing", message: words }));
      else console.log(words);
      return 0;
    }
    mkdirSync(dirname(place.path), { recursive: true });
    writeFileSync(place.path, renderRegistry());
    const words = `wrote ${place.path}: the set's kinds, each with its stage and its next-step hint; the product may rename the kinds or retune the hints, and the wiki reads this file alone`;
    if (json) console.log(JSON.stringify({ status: "wrote", path: place.path }));
    else console.log(words);
    return 0;
  }
  let text;
  try {
    text = readFileSync(place.path, "utf8");
  } catch (error) {
    const words = `${place.path} cannot be read: ${error.message} — a registry whose file cannot be read is refused as one unreadable file, exit 1`;
    if (json) console.log(JSON.stringify({ status: "findings", findings: [words] }));
    else console.error(words);
    return 1;
  }
  const verified = verifyRegistry(text, "docs/kinds.yaml");
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
