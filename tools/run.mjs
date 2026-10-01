#!/usr/bin/env node
// tools/run.mjs — the sealed experiment: five seeds, three arms each, every champion graded once on November and
// December. Refuses to run unless data/prereg.json is sealed and matches its inputs.
//   node tools/run.mjs --run       run it and write data/run.json (refuses to overwrite)
//   node tools/run.mjs --verify    re-run from the seal; exit 1 unless the record comes back identical
//                                  (with --record it also writes data/verify.json; CI re-checks that on every push)
//   node tools/run.mjs --grade     print the sealed rules against the committed record
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { experiment } from '../organ.mjs';

export const CONFIG = { population: 24, elites: 4, generations: 16, resamples: 1000 };
export const SEEDS = [1, 2, 3, 4, 5];
export const DATA = 'data/online_shoppers_intention.csv';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const text = (f) => readFileSync(join(ROOT, f), 'utf8');
export const sha = (s) => createHash('sha256').update(s).digest('hex');
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// the sealed rules, graded from a record — the page, the README and CI all call this one function
export function grade(prereg, run) {
  const seeds = run.seeds, of = (arm) => seeds.map((s) => s.arms[arm].heldAuc);
  const grown = median(of('grown')), hand = median(of('hand')), random = median(of('random'));
  const wins = seeds.filter((s) => s.arms.grown.heldAuc > s.arms.hand.heldAuc).length;
  const sure = seeds.filter((s) => s.grownMinusHand.lo > 0).length;
  const rules = [
    { id: 'grown-beats-hand', value: 'median held-out AUC ' + grown + ' grown vs ' + hand + ' hand-built', pass: grown > hand },
    { id: 'grown-most-seeds', value: 'grown ahead in ' + wins + ' of ' + seeds.length + ' seeds', pass: wins >= 4 },
    { id: 'grown-sure', value: 'bootstrap lower bound above 0 in ' + sure + ' of ' + seeds.length + ' seeds', pass: sure >= 3 },
    { id: 'grown-beats-random', value: 'median held-out AUC ' + grown + ' grown vs ' + random + ' random', pass: grown > random },
    { id: 'beats-one-measure', value: 'median grown ' + grown + ' vs PageValues alone ' + run.reference.heldAuc, pass: grown > run.reference.heldAuc },
    { id: 'reproducible', value: 'CI re-runs every seed from the seal and compares the record', pass: run.reproduced === true },
  ];
  return { rules, passed: rules.filter((r) => r.pass).length, of: rules.length, medians: { grown, hand, random }, wins, sure, predictions: prereg.predictions };
}

const stable = (o) => JSON.stringify(o, null, 1) + '\n';
const has = (f) => process.argv.includes(f);
// reproduced = a local re-run matched (data/verify.json) — and CI re-runs it on every push, failing if it no longer does
export const reproduced = () => existsSync(join(ROOT, 'data/verify.json')) && JSON.parse(text('data/verify.json')).reproduced === true;
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/run.mjs')) {
  // the seal's own check, as a separate process (seal.mjs imports this file, so importing it back would deadlock)
  const sealed = spawnSync(process.execPath, [join(ROOT, 'tools/seal.mjs'), '--check'], { cwd: ROOT }).status === 0;
  if ((has('--run') || has('--verify')) && !sealed) { console.error('not sealed, or the seal does not match its inputs — refusing'); process.exitCode = 1; }
  else if (has('--run')) {
    if (existsSync(join(ROOT, 'data/run.json'))) { console.error('data/run.json exists — the run is done'); process.exitCode = 1; }
    else {
      const sealedIn = execFileSync('git', ['log', '-1', '--format=%H', '--', 'data/prereg.json'], { cwd: ROOT, encoding: 'utf8' }).trim();
      if (!sealedIn) { console.error('the seal is not committed — commit and push it first'); process.exitCode = 1; }
      else {
        const t0 = Date.now();
        let ticks = 0;
        const e = experiment(text(DATA), SEEDS, CONFIG, () => { ticks += 1; if (ticks % 100 === 0) process.stderr.write('  ' + ticks + ' organs evaluated\n'); });
        const record = { kind: 'pattern-organs-run', v: 1, sealedIn, config: CONFIG, seeds: e.seeds, reference: e.reference, sessions: e.sessions, budget: e.budget, minutes: Math.round((Date.now() - t0) / 600) / 100 };
        writeFileSync(join(ROOT, 'data/run.json'), stable(record));
        console.log('ran ' + SEEDS.length + ' seeds in ' + record.minutes + ' min · data/run.json');
      }
    }
  } else if (has('--verify')) {
    const run = JSON.parse(text('data/run.json'));
    const e = experiment(text(DATA), SEEDS, CONFIG);
    const same = stable(e.seeds) === stable(run.seeds) && stable(e.reference) === stable(run.reference);
    console.log(same ? 'REPRODUCED — every seed\'s record is identical to the committed run' : 'DIFFERS — the re-run does not match data/run.json');
    process.exitCode = same ? 0 : 1;
    if (same && has('--record')) writeFileSync(join(ROOT, 'data/verify.json'), stable({ reproduced: true, node: process.version, on: new Date().toISOString().slice(0, 10) }));
  } else if (has('--grade')) {
    const j = grade(JSON.parse(text('data/prereg.json')), { ...JSON.parse(text('data/run.json')), reproduced: reproduced() });
    for (const r of j.rules) console.log((r.pass ? 'PASS ' : 'FAIL ') + r.id + ' — ' + r.value);
    console.log(j.passed + ' of ' + j.of);
  }
}
