#!/usr/bin/env node
// tools/seal.mjs — writes data/prereg.json, the experiment's pre-registration, from the committed files: the sessions',
// the kernel's and the runner's sha256, the split, the arms, the budget, the rules and a prediction. Committed and pushed
// BEFORE any organ is graded on the real sessions.
//   node tools/seal.mjs            write it (refuses to overwrite)
//   node tools/seal.mjs --check    exit 1 unless the committed file is exactly what this writes
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ELEMENTS, WIRINGS, FEATURES, GRID, CHEAP, HAND, STEM, TRAIN_MONTHS, HELD_MONTHS, elementsOf, budgetOf } from '../organ.mjs';
import { CONFIG, SEEDS, DATA, sha } from './run.mjs';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const OUT = join(ROOT, 'data', 'prereg.json');
const text = (f) => readFileSync(join(ROOT, f), 'utf8');

export function prereg() {
  return {
    kind: 'pattern-organs-prereg', v: 1, written: '2026-10-01',
    approvedBy: 'Simon, relayed verbatim: "yes m8" (pattern organs, sales funnels and e-commerce first; then the seed design — an organ GROWN from a stem cluster of the seven elements, the grown organ against a hand-built one, same data, same budget). The dataset: Simon\'s direct "yes" to download it.',
    statement: 'Sealed, committed and pushed before any organ is graded on the real sessions. This fixes, in advance, the sessions, the kernel, the runner, the split, the three arms, the budget, the rules and a prediction. The result is published whichever way it lands.',
    question: 'Grown from a stem cluster carrying all seven elements — evolution choosing which switch on, the wiring and every parameter — does a funnel organ beat the same organ built by hand, on two months of sessions neither ever saw, with the same data and the same budget?',
    sealed: { [DATA]: sha(text(DATA)), 'organ.mjs': sha(text('organ.mjs')), 'tools/run.mjs': sha(text('tools/run.mjs')) },
    sessions: {
      source: 'Online Shoppers Purchasing Intention Dataset — C. Sakar and Y. Kastro, UCI Machine Learning Repository (2018), DOI 10.24432/C5F88Q, CC BY 4.0; introduced in Sakar, Polat, Katircioglu and Kastro, "Real-time prediction of online shoppers\' purchasing intention using multilayer perceptron and LSTM recurrent neural networks", Neural Computing & Applications (2019). 12,330 sessions of one online shop over a year, 1,908 of which bought.',
      split: 'by month: February–October (' + TRAIN_MONTHS.join(',') + ') train, November and December (' + HELD_MONTHS.join(',') + ') held out. No arm, no selection and no tuning ever sees a held-out session; each arm\'s champion is graded on them once.',
      inner: 'within the training months, a stratified third (per seed) is the inner check every candidate organ is scored on (AUC); the other two thirds are what it is fit on',
      measures: FEATURES.length + ' measures an organ may read: the 10 numeric and 6 categorical columns (Month is not one — it would be useless out of season) plus 5 shaped measures',
    },
    organ: {
      book: 'an organ keeps a short book of patterns — one or two conditions on its measures ("PageValues > 0 and ExitRates ≤ 0.03") whose buying rate is at least minLift times the base rate, or at most 1/minLift times it — and scores a session by its book',
      elements: {
        prove: 'a pattern enters the book only if it holds on a third of the sessions it was not found on (Wilson bound beyond the base rate at proofZ)',
        own: 'each kind of visitor with at least ownMin sessions and some buyers owns a book of its own',
        shape: 'the organ may read 5 shaped measures (total pages, total time, time per page, product share of pages, exit minus bounce)',
        carry: 'each next pattern is found among the sessions the earlier ones left unexplained (sequential covering), and the book keeps that order',
        remember: 'older months weigh less, halving every halfLife months back from the last training month',
        run: 'run cheaply: at most ' + CHEAP.bins + ' cuts, a book of at most ' + CHEAP.book + ', pairs among at most ' + CHEAP.pairK + ' conditions',
        connect: 'a pattern may join two conditions on different measures (pairs among the pairK strongest single conditions)',
      },
      wirings: WIRINGS.join(' · ') + ' — list: the rate of the first pattern that fires; sum: the log-lifts of every pattern that fires, added; mean: their average',
      grid: GRID,
      genome: 'which of the seven elements switch on (' + ELEMENTS.join(', ') + '), the wiring, which measures it reads, and an index into each parameter grid',
    },
    arms: {
      grown: 'generation 0 is THE STEM (every element on, every measure, the middle of every grid: ' + JSON.stringify(STEM) + ') plus ' + (CONFIG.population - 1) + ' random differentiations; then ' + (CONFIG.generations - 1) + ' generations: two battles (the fitter of two drawn at random), a crossover (each gene, and each bit of the switches, from one parent by a coin), then one change — by a coin either a blind mutation (one element, the wiring, one measure, or one step of one parameter) or an OBSERVED one: the parent looks at the training buyers its own book missed and switches on the unread measure that best tells them apart from the non-buyers (this look costs no evaluation and sees no held-out session); the best ' + CONFIG.elites + ' carry over',
      hand: 'THE HAND-BUILT ORGAN, designed before any session was looked at: ' + elementsOf(HAND.on).join(', ') + ' on; carry, remember and run off; sum wiring; every measure — an analyst\'s scorecard. Its first evaluation is its designed parameters ' + JSON.stringify(HAND) + '; the rest of the budget tunes its nine parameters by random draws',
      random: 'the control: the stem first, then random genomes over the whole space the grown arm searches — does growing beat drawing at random with the same budget?',
      budget: 'every arm gets exactly ' + budgetOf(CONFIG) + ' organ evaluations on the same inner split, in every seed',
      champion: 'the best inner score (ties: the earlier); refit on all training months with the same seed; graded once on November and December',
    },
    config: CONFIG,
    seeds: SEEDS,
    grade: 'AUC on the held-out sessions (ties half); also the share of all held-out buyers in the top tenth of sessions by score. Paired bootstrap of the grown-minus-hand AUC over the held-out sessions, ' + CONFIG.resamples + ' resamples per seed, 2.5% and 97.5% points.',
    rules: [
      { id: 'grown-beats-hand', rule: 'the grown organ\'s median held-out AUC over the five seeds is higher than the hand-built organ\'s' },
      { id: 'grown-most-seeds', rule: 'the grown organ beats the hand-built one on held-out AUC in at least 4 of the 5 seeds' },
      { id: 'grown-sure', rule: 'in at least 3 of the 5 seeds the bootstrap lower bound of grown minus hand-built is above 0' },
      { id: 'grown-beats-random', rule: 'the grown organ\'s median held-out AUC is higher than the random arm\'s' },
      { id: 'beats-one-measure', rule: 'the grown organ\'s median held-out AUC is higher than ranking the held-out sessions by PageValues alone' },
      { id: 'reproducible', rule: 're-running every seed from this seal gives an identical record — CI re-runs it on every push' },
    ],
    predictions: {
      said: 'before any organ was graded on the real sessions, by Kar',
      'grown-beats-hand': 'fail, narrowly — the hand design is a strong prior and ' + budgetOf(CONFIG) + ' evaluations is little for a search over ' + (ELEMENTS.length + 2 + Object.keys(GRID).length) + ' genes; within 0.01 AUC either way',
      'grown-most-seeds': 'fail',
      'grown-sure': 'fail — the two will be too close for the bootstrap to call',
      'grown-beats-random': 'pass — selection should beat drawing blind with the same budget',
      'beats-one-measure': 'pass — PageValues alone near 0.80–0.88; the organs near 0.86–0.92',
      reproducible: 'pass',
    },
    disclosures: [
      'Before the seal the kernel was only ever run on made-up sessions (its tests), plus one timing pilot on the real training sessions that printed milliseconds per evaluation and nothing else (seed 999, 20 evaluations) — to size the budget.',
      'November and December buy more often than February–October (the holiday season); AUC ranks sessions, so the shift in the base rate does not move it directly, but patterns can still shift.',
      'The seven elements are the capability router\'s seven stages, whose basis is Thomas Frumkin\'s MACCubeFACE lattice; what each element MEANS inside a funnel organ is this build\'s design.',
      'No language model is used anywhere in this build. The pattern book is the organ; minting a small model from it is a later step, not this one.',
    ],
  };
}

const stable = (o) => JSON.stringify(o, null, 1) + '\n';
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/seal.mjs')) {
  if (process.argv.includes('--check')) {
    const same = existsSync(OUT) && text('data/prereg.json') === stable(prereg());
    console.log(same ? 'the pre-registration matches its inputs' : 'data/prereg.json differs from what the committed inputs give');
    process.exitCode = same ? 0 : 1;
  } else if (existsSync(OUT)) { console.error('data/prereg.json exists — it is sealed'); process.exitCode = 1; }
  else { writeFileSync(OUT, stable(prereg())); console.log('sealed data/prereg.json · sha256 ' + sha(stable(prereg()))); }
}
