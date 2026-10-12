#!/usr/bin/env node
// Counts the records a SMALL task's acceptance writes, by driving the real
// run script (runs.mjs) through the steps the text of take-task and the
// protocol demand of a single small task run.
//   node test/record-count.mjs --steps before   -> the old text's count
//   node test/record-count.mjs --steps after    -> the current text's count
// Prints one number: how many records the steps printed.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const runs = join(here, '..', 'skills', 'engineering', 'take-task', 'runs.mjs');

const home = mkdtempSync(join(tmpdir(), 'record-count-'));
const saved = { ...process.env };
process.env.CLAUDE_CONFIG_DIR = join(home, 'claude');
process.env.CODEX_HOME = join(home, 'codex');
process.env.PI_CODING_AGENT_DIR = join(home, 'omp');
process.env.HOME = home;
delete process.env.PI_CODING_AGENT_SESSION_DIR;
for (const k of ['PRIME_AGENT_SESSION_DIR', 'PRIME_AGENT_CODING_AGENT_SESSION_DIR', 'PRIME_AGENT_CODING_AGENT_DIR']) delete process.env[k];
let total = 0;
try {
  const demo = join(home, 'w', 'demo');
  mkdirSync(demo, { recursive: true });
  const sh = (a) => execFileSync('git', a, { cwd: demo, stdio: 'ignore' });
  sh(['init', '-q', '-b', 'main']);
  sh(['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'x']);
  process.chdir(demo);
  const dirOf = (cwd) => join(home, 'claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'));
  mkdirSync(dirOf(demo), { recursive: true });
  const T = (ms) => new Date(ms).toISOString();
  const start = Date.parse('2026-03-02T09:00:00Z');
  // One short session: the small task's work, one turn.
  writeFileSync(join(dirOf(demo), 's1.jsonl'), [
    { type: 'user', timestamp: T(start), cwd: demo, origin: { kind: 'human' }, message: { content: 'go' } },
    { type: 'assistant', timestamp: T(start + 4 * 60e3), attributionSkill: 'shady2k-skills:take-task', message: { id: 'm1', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm test' } }] } },
    { type: 'user', timestamp: T(start + 10 * 60e3), message: { content: [{ type: 'tool_result', tool_use_id: 't1' }] } },
    { type: 'system', subtype: 'turn_duration', timestamp: T(start + 10 * 60e3), durationMs: 10 * 60e3 },
  ].map((r) => JSON.stringify(r)).join('\n') + '\n');

  // The tracker, as the adapter exports it: one small task under one feature.
  const backlog = {
    generatedAt: T(start), source: 'record-count',
    issues: [
      { id: 'F', title: 'Small change', type: 'epic', status: 'active', labels: [], parent: null, blockedBy: [], body: '', updatedAt: T(start) },
      { id: 'A', title: 'Do the small task', type: 'task', status: 'active', labels: [], parent: 'F', blockedBy: [], body: '', updatedAt: T(start) },
    ],
  };
  const file = join(home, 'backlog.json');
  let posted = 0;
  const counts = [];
  const writeBacklog = () => writeFileSync(file, JSON.stringify(backlog));
  const as = (s) => ['--harness', 'claude-code', '--session', s, '--agent', `claude-x:t@m:b#${s}`];
  // One step of the run, as the text names it; counts the records it printed.
  const step = (...a) => {
    writeBacklog();
    const out = JSON.parse(execFileSync(process.execPath, [runs, ...a, '--backlog', file, '--project', 'demo', '--json'], { encoding: 'utf8' }));
    for (const r of out) {
      const it = backlog.issues.find((i) => i.id === r.item);
      it.comments ||= [];
      it.comments.push({ id: `c${++posted}`, at: T(start), author: 'agent', body: r.body });
    }
    counts.push([out.length, `runs.mjs ${a[0]}`]);
    total += out.length;
    return out;
  };
  // The small task's one acceptance record is the item's own recorded result
  // with its evidence, naming the CI run and the review. It is a write to the
  // tracker, not a record the run script prints, and it is made at every size,
  // so the count has to carry it or it measures something else.
  const accept = () => {
    const it = backlog.issues.find((i) => i.id === 'A');
    it.status = 'submitted';
    it.delivery = { revision: 'the submitted revision', evidence: 'CI run <id>; review <id>' };
    it.updatedAt = T(start);
    counts.push([1, 'accept: the item\'s recorded result with its evidence']);
    total += 1;
  };

  const which = process.argv[2] === '--steps' ? process.argv[3] : 'after';
  const clock = start;
  const realNow = Date.now;
  Date.now = () => clock;
  try {
    // The steps the text demands of a small task run on its own (take-task
    // takes a single task; the same rules apply at that size).
    //   before: every CI run was a record of its own (event --event ci).
    //   after: the small task's one acceptance record (its delivery evidence)
    //   names the CI run and the review; the claim and the receipt stay,
    //   because the owner's time figures count them.
    const steps = {
      before: [
        ['claim', '--item', 'A', '--role', 'coordinator', '--forecast', 'build=10'],
        ['event', '--event', 'ci', '--note', 'CI on the submitted branch'],
        'accept',
        ['finish', '--item', 'F', '--result', 'pull-request'],
      ],
      after: [
        ['claim', '--item', 'A', '--role', 'coordinator', '--forecast', 'build=10'],
        'accept',
        ['finish', '--item', 'F', '--result', 'pull-request'],
      ],
    };
    if (!steps[which]) throw new Error(`unknown --steps ${which}: before | after`);
    for (const a of steps[which]) if (a === 'accept') accept();
    else step(...a, ...as('s1'));
    for (const [n, what] of counts) console.error(`${n}  ${what}`);
    console.error(`${total}  records a small task writes — ${which}`);
  } finally {
    Date.now = realNow;
  }
} finally {
  process.env = saved;
  rmSync(home, { recursive: true, force: true });
}
console.log(String(total));
