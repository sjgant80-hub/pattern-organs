#!/usr/bin/env node
// tools/make-page.mjs — the fixpoint. index.html carries the SAME organ.mjs the tests and the mutation gate prove,
// inlined verbatim, for the in-browser re-run; every number on the page, in the README and in llms.txt is generated here
// from the committed seal and record by the same kernel and the same grade() — none is typed. CI regenerates all three
// and fails on any difference.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as K from '../organ.mjs';
import { CONFIG, SEEDS, DATA, grade, reproduced } from './run.mjs';

const at = (f) => new URL('../' + f, import.meta.url);
const read = (f) => readFileSync(at(f), 'utf8').replace(/\r\n/g, '\n');
const json = (f) => (existsSync(at(f)) ? JSON.parse(read(f)) : null);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const URL_LIVE = 'https://sjgant80-hub.github.io/pattern-organs/', REPO = 'https://github.com/sjgant80-hub/pattern-organs';
const CREDIT = 'Powered by the Konomi architecture, created by Thomas Frumkin';
const DATASET = 'Online Shoppers Purchasing Intention Dataset — C. Sakar and Y. Kastro, UCI Machine Learning Repository (2018), DOI 10.24432/C5F88Q, CC BY 4.0';

const pre = json('data/prereg.json'), run = json('data/run.json');
if (!pre) { console.error('not sealed — run tools/seal.mjs first'); process.exit(1); }
const j = run && grade(pre, { ...run, reproduced: reproduced() });
const pct = (v) => (Math.round(v * 1000) / 10) + '%';
const auc3 = (v) => v.toFixed(3);
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(3);
const ORDER = { grown: 'grown', hand: 'hand-built', random: 'random' };

// the seed whose grown organ sits at the median — its book is the one shown
const medianSeed = run && [...run.seeds].sort((a, b) => a.arms.grown.heldAuc - b.arms.grown.heldAuc)[Math.floor(run.seeds.length / 2)];

// ── the words, once, for page, README and llms.txt ─────────────────────────────────────────────────────────────────
const headline = !run
  ? 'Sealed, being measured. The rules, the split, the budget and the sha256 of the sessions and the kernel were committed before any organ was graded on the real sessions; the result lands here whichever way it goes.'
  : j.passed + ' of ' + j.of + ' sealed rules held. Over ' + run.seeds.length + ' seeds, the grown organ\'s median held-out AUC was ' + auc3(j.medians.grown)
    + ', the hand-built organ\'s ' + auc3(j.medians.hand) + ', the random arm\'s ' + auc3(j.medians.random) + ', and PageValues alone ' + auc3(run.reference.heldAuc)
    + '. The grown organ was ahead of the hand-built one in ' + j.wins + ' of ' + run.seeds.length + ' seeds; the bootstrap called it sure in ' + j.sure + '.';

const elementsChips = (on) => K.ELEMENTS.map((e) => '<span class="el' + (((on >> K.ELEMENTS.indexOf(e)) & 1) === 1 ? ' on' : '') + '">' + e + '</span>').join('');
const onFromKey = (key) => Number(key.split('.')[0]);

function curve(seeds) {
  const W = 640, H = 220, P = 34;
  const all = seeds.flatMap((s) => s.arms.grown.history);
  const lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const gens = seeds[0].arms.grown.history.length;
  const x = (g) => P + (g * (W - 2 * P)) / (gens - 1), y = (v) => H - P - ((v - lo) * (H - 2 * P)) / span;
  const lines = seeds.map((s, k) => '<polyline fill="none" stroke="var(--s' + k + ')" stroke-width="2" points="' + s.arms.grown.history.map((v, g) => x(g).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') + '"><title>seed ' + s.seed + '</title></polyline>').join('');
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Best inner AUC per generation, one line per seed">'
    + '<line x1="' + P + '" y1="' + (H - P) + '" x2="' + (W - P) + '" y2="' + (H - P) + '" stroke="var(--line)"/>'
    + '<text x="' + P + '" y="' + (H - 10) + '" class="ax">generation 0</text><text x="' + (W - P) + '" y="' + (H - 10) + '" class="ax" text-anchor="end">generation ' + (gens - 1) + '</text>'
    + '<text x="4" y="' + (y(hi) + 4).toFixed(1) + '" class="ax">' + auc3(hi) + '</text><text x="4" y="' + (y(lo) + 4).toFixed(1) + '" class="ax">' + auc3(lo) + '</text>'
    + lines + '</svg><p class="quiet legend">' + seeds.map((s, k) => '<span style="color:var(--s' + k + ')">━</span> seed ' + s.seed).join(' · ') + '</p>';
}

function bookHtml(organ) {
  return organ.books.map((b) => '<h3>' + esc(b.who === 'everyone' ? 'Everyone' : b.who.replace(/_/g, ' ') + 's') + ' <span class="quiet">— ' + b.base + '% bought</span></h3>'
    + (b.patterns.length ? '<ol class="book">' + b.patterns.map((p) => '<li><span class="when">' + esc(p.when) + '</span> <span class="rate ' + (p.lift >= 1 ? 'up' : 'down') + '">' + p.bought + '% bought · ×' + p.lift + '</span></li>').join('') + '</ol>' : '<p class="quiet">No pattern cleared the bar.</p>')).join('');
}

let verdict, body = '';
if (!run) {
  verdict = '<p class="big">' + esc(headline) + '</p><p class="quiet">Sealed in <code>data/prereg.json</code>. The question: ' + esc(pre.question) + '</p>';
} else {
  verdict = '<p class="big"><span class="stat">' + j.passed + ' of ' + j.of + '</span> sealed rules held.</p><p>' + esc(headline.slice(headline.indexOf('Over '))) + '</p>';
  body += '<h2>The sealed rules</h2><div class="card"><table><thead><tr><th>rule</th><th>result</th><th></th><th>predicted before the run</th></tr></thead><tbody>'
    + j.rules.map((r) => '<tr><td>' + esc(pre.rules.find((x) => x.id === r.id).rule) + '</td><td>' + esc(r.value) + '</td><td class="' + (r.pass ? 'pass">PASS' : 'fail">FAIL') + '</td><td class="quiet">' + esc(pre.predictions[r.id]) + '</td></tr>').join('')
    + '</tbody></table></div>';
  body += '<h2>Seed by seed</h2><div class="card"><table><thead><tr><th>seed</th><th>grown</th><th>hand-built</th><th>random</th><th>grown − hand (95% interval)</th><th>buyers in the top tenth, grown / hand</th></tr></thead><tbody>'
    + run.seeds.map((s) => '<tr><td>' + s.seed + '</td><td class="n">' + auc3(s.arms.grown.heldAuc) + '</td><td class="n">' + auc3(s.arms.hand.heldAuc) + '</td><td class="n">' + auc3(s.arms.random.heldAuc) + '</td><td class="n">' + sign(s.grownMinusHand.auc) + ' (' + sign(s.grownMinusHand.lo) + ' to ' + sign(s.grownMinusHand.hi) + ')</td><td class="n">' + pct(s.arms.grown.topTenth) + ' / ' + pct(s.arms.hand.topTenth) + '</td></tr>').join('')
    + '</tbody></table><p class="quiet">Held-out AUC on November and December (' + run.sessions + ' sessions in all; ' + K.HELD_MONTHS.length + ' months never seen by any arm). For scale: ranking those sessions by PageValues alone gives ' + auc3(run.reference.heldAuc) + '.</p></div>';
  body += '<h2>What grew</h2><div class="card"><p class="quiet" style="margin-top:0">Which of the seven elements each champion switched on. The stem started with all seven; the hand-built organ was given four.</p><table><thead><tr><th>organ</th><th>elements</th><th>wiring</th><th>measures</th></tr></thead><tbody>'
    + '<tr><td>the stem (generation 0)</td><td>' + elementsChips(K.STEM.on) + '</td><td>' + K.WIRINGS[K.STEM.wiring] + '</td><td class="n">' + K.FEATURES.length + '</td></tr>'
    + '<tr><td>hand-built (designed)</td><td>' + elementsChips(K.HAND.on) + '</td><td>' + K.WIRINGS[K.HAND.wiring] + '</td><td class="n">' + K.FEATURES.length + '</td></tr>'
    + run.seeds.map((s) => '<tr><td>grown, seed ' + s.seed + '</td><td>' + elementsChips(onFromKey(s.arms.grown.champion)) + '</td><td>' + esc(s.arms.grown.organ.wiring) + '</td><td class="n">' + s.arms.grown.organ.measures + '</td></tr>').join('')
    + '</tbody></table></div>';
  body += '<h2>How it grew</h2><div class="card"><p class="quiet" style="margin-top:0">The best organ of each generation, scored on the inner check inside the training months (selection sees this; it never sees November or December).</p>' + curve(run.seeds) + '</div>';
  body += '<h2>The pattern book it grew</h2><div class="card"><p class="quiet" style="margin-top:0">The grown organ of seed ' + medianSeed.seed + ' (the median seed), refit on every training session — what it actually reads into a session. Elements on: ' + esc(medianSeed.arms.grown.organ.elements.join(', ') || 'none') + '; wiring: ' + esc(medianSeed.arms.grown.organ.wiring) + '.</p>' + bookHtml(medianSeed.arms.grown.organ) + '</div>';
}

const faq = [
  ['What is a pattern organ?', 'A small, readable model of a domain: a book of patterns ("sessions that reach a valued page and leave slowly buy at 4 times the rate") that scores new cases. This first one lives in e-commerce funnels and reads 12,330 real sessions of one online shop.'],
  ['What does "grown" mean here?', 'The organ starts as a stem cluster carrying all seven elements of the capability router — prove, own, shape, carry, remember, run (cheaply), connect — each a real switch on how it works. Evolution chooses which switch on, how the book is wired into a score, which measures it reads, and every parameter. The hand-built organ is the same machinery with the switches set by an analyst, and its parameters tuned with the same budget.'],
  ['Did the grown organ beat the hand-built one?', run ? headline : 'Not yet known: the experiment is sealed and being measured. The answer is published here whichever way it lands.'],
  ['How do I know the result was not tuned after the fact?', 'The rules, the split, the budget, a prediction and the sha256 of the sessions, the kernel and the runner were committed and pushed before any organ was graded on the real sessions (data/prereg.json). CI re-runs every seed on every push, and this page re-runs a seed in your browser with the same kernel.'],
  ['Where do the sessions come from?', DATASET + '. Introduced in Sakar, Polat, Katircioglu and Kastro, Neural Computing & Applications (2019).'],
];
const ld = [
  { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Pattern Organs — the first organ, grown', description: 'A sealed experiment: a funnel pattern organ grown from a stem cluster of seven elements against the same organ built by hand, on two held-out months of real e-commerce sessions, re-runnable in the browser.', url: URL_LIVE, codeRepository: REPO, license: 'https://opensource.org/licenses/MIT', author: { '@type': 'Person', name: 'Kar' }, isBasedOn: 'https://doi.org/10.24432/C5F88Q' },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
];

const kernelSrc = read('organ.mjs').replace(/^export (function|const) /gm, '$1 ');
const committed = run ? Object.fromEntries(run.seeds.map((s) => [s.seed, JSON.stringify(s, null, 1)])) : {};
const elementRows = Object.entries(pre.organ.elements).map(([e, what]) => '<tr><td><span class="el on">' + e + '</span></td><td>' + esc(what) + '</td></tr>').join('');

const page = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pattern Organs</title>
<meta name="description" content="A funnel pattern organ grown from a stem cluster of seven elements, against the same organ built by hand, on two months of real shop sessions neither ever saw. Sealed first, re-runnable in your browser.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='%23d6a93a'/%3E%3C/svg%3E">
${ld.map((x) => '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>').join('\n')}
<style>
:root{--bg:#0c0b10;--panel:#15131b;--line:#2d2a36;--ink:#ece6d6;--dim:#a39c8c;--faint:#6f6a78;--gold:#d6a93a;--soft:#e9cf7f;--ok:#5fbf8f;--no:#e0616d;
 --s0:#d6a93a;--s1:#8fb4ff;--s2:#5fbf8f;--s3:#e0616d;--s4:#c38fff;
 --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]){--bg:#fbf8f1;--panel:#fff;--line:#e4dcc9;--ink:#22201c;--dim:#5e564a;--faint:#8b8272;--gold:#8a6a13;--soft:#6d5310;--s0:#8a6a13;--s1:#2f5fc4;--s2:#2e8a5c;--s3:#b8323f;--s4:#7a3fc4}}
:root[data-theme="light"]{--bg:#fbf8f1;--panel:#fff;--line:#e4dcc9;--ink:#22201c;--dim:#5e564a;--faint:#8b8272;--gold:#8a6a13;--soft:#6d5310;--s0:#8a6a13;--s1:#2f5fc4;--s2:#2e8a5c;--s3:#b8323f;--s4:#7a3fc4}
*{box-sizing:border-box}html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6}
.wrap{max-width:56rem;margin:0 auto;padding:0 16px 5rem}
header{padding:3rem 0 1.2rem}
.kick{font-family:var(--mono);font-size:.68rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin:0 0 .6rem}
h1{font-family:var(--serif);font-weight:500;font-size:clamp(1.9rem,6vw,3rem);margin:0 0 .5rem;color:var(--soft)}
.lede{font-family:var(--serif);font-style:italic;color:var(--dim);font-size:clamp(1rem,2.4vw,1.2rem);margin:0}
h2{font-family:var(--serif);font-weight:500;color:var(--gold);font-size:1.3rem;margin:2.3rem 0 .4rem}
h3{font-size:1rem;margin:1rem 0 .3rem}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:.8rem 0;overflow-x:auto}
.verdict{border-color:var(--gold)}
.big{font-size:1.1rem;margin-top:0}
.stat{font-variant-numeric:tabular-nums;font-weight:700;color:var(--soft)}
.quiet{color:var(--dim);font-size:.92rem}
table{width:100%;border-collapse:collapse;font-size:.88rem}
th,td{text-align:left;padding:.4rem .45rem;border-top:1px solid var(--line);vertical-align:top}
th{color:var(--faint);font-family:var(--mono);font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;border-top:0}
td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pass{color:var(--ok);font-family:var(--mono);font-weight:700}.fail{color:var(--no);font-family:var(--mono);font-weight:700}
.el{display:inline-block;font-family:var(--mono);font-size:.74rem;border:1px solid var(--line);color:var(--faint);border-radius:6px;padding:0 .35rem;margin:.1rem .2rem .1rem 0}
.el.on{border-color:var(--gold);color:var(--soft)}
.book{margin:.3rem 0 .6rem;padding-left:1.4rem}.book li{margin:.15rem 0}
.when{font-family:var(--mono);font-size:.84rem}.rate{font-size:.84rem;white-space:nowrap}.rate.up{color:var(--ok)}.rate.down{color:var(--no)}
svg{max-width:100%;height:auto;display:block}.ax{font-family:var(--mono);font-size:11px;fill:var(--faint)}
.legend{margin:.3rem 0 0}
button,select{font:inherit}
button{background:var(--gold);color:#16130c;border:0;border-radius:8px;padding:.6rem 1.1rem;font-weight:600;cursor:pointer}
button:hover{background:var(--soft)}button:disabled{opacity:.6;cursor:wait}
button:focus-visible,select:focus-visible{outline:2px solid var(--soft);outline-offset:2px}
select{background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:.5rem .6rem}
.bar{height:8px;background:var(--bg);border:1px solid var(--line);border-radius:6px;overflow:hidden;margin:.8rem 0 .4rem}.bar>div{height:100%;width:0;background:var(--gold);transition:width .2s}
code{font-family:var(--mono);font-size:.85em;background:var(--bg);border:1px solid var(--line);border-radius:4px;padding:.05em .3em;overflow-wrap:anywhere}
a{color:var(--soft)}
footer{margin-top:3rem;padding-top:1rem;border-top:1px solid var(--line);color:var(--faint);font-size:.84rem}
</style></head><body><div class="wrap">
<header>
 <p class="kick">Pattern organs · the first organ · funnels</p>
 <h1>An organ, grown</h1>
 <p class="lede">A funnel organ grown from a stem cluster of seven elements, against the same organ built by hand: the same 12,330 real shop sessions, the same budget, and two months of sessions neither ever saw.</p>
</header>

<h2>The verdict</h2>
<div class="card verdict">${verdict}</div>
${body}
<h2>Re-run it yourself</h2>
<div class="card"><p style="margin-top:0">One seed again, from the seal, in your browser: the same kernel this page is built from (inlined below), the same sessions, the same budget — all three arms, ${3 * K.budgetOf(CONFIG)} organs fit and scored, then each champion graded on November and December. It takes a minute or two.${run ? ' If the record comes out different by a single character, this page says so.' : ' (The committed record lands once the sealed run is done; until then this shows the result without comparing it.)'}</p>
 <label for="seed">seed</label> <select id="seed">${SEEDS.map((s) => '<option>' + s + '</option>').join('')}</select>
 <button id="rerun" type="button">Re-run this seed</button>
 <div class="bar" aria-hidden="true"><div id="bar"></div></div>
 <p id="out" class="quiet" role="status" aria-live="polite">Ready.</p></div>

<h2>The seven elements</h2>
<div class="card"><p class="quiet" style="margin-top:0">Each a real switch on how the organ works. The stem carries all seven; evolution decides which stay on.</p><table><tbody>${elementRows}</tbody></table></div>

<h2>What was sealed first</h2>
<div class="card"><p style="margin-top:0">${esc(pre.statement)}</p>
<p><b>The split.</b> ${esc(pre.sessions.split)}</p>
<p><b>Grown.</b> ${esc(pre.arms.grown)}</p>
<p><b>Hand-built.</b> ${esc(pre.arms.hand)}</p>
<p><b>Random.</b> ${esc(pre.arms.random)}</p>
<p><b>Budget.</b> ${esc(pre.arms.budget)}. <b>Champions.</b> ${esc(pre.arms.champion)}.</p>
<p class="quiet">${run ? 'Sealed in <code>' + esc(run.sealedIn.slice(0, 7)) + '</code> · ' : ''}sha256 of the sessions <code>${esc(pre.sealed[DATA].slice(0, 16))}…</code>, of the kernel <code>${esc(pre.sealed['organ.mjs'].slice(0, 16))}…</code> · <a href="data/prereg.json">the pre-registration</a>${run ? ' · <a href="data/run.json">the record</a>' : ''}</p>
<p class="quiet">${pre.disclosures.map(esc).join(' ')}</p></div>

<h2>Questions</h2>
<div class="card">${faq.map(([q, a]) => '<h3>' + esc(q) + '</h3><p>' + esc(a) + '</p>').join('')}</div>

<footer>
 <p>The organs on this page are fit by the mutation-gated kernel <code>organ.mjs</code>, inlined verbatim. · <a href="${REPO}">source</a> · MIT for the code.</p>
 <p>Sessions: ${esc(DATASET)}.</p>
 <p>The seven elements are the capability router's stages, whose basis is Thomas Frumkin's MACCubeFACE lattice. ${CREDIT}.</p>
</footer>
</div>

<script id="kernel" type="text/plain">
${kernelSrc.replace(/<\/script/gi, '<\\/script')}
</script>
<script>
const COMMITTED = ${JSON.stringify(committed).replace(/</g, '\\u003c')};
const CONFIG = ${JSON.stringify(CONFIG)};
const TOTAL = ${3 * K.budgetOf(CONFIG)};
const SEALED_DATA = ${JSON.stringify(pre.sealed[DATA])};
const driver = 'self.onmessage=(e)=>{const d=parseSessions(e.data.csv);let t=0;const out=runSeed(d,e.data.seed,e.data.config,()=>{t+=1;if(t%6===0)self.postMessage({t});});self.postMessage({done:out});};';
const $ = (id) => document.getElementById(id);
let csvText = null;
async function sessions() {
  if (csvText) return csvText;
  const r = await fetch('${DATA}');
  if (!r.ok) throw new Error('could not load the sessions (' + r.status + ')');
  const t = await r.text();
  const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (h !== SEALED_DATA) throw new Error('the sessions file does not match the sealed sha256');
  return (csvText = t);
}
$('rerun').addEventListener('click', async () => {
  const seed = Number($('seed').value), btn = $('rerun'), out = $('out'), bar = $('bar');
  btn.disabled = true; bar.style.width = '0'; out.textContent = 'Loading the sessions…';
  try {
    const csv = await sessions();
    const url = URL.createObjectURL(new Blob([$('kernel').textContent, '\\n', driver], { type: 'text/javascript' }));
    const w = new Worker(url), t0 = performance.now();
    out.textContent = 'Growing, building and drawing organs for seed ' + seed + '…';
    w.onmessage = (e) => {
      if (e.data.t) { bar.style.width = Math.min(100, (100 * e.data.t) / TOTAL).toFixed(1) + '%'; return; }
      w.terminate(); URL.revokeObjectURL(url); bar.style.width = '100%'; btn.disabled = false;
      const got = JSON.stringify(e.data.done, null, 1), s = ((performance.now() - t0) / 1000).toFixed(0);
      const a = e.data.done.arms;
      const line = 'held-out AUC — grown ' + a.grown.heldAuc.toFixed(3) + ', hand-built ' + a.hand.heldAuc.toFixed(3) + ', random ' + a.random.heldAuc.toFixed(3) + ' (' + s + ' s).';
      if (!COMMITTED[seed]) out.textContent = 'Done: ' + line;
      else out.textContent = (got === COMMITTED[seed] ? 'IDENTICAL to the committed record: ' : 'DIFFERS from the committed record: ') + line;
    };
    w.onerror = (e) => { btn.disabled = false; out.textContent = 'The re-run failed: ' + e.message; };
    w.postMessage({ csv, seed, config: CONFIG });
  } catch (err) { btn.disabled = false; out.textContent = String(err.message || err); }
});
</script>
</body></html>
`;

// ── README and llms.txt from the same words ────────────────────────────────────────────────────────────────────────
const md = [];
md.push('# Pattern Organs', '', '**Live: ' + URL_LIVE + '**', '');
md.push('A funnel pattern organ **grown** from a stem cluster of seven elements, against the same organ **built by hand**: the same 12,330 real shop sessions, the same budget, and two months of sessions neither ever saw. Sealed before any organ was graded; re-runnable in your browser and on CI.', '');
md.push('## The result', '', headline, '');
if (run) {
  md.push('| Sealed rule | Result | | Predicted |', '|---|---|---|---|');
  for (const r of j.rules) md.push('| ' + pre.rules.find((x) => x.id === r.id).rule + ' | ' + r.value + ' | ' + (r.pass ? 'PASS' : 'FAIL') + ' | ' + pre.predictions[r.id] + ' |');
  md.push('', '| Seed | Grown | Hand-built | Random | Grown − hand (95% interval) |', '|---|---|---|---|---|');
  for (const s of run.seeds) md.push('| ' + s.seed + ' | ' + auc3(s.arms.grown.heldAuc) + ' | ' + auc3(s.arms.hand.heldAuc) + ' | ' + auc3(s.arms.random.heldAuc) + ' | ' + sign(s.grownMinusHand.auc) + ' (' + sign(s.grownMinusHand.lo) + ' to ' + sign(s.grownMinusHand.hi) + ') |');
  md.push('', 'Held-out AUC on November and December. PageValues alone: ' + auc3(run.reference.heldAuc) + '.', '');
}
md.push('## What it is', '', '- `organ.mjs` — the kernel: a pattern organ (a book of one- and two-condition patterns, scored by list, sum or mean), the seven elements as switches (' + K.ELEMENTS.join(', ') + '), the stem and the hand-built design, the three arms (grown, hand-built, random), AUC and a paired bootstrap. Pure and deterministic; the checked entry point `experiment()` returns `{ok:false}` on garbage, never throws.', '- `tools/seal.mjs` — the pre-registration (`data/prereg.json`), committed and pushed before the run.', '- `tools/run.mjs` — the sealed run (`--run`), its re-run (`--verify`) and its grade.', '- `tools/make-page.mjs` — this README, `index.html` and `llms.txt`, generated from the seal and the record.', '');
md.push('## Verify', '', '```bash', 'node --test                       # the kernel\'s tests (made-up sessions only)', 'node tools/seal.mjs --check       # the seal matches the committed sessions, kernel and runner', 'node tools/run.mjs --verify       # re-run all five seeds and compare the record', '```', '', 'CI runs all three on every push, plus the mutation gate (witness) on `organ.mjs`, and regenerates this README and the page and fails on any difference.', '');
md.push('## Credits', '', '- Sessions: ' + DATASET + '. Introduced in Sakar, Polat, Katircioglu and Kastro, "Real-time prediction of online shoppers\' purchasing intention using multilayer perceptron and LSTM recurrent neural networks", Neural Computing & Applications (2019).', '- The seven elements are the stages of the estate\'s capability router, whose basis is Thomas Frumkin\'s MACCubeFACE lattice. ' + CREDIT + '.', '- Code: MIT. The sessions file keeps its own licence (CC BY 4.0).', '');

const llms = ['# Pattern Organs', '', '> A sealed experiment: a funnel pattern organ grown from a stem cluster of seven elements, against the same organ built by hand, on two held-out months of 12,330 real e-commerce sessions.', '',
  headline, '', '## Key pages', '', '- [Live page](' + URL_LIVE + ')', '- [Repository](' + REPO + ')', '- [Pre-registration](' + URL_LIVE + 'data/prereg.json)', ...(run ? ['- [The record](' + URL_LIVE + 'data/run.json)'] : []), '',
  '## Verify, don\'t trust', '', 'Every number here is generated from the committed seal and record. CI re-runs all five seeds on every push; the live page re-runs any seed in the browser with the same mutation-gated kernel.', '',
  '## Credits', '', '- ' + DATASET + '.', '- ' + CREDIT + '.', ''].join('\n');

writeFileSync(at('index.html'), page);
writeFileSync(at('README.md'), md.join('\n'));
writeFileSync(at('llms.txt'), llms);
console.log('page built · ' + (run ? j.passed + ' of ' + j.of + ' rules' : 'sealed, not yet run'));
