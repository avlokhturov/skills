#!/usr/bin/env node
/**
 * The two product-repository skills the set carries (describe-repository,
 * write-intended-model), moved from the engine's repository (madarch-2j93;
 * decision 0021 (d)): their worked example is a real model, so the test keeps
 * it in step with what the set carries — the format reference documents every
 * field the example's model uses, the worked review reports carry the tables
 * the reference prescribes, and the code each report cites exists in the
 * example repository the report belongs to. The example's placeholders
 * (COMMIT, BLOB:<file>) are what a run computes; the engine's own model check
 * proves a written model passes, where the set names it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_SKILL = join(ROOT, 'skills/engineering/write-intended-model');
const EXAMPLE = join(MODEL_SKILL, 'example');
const DESC_SKILL = join(ROOT, 'skills/engineering/describe-repository');

const reference = readFileSync(join(MODEL_SKILL, 'reference.md'), 'utf8');

/** reference.md's one section, by heading. */
function section(heading) {
  const start = reference.indexOf(`## ${heading}\n`);
  assert.ok(start >= 0, `reference.md has no "## ${heading}" section`);
  const next = reference.indexOf('\n## ', start + 1);
  return next < 0 ? reference.slice(start) : reference.slice(start, next);
}

/** The fields the sections document: their "`field` (required)" bullet lines. */
function fieldsOf(...headings) {
  // A bullet documents one or more fields — "`from` (required), `to` (required)" — before its " —".
  return headings.flatMap((heading) =>
    [...section(heading).matchAll(/^- (\(?[^—]*?)\s—/gm)].flatMap(([, lead]) =>
      [...lead.matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1])
    )
  );
}

const walk = (d) =>
  readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

test('the moved skills name themselves the way the set carries every skill', () => {
  for (const dir of [DESC_SKILL, MODEL_SKILL]) {
    const skill = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    assert.match(skill, /^---\nname: (describe-repository|write-intended-model)\n/m);
    assert.match(skill, /^description: /m);
    assert.ok(readFileSync(join(dir, 'agents/openai.yaml'), 'utf8').includes('allow_implicit_invocation: true'));
  }
});

test("reference.md documents every field the example's model uses", () => {
  // Field names the sections document — bullets and the prose that names
  // nested fields (a transfer's `confidentiality`) alike.
  const sections = ['Element', 'Interface', 'Relation', 'Evidence', 'Zones and categories', 'Data entity', 'Scenario'];
  const documented = new Set(sections.flatMap((heading) => [...section(heading).matchAll(/`([a-zA-Z]+)`/g)].map((m) => m[1])));
  // The YAML's top-level keys name the lists the constructs stand in, not fields.
  const containers = new Set(['elements', 'interfaces', 'relations', 'scenarios', 'zones', 'categories', 'entities']);
  const used = new Set();
  for (const folder of ['model', 'update/model'])
    for (const f of walk(join(EXAMPLE, folder)).filter((f) => f.endsWith('.yaml')))
      for (const m of readFileSync(f, 'utf8').matchAll(/^\s+([a-zA-Z]+):/gm)) if (!containers.has(m[1])) used.add(m[1]);
  // Zone membership is documented as the element's "`add`, `exclude` or `replace`" lists.
  assert.ok(reference.includes('as `add`, `exclude` or'), 'reference.md no longer documents zone membership');
  for (const field of new Set([...used].filter((f) => !['add', 'exclude', 'replace'].includes(f))))
    assert.ok(documented.has(field), `the example's model uses \`${field}\`, which reference.md does not document`);
});

test("the example's review reports carry the tables the reference prescribes", () => {
  // The exact header rows the model check reads the two tables by.
  assert.ok(reference.includes('| Path | Element | Reason |'), 'reference.md no longer shows the assignment table');
  for (const folder of ['model', 'update/model']) {
    const review = readFileSync(join(EXAMPLE, folder, 'review.md'), 'utf8');
    assert.ok(
      /## Claims\n\n\| Claim \| Document \| Line \| Commit \| Blob \| Checked in code \| Verdict \| In the model \|/.test(review),
      `${folder}/review.md's claims table differs from the reference's`
    );
    assert.ok(
      /## Assignment\n\n\| Path \| Element \| Reason \|/.test(review),
      `${folder}/review.md's assignment table differs from the reference's`
    );
    for (const verdict of [...review.matchAll(/\| (confirmed|contradicted|stale|planned|unconfirmed) \|/g)].map((m) => m[1]))
      assert.ok(['confirmed', 'contradicted', 'stale', 'planned', 'unconfirmed'].includes(verdict));
  }
});

test("the code each worked review report cites exists in its example repository", () => {
  const trees = {
    'model/review.md': join(EXAMPLE, 'repo'),
    'update/model/review.md': join(EXAMPLE, 'update/repo'),
  };
  for (const [review, tree] of Object.entries(trees)) {
    const text = readFileSync(join(EXAMPLE, review), 'utf8');
    const cites = [...text.matchAll(/`((?:src|docs|README)[a-zA-Z0-9./_-]*(?:\.md|\.ts|\.json))`/g)].map((m) => m[1]);
    assert.ok(cites.length > 0, `${review} cites nothing`);
    for (const path of cites)
      assert.ok(
        statSync(join(tree, path), { throwIfNoEntry: false }) ||
        statSync(join(EXAMPLE, 'repo', path), { throwIfNoEntry: false }),
        `${review} cites ${path}, which no example repository holds`
      );
  }
});
