#!/usr/bin/env node
/**
 * The fake tracker's recipe: the port the tracker-sync proofs drive.
 * The recipe is the only place the tracker's own commands, store folder and
 * pointer live. Imported as a module its default export is the recipe object;
 * run directly it carries the declared commands (init, ordinal, export,
 * import, merge, claim, transition, post, pointer install/check/env, prove),
 * standing in for the tracker's own CLI.
 *
 * Usage: node recipe.mjs <init|ordinal|export|import|merge|claim|transition|post|prove|pointer> [args...]
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fake = join(here, 'fake.mjs');

const def = {
  name: 'fake',
  tracker: 'fake',
  ref: 'refs/tracker/state',
  storePath: 'fake',
  stateFiles: ['fake/items.jsonl'], // the portable state only, never the local database
  init: `node ${fake} init --prefix <prefix>`,
  ordinal: `node ${fake} ordinal --machine <machine>`,
  export: `node ${fake} export`,
  import: `node ${fake} import`,
  merge: `node ${fake} merge --ours <ours> --theirs <theirs> --base <base> --out <out> --order <order> --order-local <orderLocal> --store <store>`,
  claim: `node ${fake} claim --item <item> --holder <holder>`,
  transition: `node ${fake} transition --item <item> --to <to>`,
  post: `node ${fake} post --item <item> --text <text>`,
  pointer: {
    install: `node ${fake} pointer-install --store <store> --checkout <checkout>`,
    check: `node ${fake} pointer-check --checkout <checkout>`,
    env: `node ${fake} pointer-env --store <store>`,
  },
  prove: `node ${fake} where`,
  launch: `node <mechanismFile> watch --recipe <recipeFile> --interval 10 --debounce 2`,
};
export default def;

const run = (cmd, args) => spawnSync('node', [fake, cmd, ...args], { stdio: 'inherit' });
// run the CLI only when this file is the entry point: the mechanism imports
// the recipe as a module and would otherwise inherit this dispatch
const isEntry = process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url);
const r = isEntry ? (() => {
  const sub = process.argv[2];
  const argv = process.argv.slice(3);
  switch (sub) {
    case 'init': return run('init', argv);
    case 'ordinal': return run('ordinal', argv);
    case 'export': return run('export', argv);
    case 'import': return run('import', argv);
    case 'merge': return run('merge', argv);
    case 'claim': return run('claim', argv);
    case 'transition': return run('transition', argv);
    case 'post': return run('post', argv);
    case 'prove': return run('where', argv);
    case 'pointer': return run('pointer-' + argv[0], argv.slice(1));
    default:
      console.error('recipe: unknown subcommand: ' + (sub ?? '(none)'));
      console.error('known: init ordinal export import merge claim transition post prove pointer');
      return { status: 1 };
  }
})() : { status: 0 };
if (isEntry) process.exit(r.status ?? 1);
