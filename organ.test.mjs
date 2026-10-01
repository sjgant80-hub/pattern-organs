// organ.test.mjs — the pattern organ kernel, line by line. Small made-up sessions only: the real sessions are graded
// by the sealed run, never by a test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as O from './organ.mjs';

const HEAD = 'Administrative,Administrative_Duration,Informational,Informational_Duration,ProductRelated,ProductRelated_Duration,BounceRates,ExitRates,PageValues,SpecialDay,Month,OperatingSystems,Browser,Region,TrafficType,VisitorType,Weekend,Revenue';
const DEF = { Administrative: 0, Administrative_Duration: 0, Informational: 0, Informational_Duration: 0, ProductRelated: 1, ProductRelated_Duration: 0, BounceRates: 0, ExitRates: 0.1, PageValues: 0, SpecialDay: 0, Month: 'Mar', OperatingSystems: 1, Browser: 1, Region: 1, TrafficType: 1, VisitorType: 'Returning_Visitor', Weekend: 'FALSE', Revenue: 'FALSE' };
const csv = (rows) => [HEAD, ...rows.map((r) => HEAD.split(',').map((h) => (h in r ? r[h] : DEF[h])).join(','))].join('\n');
const parse = (rows) => { const d = O.parseSessions(csv(rows)); assert.ok(d.ok, d.error); return d; };
const B = (r) => ({ ...r, Revenue: 'TRUE' });
const range = (n) => Array.from({ length: n }, (_, i) => i);
const seq = (...vals) => { let k = 0; return () => vals[k++ % vals.length]; };

// a made-up shop: sessions that reach a valued page buy far more often; new visitors a little more
function world(n, seed) {
  const r = O.rng(seed), out = [];
  const months = ['Feb', 'Mar', 'May', 'Oct', 'Nov', 'Dec'];
  for (let i = 0; i < n; i++) {
    const pv = r() < 0.3 ? 5 + O.draw(r, 40) : 0;
    const visitor = i % 5 === 0 ? 'New_Visitor' : 'Returning_Visitor';
    const buy = r() < (pv > 0 ? 0.6 : 0.05) + (visitor === 'New_Visitor' ? 0.1 : 0);
    out.push({ Month: months[i % 6], PageValues: pv, ExitRates: O.draw(r, 20) / 100, ProductRelated: 1 + O.draw(r, 30), ProductRelated_Duration: O.draw(r, 900),
      Administrative: O.draw(r, 4), TrafficType: 1 + O.draw(r, 3), VisitorType: visitor, Revenue: buy ? 'TRUE' : 'FALSE' });
  }
  return out;
}
const TINY = { population: 4, elites: 1, generations: 3, resamples: 20 };
// pinned from the kernel (each re-derivable by hand from the stream and the rules; they pin determinism)
const BOOT = { lo: -0.125, hi: 1 };
const GENOME9 = { on: 25, wiring: 2, features: 297305, bins: 6, book: 6, minSupport: 4, minLift: 1, smooth: 5, pairK: 0, proofZ: 3, halfLife: 4, ownMin: 3 };
const WITH9 = [1, 7, 0, 4, 4, 4, 1, 6, 0];
const GROWN1 = ['93.2.1516397.4.7.2.0.5.0.1.1.4', 7];
const HANDS = [0.836864406779661, 0.5, 0.6563559322033898, 0.5, 0.8207627118644067, 0.8207627118644067, 0.8194915254237288, 0.8194915254237288, 0.8436440677966102, 0.8423728813559322];
const RUN1 = [0.82, 0.793067, 0.82, -0.00375, 0.070825];

// ── parsing ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('parseSessions refuses what is not a session table, and says why', () => {
  assert.deepEqual(O.parseSessions(42), { ok: false, error: 'the sessions must be CSV text' });
  assert.equal(O.parseSessions('').error.startsWith('missing columns: Administrative, '), true);
  assert.equal(O.parseSessions(HEAD.replace(',PageValues', '')).error, 'missing columns: PageValues');
  assert.equal(O.parseSessions(HEAD.replace(',Revenue', ',X')).error, 'missing columns: Revenue');
  assert.equal(O.parseSessions(HEAD.replace('Month', 'Mon')).error, 'missing columns: Month');
  assert.deepEqual(O.parseSessions(HEAD + '\n'), { ok: false, error: 'no sessions' });
  assert.equal(O.parseSessions(HEAD + '\n1,2').error, 'session 1 has 2 cells, not 18');
  assert.equal(O.parseSessions(csv([{}, { PageValues: 'x' }])).error, 'session 2: PageValues is not a number');
  assert.equal(O.parseSessions(csv([{ BounceRates: '' }])).error, 'session 1: BounceRates is not a number');
  assert.equal(O.parseSessions(csv([{ Month: 'Smarch' }])).error, 'session 1: unknown month');
  assert.equal(O.parseSessions(csv([{ Month: 'constructor' }])).error, 'session 1: unknown month');
  assert.equal(O.parseSessions(csv([{ Revenue: 'yes' }])).error, 'session 1: Revenue is not TRUE or FALSE');
});

test('parseSessions reads every measure, the month, the purchase, and shapes the derived measures', () => {
  const d = O.parseSessions(csv([
    { Administrative: 2, Administrative_Duration: 10, Informational: 1, Informational_Duration: 5, ProductRelated: 1, ProductRelated_Duration: 45, BounceRates: '9.83E-05', ExitRates: 0.25, PageValues: 7.5, Month: 'Nov', Browser: 3, VisitorType: 'New_Visitor', Weekend: 'TRUE', Revenue: 'TRUE' },
    { ProductRelated: 0, ExitRates: 0.2, BounceRates: 0.2, Month: 'June' },
  ]).replace(/\n/g, '\r\n') + '\r\n');
  assert.equal(d.ok, true);
  assert.equal(d.n, 2);
  assert.deepEqual([...d.y], [1, 0]);
  assert.deepEqual([...d.month], [11, 6]);
  assert.equal(d.cols.BounceRates[0], 9.83e-5);
  assert.equal(d.cols.PageValues[0], 7.5);
  assert.deepEqual(d.cols.Browser, ['3', '1']);
  assert.deepEqual(d.cols.VisitorType, ['New_Visitor', 'Returning_Visitor']);
  assert.deepEqual(d.cols.Weekend, ['TRUE', 'FALSE']);
  assert.equal(d.cols.totalPages[0], 4);
  assert.equal(d.cols.totalDuration[0], 60);
  assert.equal(d.cols.durationPerPage[0], 15);
  assert.equal(d.cols.productShare[0], 0.25);
  assert.equal(d.cols.exitMinusBounce[0], 0.25 - 9.83e-5);
  assert.equal(d.cols.totalPages[1], 0);
  assert.equal(d.cols.durationPerPage[1], 0);
  assert.equal(d.cols.productShare[1], 0);
  assert.equal(d.cols.exitMinusBounce[1], 0);
  assert.equal(O.parseSessions(csv([{ Administrative: -1 }])).cols.Administrative[0], -1);
});

test('parseSessions keeps each measure in rising order, and one session parses', () => {
  const d = parse([{ PageValues: 3 }, { PageValues: 1 }, { PageValues: 2 }, { PageValues: 0 }]);
  assert.deepEqual([...d.order.PageValues], [3, 1, 2, 0]);
  assert.deepEqual([...d.order.totalPages], [0, 1, 2, 3]);
  assert.equal(parse([{}]).n, 1);
});

test('rowsIn picks the sessions of the given months', () => {
  const d = parse([{ Month: 'Feb' }, { Month: 'Nov' }, { Month: 'Oct' }, { Month: 'Dec' }]);
  assert.deepEqual(O.rowsIn(d, O.TRAIN_MONTHS), [0, 2]);
  assert.deepEqual(O.rowsIn(d, O.HELD_MONTHS), [1, 3]);
});

// ── randomness and splits ───────────────────────────────────────────────────────────────────────────────────────────
test('rng is the seeded mulberry32 stream; draw and coin are whole draws', () => {
  const r = O.rng(1);
  assert.deepEqual([r(), r(), r()].map((v) => Math.round(v * 1e9)), [627073941, 2735721, 527447040]);
  assert.equal(O.draw(() => 0.999, 4), 3);
  assert.equal(O.draw(() => 0.25, 4), 1);
  assert.equal(O.coin(() => 0.49), true);
  assert.equal(O.coin(() => 0.5), false);
});

test('split holds back the same share of buyers and non-buyers, the same way every time', () => {
  const d = parse(range(12).map((i) => (i < 6 ? B({}) : {})));
  const s = O.split(d, range(12), 1 / 3, 7);
  assert.equal(s.held.filter((i) => i < 6).length, 2);
  assert.equal(s.held.filter((i) => i >= 6).length, 2);
  assert.deepEqual([...s.held, ...s.rest].sort((a, b) => a - b), range(12));
  assert.deepEqual(s.rest, range(12).filter((i) => !s.held.includes(i)));
  assert.deepEqual(s.held, [...s.held].sort((a, b) => a - b));
  assert.deepEqual(O.split(d, range(12), 1 / 3, 7), s);
  assert.deepEqual(s.held, [1, 4, 9, 10]);
  assert.notDeepEqual(O.split(d, range(12), 1 / 3, 8).held, s.held);
  assert.deepEqual(O.split(d, range(12), 0.5, 3).held.length, 6);
});

// ── frames and counts ───────────────────────────────────────────────────────────────────────────────────────────────
test('popcount counts the set bits of a 32-bit word', () => {
  assert.equal(O.popcount(0), 0);
  assert.equal(O.popcount(1), 1);
  assert.equal(O.popcount(0xFFFFFFFF), 32);
  assert.equal(O.popcount(0x80000000 | 0), 1);
  assert.equal(O.popcount(0x12345678), 13);
  assert.equal(O.popcount(0xF0F0F0F0), 16);
});

test('frame lays each month on whole words, marks every session and every buyer, and copies the measures', () => {
  const rows = [...range(33).map(() => ({ Month: 'Mar' })), B({ Month: 'Feb', PageValues: 4 }), B({ Month: 'Mar', PageValues: 9 })];
  const d = parse(rows);
  const F = O.frame(d, range(35), (m) => m, ['PageValues', 'VisitorType']);
  assert.equal(F.words, 3);
  assert.deepEqual(F.blocks.map((b) => [b.lo, b.hi, b.w, b.list.length]), [[0, 1, 2, 1], [1, 3, 3, 34]]);
  assert.equal(F.at[0], 33);
  assert.equal(F.at[1], -1);
  assert.equal(F.at[32], 0);
  assert.equal(F.at[32 + 33], 34);
  assert.equal(F.at[32 + 34], -1);
  assert.deepEqual([...F.all], [1, 0xFFFFFFFF, 0b11]);
  assert.deepEqual([...F.Y], [1, 0, 0b10]);
  assert.equal(F.cols.PageValues[0], 4);
  assert.equal(F.cols.PageValues[32 + 33], 9);
  assert.equal(F.cols.PageValues[1], undefined);
  assert.equal(F.cols.VisitorType[32], 'Returning_Visitor');
  assert.equal(F.cols.ExitRates, undefined);
  assert.deepEqual(O.weigh(F, F.all, F.all), [2 * 1 + 3 * 34, 2 * 1 + 3 * 1]);
  const half = Uint32Array.from([0, 0xFFFF, 0b110]);
  assert.deepEqual(O.weigh(F, F.all, half), [3 * 17, 3 * 1]);
  assert.deepEqual(O.weigh(F, Uint32Array.from([1, 0, 0]), F.all), [2, 2]);
});

test('holds and fires read conditions the way they are written', () => {
  assert.equal(O.holds({ op: '=', v: 'a' }, 'a'), true);
  assert.equal(O.holds({ op: '=', v: 'a' }, 'b'), false);
  assert.equal(O.holds({ op: '>', v: 2 }, 3), true);
  assert.equal(O.holds({ op: '>', v: 2 }, 2), false);
  assert.equal(O.holds({ op: '<=', v: 2 }, 2), true);
  assert.equal(O.holds({ op: '<=', v: 2 }, 3), false);
  const d = parse([{ PageValues: 5, ExitRates: 0.1 }, { PageValues: 5, ExitRates: 0.3 }]);
  const p = { conds: [{ f: 'PageValues', op: '>', v: 0 }, { f: 'ExitRates', op: '<=', v: 0.2 }] };
  assert.equal(O.fires(p, d, 0), true);
  assert.equal(O.fires(p, d, 1), false);
});

test('conditions: each value of a category; numeric cuts at quantiles, deduplicated, never at the top', () => {
  const d = parse(range(10).map((i) => ({ PageValues: i, ExitRates: i < 8 ? 0 : 1, Browser: (i % 3) + 1 })));
  assert.deepEqual(O.conditions(d, range(10), ['Browser'], 4), ['1', '2', '3'].map((v) => ({ f: 'Browser', op: '=', v })));
  assert.deepEqual(O.conditions(d, range(10), ['PageValues'], 4).map((c) => c.op + c.v), ['>2', '<=2', '>5', '<=5', '>7', '<=7']);
  assert.deepEqual(O.conditions(d, range(10), ['PageValues'], 3).map((c) => c.op + c.v), ['>3', '<=3', '>6', '<=6']);
  assert.deepEqual(O.conditions(d, range(10), ['ExitRates'], 4).map((c) => c.op + c.v), ['>0', '<=0']);
  assert.deepEqual(O.conditions(d, range(10), ['ExitRates'], 10).map((c) => c.op + c.v), ['>0', '<=0']);
  assert.deepEqual(O.conditions(d, [8, 9], ['ExitRates'], 4), []);
  assert.deepEqual(O.conditions(d, [0, 1, 2, 3], ['PageValues'], 2).map((c) => c.op + c.v), ['>2', '<=2']);
  assert.deepEqual(O.conditions(d, [3, 0, 2, 1], ['Browser', 'PageValues'], 2).map((c) => c.f + c.op + c.v), ['Browser=1', 'Browser=2', 'Browser=3', 'PageValues>2', 'PageValues<=2']);
});

test('wilson bounds a rate; with z = 0 both bounds are the rate itself', () => {
  assert.equal(Math.round(O.wilson(5, 10, 1.96, -1) * 1e4), 2366);
  assert.equal(Math.round(O.wilson(5, 10, 1.96, 1) * 1e4), 7634);
  assert.equal(O.wilson(1, 4, 0, -1), 0.25);
  assert.equal(O.wilson(1, 4, 0, 1), 0.25);
  assert.equal(Number.isNaN(O.wilson(0, 0, 1, -1)), true);
});

// ── mining a book ───────────────────────────────────────────────────────────────────────────────────────────────────
// 40 sessions, 10 buyers (base 0.25): five valued-page sessions all buy (lift exactly 2 at smooth 10), ten high-exit
// sessions never buy (lift exactly 0.5)
const SHOP = [
  ...range(5).map(() => B({ PageValues: 10 })), ...range(5).map(() => B({})),
  ...range(10).map(() => ({ ExitRates: 0.9 })), ...range(20).map(() => ({})),
];
const PV = { f: 'PageValues', op: '>', v: 0 }, EXIT = { f: 'ExitRates', op: '>', v: 0.5 };
const OPTS = { minSupport: 0.125, smooth: 10, minLift: 2, connect: false, pairK: 4, proofZ: 0, carry: false, book: 5 };
const shopFrame = (d, rows) => O.frame(d, rows, () => 1, ['PageValues', 'ExitRates', 'Browser', 'Region']);

test('mine: an empty, buyerless or all-buyer frame is degenerate', () => {
  const d = parse([...SHOP, B({}), B({})]);
  assert.deepEqual(O.mine(d, shopFrame(d, range(40).slice(10)), null, [PV], OPTS), { base: 0, patterns: [], degenerate: true });
  assert.deepEqual(O.mine(d, shopFrame(d, [0, 1, 40]), null, [PV], OPTS), { base: 1, patterns: [], degenerate: true });
  assert.deepEqual(O.mine(d, shopFrame(d, []), null, [PV], OPTS), { base: 0, patterns: [], degenerate: true });
});

test('mine keeps the up and down patterns that clear the lift and the support, exactly at the bar', () => {
  const d = parse(SHOP), F = shopFrame(d, range(40));
  const book = O.mine(d, F, null, [EXIT, PV], OPTS);
  assert.equal(book.base, 0.25);
  assert.deepEqual(book.patterns, [
    { conds: [PV], up: true, rate: 0.5, lift: 2, support: 5, buys: 5, z: 3.75 / Math.sqrt(5 * 0.1875) },
    { conds: [EXIT], up: false, rate: 0.125, lift: 0.5, support: 10, buys: 0, z: -2.5 / Math.sqrt(10 * 0.1875) },
  ]);
  assert.deepEqual(O.mine(d, F, null, [EXIT, PV], { ...OPTS, minLift: 2.0000001 }).patterns, []);
  assert.deepEqual(O.mine(d, F, null, [EXIT, PV], { ...OPTS, minSupport: 0.2 }).patterns.map((p) => p.conds), [[EXIT]]);
  assert.deepEqual(O.mine(d, F, null, [EXIT, PV], { ...OPTS, minSupport: 0.25 }).patterns, [
    { conds: [EXIT], up: false, rate: 0.125, lift: 0.5, support: 10, buys: 0, z: -2.5 / Math.sqrt(10 * 0.1875) }]);
  assert.deepEqual(O.mine(d, F, null, [EXIT, PV], { ...OPTS, book: 1 }).patterns.map((p) => p.conds), [[PV]]);
  const none = O.mine(d, F, null, [{ f: 'PageValues', op: '>', v: 99 }], { ...OPTS, minSupport: 0 });
  assert.deepEqual(none.patterns, []);
});

// Region 2 holds every buyer (20 sessions, z 2.58); Browser 2 two of them (z 2.45, but the higher rate); Region 1 none
const REGIONS = [
  ...range(2).map(() => B({ Region: 2, Browser: 2 })), ...range(8).map(() => B({ Region: 2 })),
  ...range(10).map(() => ({ Region: 2 })), ...range(20).map(() => ({ Region: 1 })),
];
const BR2 = { f: 'Browser', op: '=', v: '2' }, R2 = { f: 'Region', op: '=', v: '2' }, R1 = { f: 'Region', op: '=', v: '1' };
const ROPTS = { ...OPTS, smooth: 1, minLift: 1.5, minSupport: 0.05 };

test('mine ranks by strength (|z|), then reads the kept book highest rate first', () => {
  const d = parse(REGIONS), F = shopFrame(d, range(40));
  assert.deepEqual(O.mine(d, F, null, [BR2, R2], { ...ROPTS, book: 1 }).patterns.map((p) => p.conds), [[R2]]);
  assert.deepEqual(O.mine(d, F, null, [BR2, R2], ROPTS).patterns.map((p) => p.conds), [[BR2], [R2]]);
});

test('mine with carry: each next pattern is found among the sessions the earlier ones left unexplained', () => {
  const d = parse(REGIONS), F = shopFrame(d, range(40));
  const carry = { ...ROPTS, carry: true };
  assert.deepEqual(O.mine(d, F, null, [BR2, R2], carry).patterns.map((p) => p.conds), [[R2]]);
  // Region 2 and Region 1 are exactly as strong: the earlier wins, and the order is the order they were found in
  const both = O.mine(d, F, null, [BR2, R2, R1], carry).patterns;
  assert.deepEqual(both.map((p) => p.conds), [[R2], [R1]]);
  assert.deepEqual(both.map((p) => p.up), [true, false]);
  assert.equal(both[1].rate, 0.25 / 21);
  assert.deepEqual(O.mine(d, F, null, [BR2, R1, R2], carry).patterns.map((p) => p.conds), [[R1], [R2]]);
  assert.deepEqual(O.mine(d, F, null, [BR2, R2, R1], { ...carry, book: 1 }).patterns.map((p) => p.conds), [[R2]]);
});

// eight buyers on a mid-valued page (5); a high-valued page (20) never buys; four buyers and four others leave fast
const BAND = [
  ...range(4).map(() => B({ PageValues: 5, ExitRates: 0.9 })), ...range(4).map(() => B({ PageValues: 5 })),
  ...range(8).map(() => ({ PageValues: 20 })), ...range(4).map(() => ({ ExitRates: 0.9 })), ...range(20).map(() => ({})),
];
const PV10 = { f: 'PageValues', op: '<=', v: 10 };

test('mine with connect: pairs of the strongest conditions, never two of the same measure', () => {
  const d = parse(BAND), F = shopFrame(d, range(40));
  const o = { ...OPTS, smooth: 1, minLift: 1.5, minSupport: 0.05, book: 1, connect: true };
  assert.deepEqual(O.mine(d, F, null, [PV, PV10, EXIT], { ...o, pairK: 3 }).patterns.map((p) => p.conds), [[PV, EXIT]]);
  assert.deepEqual(O.mine(d, F, null, [PV, PV10, EXIT], { ...o, pairK: 1 }).patterns.map((p) => p.conds), [[PV]]);
  assert.deepEqual(O.mine(d, F, null, [PV, PV10, EXIT], { ...o, connect: false }).patterns.map((p) => p.conds), [[PV]]);
  const all = O.mine(d, F, null, [PV, PV10, EXIT], { ...o, pairK: 3, book: 6 }).patterns;
  assert.deepEqual(all.map((p) => p.conds), [[PV, EXIT], [PV], [EXIT], [EXIT, PV10]]);
});

test('mine with prove: a pattern must hold on the proof slice, strictly beyond the base', () => {
  // the SHOP frame, plus ten proof sessions: four valued-page and four high-exit sessions (the first `buys` of each buy)
  const proofOf = (upBuys, downBuys) => [...range(4).map((k) => (k < upBuys ? B({ PageValues: 10 }) : { PageValues: 10 })),
    ...range(4).map((k) => (k < downBuys ? B({ ExitRates: 0.9 }) : { ExitRates: 0.9 })), B({}), {}];
  const run = (upBuys, downBuys, extra = {}) => {
    const d = parse([...SHOP, ...proofOf(upBuys, downBuys)]);
    return O.mine(d, shopFrame(d, range(40)), shopFrame(d, range(10).map((k) => 40 + k)), [EXIT, PV], { ...OPTS, ...extra }).patterns.map((p) => p.conds);
  };
  assert.deepEqual(run(2, 0), [[PV], [EXIT]]);
  assert.deepEqual(run(1, 0), [[EXIT]]);
  assert.deepEqual(run(2, 1), [[PV]]);
  assert.deepEqual(run(4, 0, { proofZ: 3 }), [[PV]]);
  const d = parse([...SHOP, B({}), {}]);
  assert.deepEqual(O.mine(d, shopFrame(d, range(40)), shopFrame(d, [40, 41]), [EXIT, PV], OPTS).patterns, []);
});

// ── the organ ───────────────────────────────────────────────────────────────────────────────────────────────────────
test('settings: the run element caps the grids; shape gates the shaped measures; the wiring by name', () => {
  const s = O.settings(O.STEM);
  assert.deepEqual([s.bins, s.book, s.pairK, s.minSupport, s.minLift, s.smooth, s.proofZ, s.halfLife, s.ownMin], [4, 6, 6, 0.01, 1.5, 10, 1.5, 4, 500]);
  assert.deepEqual(O.ELEMENTS.map((e) => s[e]), [true, true, true, true, true, true, true]);
  assert.equal(s.wiring, 'sum');
  assert.deepEqual(s.features, O.FEATURES);
  const h = O.settings(O.HAND);
  assert.deepEqual([h.bins, h.book, h.pairK], [10, 16, 12]);
  assert.deepEqual(O.ELEMENTS.filter((e) => h[e]), ['prove', 'own', 'shape', 'connect']);
  const plain = O.settings({ ...O.HAND, on: 0, wiring: 0, bins: 0 });
  assert.equal(plain.features.length, 16);
  assert.equal(plain.wiring, 'list');
  assert.equal(O.settings({ ...O.STEM, bins: 0 }).bins, 3);
  assert.deepEqual(O.settings({ ...O.HAND, on: O.onOf(['shape']), features: 1 | (1 << 16) }).features, ['Administrative', 'totalPages']);
  assert.deepEqual(O.elementsOf(O.HAND.on), ['prove', 'own', 'shape', 'connect']);
  assert.equal(O.STEM.features, 2 ** 21 - 1);
  assert.equal(O.onOf(['own', 'run']), 2 + 32);
});

// a plain organ: no elements, list wiring, 3 cuts, a 6-pattern book at lift 1.5, own books from 100 sessions (grid indices)
const LEAN = { ...O.HAND, on: 0, wiring: 0, bins: 0, book: 2, minSupport: 0, minLift: 2, smooth: 0, ownMin: 0 };

test('fit: one book for everyone; with own, a book per kind of visitor with enough sessions and some buyers', () => {
  const rows = [...range(100).map((k) => (k % 4 === 0 ? B({ VisitorType: 'New_Visitor', PageValues: k % 8 === 0 ? 5 : 0 }) : { VisitorType: 'New_Visitor' })),
    ...range(99).map((k) => (k % 3 === 0 ? B({ VisitorType: 'Other' }) : { VisitorType: 'Other' })),
    ...range(100).map((k) => (k % 5 === 0 ? B({ PageValues: 5 }) : { PageValues: k % 2 })), ...range(100).map(() => ({ Region: 3 }))];
  const d = parse(rows);
  const all = range(rows.length);
  const plain = O.fit(d, all, LEAN, 1);
  assert.equal(plain.wiring, 'list');
  assert.equal(plain.segments.size, 0);
  assert.equal(plain.global.base, 78 / 399);
  const own = O.fit(d, all, { ...LEAN, on: O.onOf(['own']) }, 1);
  assert.deepEqual([...own.segments.keys()], ['New_Visitor', 'Returning_Visitor']);
  assert.equal(own.segments.get('New_Visitor').base, 0.25);
  assert.equal(own.segments.get('Returning_Visitor').base, 0.1);
  assert.deepEqual(own.global, plain.global);
  // a visitor kind with enough sessions but no buyer gets no book of its own
  const lone = O.fit(d, [...range(100), ...range(100).map((k) => 299 + k)], { ...LEAN, on: O.onOf(['own']) }, 1);
  assert.deepEqual([...lone.segments.keys()], ['New_Visitor']);
  assert.deepEqual([...O.fit(d, all, { ...LEAN, on: O.onOf(['own']), ownMin: 1 }, 1).segments.keys()], []);
});

test('fit with remember: older months weigh less, halving every half-life', () => {
  const rows = [...range(4).map((k) => (k < 2 ? B({ Month: 'May' }) : { Month: 'May' })), ...range(4).map(() => ({ Month: 'Mar' }))];
  const d = parse(rows);
  assert.equal(O.fit(d, range(8), LEAN, 1).global.base, 0.25);
  assert.equal(O.fit(d, range(8), { ...LEAN, on: O.onOf(['remember']), halfLife: 0 }, 1).global.base, 2 / 5);
  assert.equal(O.fit(d, range(8), { ...LEAN, on: O.onOf(['remember']), halfLife: 1 }, 1).global.base, 2 / 6);
});

test('fit with prove: the book is mined on two thirds and proven on the third held back', () => {
  const d = parse(world(240, 3)), rows = range(240);
  const g = { ...O.STEM, on: O.onOf(['prove']), wiring: 0 };
  const proven = O.fit(d, rows, g, 4), loose = O.fit(d, rows, { ...g, on: 0 }, 4);
  const part = O.split(d, rows, 1 / 3, 4);
  const rest = O.fit(d, part.rest, { ...g, on: 0 }, 4);
  assert.equal(proven.global.base, rest.global.base);
  assert.notEqual(proven.global.base, loose.global.base);
  assert.ok(proven.global.patterns.length < rest.global.patterns.length);
  assert.deepEqual(proven.global.patterns, rest.global.patterns.filter((p) => proven.global.patterns.some((q) => q.z === p.z)));
});

test('score: list reads the first pattern that fires; sum and mean add log-lifts, shifted to the visitor book', () => {
  const d = parse([{ PageValues: 5 }, { PageValues: 5, ExitRates: 0.9 }, {}, { VisitorType: 'New_Visitor', PageValues: 5 }, { VisitorType: 'New_Visitor' }]);
  const upP = { conds: [PV], up: true, rate: 0.6, lift: 3 }, downP = { conds: [EXIT], up: false, rate: 0.05, lift: 0.25 };
  const global = { base: 0.2, patterns: [upP, downP] }, fresh = { base: 0.4, patterns: [{ ...upP, rate: 0.8, lift: 2 }] };
  const scores = (wiring) => range(5).map((i) => O.score({ wiring, global, segments: new Map([['New_Visitor', fresh]]) }, d, i));
  assert.deepEqual(scores('list'), [0.6, 0.6, 0.2, 0.8, 0.4]);
  assert.deepEqual(scores('sum'), [Math.log(3), Math.log(3) + Math.log(0.25), 0, Math.log(2) + Math.log(2), Math.log(2)]);
  assert.deepEqual(scores('mean'), [Math.log(3), (Math.log(3) + Math.log(0.25)) / 2, 0, Math.log(2) + Math.log(2), Math.log(2)]);
});

// ── grading ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('auc: the chance a buyer outranks a non-buyer, ties counting half; one class alone is 0.5', () => {
  assert.equal(O.auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]), 0.75);
  assert.equal(O.auc([0, 1, 1], [0, 1, 0]), 0.75);
  assert.equal(O.auc([1, 1, 1, 1], [0, 1, 0, 1]), 0.5);
  assert.equal(O.auc([0.9, 0.1], [0, 1]), 0);
  assert.equal(O.auc([1, 2], [1, 1]), 0.5);
  assert.equal(O.auc([1, 2], [0, 0]), 0.5);
  assert.deepEqual(O.ranker([3, 1, 3, 2]), [[1], [3], [0, 2]]);
  assert.equal(O.aucOf(O.ranker([0.1, 0.5, 0.9]), [1, 0, 1], [2, 1, 1]), 1 / 3);
  assert.equal(O.aucOf(O.ranker([0.1, 0.5, 0.9]), [1, 0, 1], [0, 1, 1]), 1);
});

test('topTenth: the share of all buyers in the top tenth by score, ties broken by session order', () => {
  const y = range(20).map((i) => Number(i === 2 || i === 5));
  assert.equal(O.topTenth([5, 5, 5, ...range(17)], y), 0);
  assert.equal(O.topTenth(range(20), range(20).map((i) => Number(i === 19 || i === 0))), 0.5);
  assert.equal(O.topTenth(range(21), range(21).map((i) => Number(i >= 18))), 1);
  assert.equal(O.topTenth(range(20), range(20).map(() => 0)), 0);
});

test('bootstrap: a paired resampling of the AUC difference, the same every time', () => {
  const a = [0.1, 0.4, 0.35, 0.8, 0.3, 0.2], b = [0.8, 0.35, 0.4, 0.1, 0.2, 0.3], y = [0, 0, 1, 1, 1, 0];
  assert.deepEqual(O.bootstrap(a, a, y, 50, 3), { lo: 0, hi: 0 });
  const s = O.bootstrap(a, b, y, 40, 3);
  assert.deepEqual(s, O.bootstrap(a, b, y, 40, 3));
  assert.ok(s.lo <= s.hi);
  assert.deepEqual(s, BOOT);
  assert.notDeepEqual(O.bootstrap(a, b, y, 40, 4), s);
});

// ── the organ looks at itself ───────────────────────────────────────────────────────────────────────────────────────
test('selfLook: the buyers its own book missed, and the unread measure that best tells them apart', () => {
  const rows = [...range(4).map(() => B({ PageValues: 10 })), ...range(4).map(() => B({ Administrative: 5 })), B({ VisitorType: 'New_Visitor', PageValues: 10 }),
    ...range(8).map(() => ({})), ...range(4).map(() => ({ PageValues: 10 }))];
  const d = parse(rows);
  // reads every raw measure but Administrative; shaped measures are off; Administrative and totalPages split alike
  const genome = { ...LEAN, features: (2 ** 16 - 1) & ~1 };
  const organ = { genome, global: { base: 0.4, patterns: [{ conds: [PV], up: true }, { conds: [{ f: 'ExitRates', op: '<=', v: 1 }], up: false }] }, segments: new Map([['New_Visitor', { base: 0.5, patterns: [] }]]) };
  assert.deepEqual(O.selfLook(organ, d, range(21)), { missed: 5, suggest: 0 });
  const all = { ...organ, global: { base: 0.4, patterns: [{ conds: [], up: true }] }, segments: new Map() };
  assert.deepEqual(O.selfLook(all, d, range(21)), { missed: 0, suggest: -1 });
  assert.deepEqual(O.selfLook({ ...organ, genome: { ...genome, features: 2 ** 21 - 1, on: O.onOf(['shape']) } }, d, range(21)), { missed: 5, suggest: -1 });
  // the missed buyers are told apart from the NON-buyers, not from the other buyers: Informational marks every missed
  // buyer and every non-buyer alike (no use), Administrative marks the missed ones and the found ones, never a non-buyer
  const rows2 = [...range(4).map(() => B({ PageValues: 10, Administrative: 5 })), ...range(4).map(() => B({ Administrative: 5, Informational: 3 })),
    ...range(8).map(() => ({ Informational: 3 }))];
  const d2 = parse(rows2);
  const organ2 = { genome: { ...LEAN, features: (2 ** 16 - 1) & ~1 & ~4 }, global: { base: 0.5, patterns: [{ conds: [PV], up: true }] }, segments: new Map() };
  assert.deepEqual(O.selfLook(organ2, d2, range(16)), { missed: 4, suggest: 0 });
});

test('assess: the inner AUC of the organ fit on the rest; the self-look only when asked', () => {
  const d = parse(world(240, 5)), inner = O.split(d, range(240), 1 / 3, 2);
  const organ = O.fit(d, inner.rest, O.HAND, 2);
  const a = O.assess(d, inner, O.HAND, 2, false);
  assert.deepEqual(a, { fitness: O.auc(inner.held.map((i) => O.score(organ, d, i)), inner.held.map((i) => d.y[i])) });
  assert.ok(a.fitness > 0.6);
  assert.deepEqual(O.assess(d, inner, O.HAND, 2, true), { ...a, look: O.selfLook(organ, d, inner.rest) });
});

// ── genomes ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('randomGenome and withParams draw every gene inside its grid', () => {
  const r = O.rng(5);
  const many = range(3000).map(() => O.randomGenome(r));
  const span = (k) => [Math.min(...many.map((g) => g[k])), Math.max(...many.map((g) => g[k]))];
  assert.deepEqual(span('on'), [0, 127]);
  assert.deepEqual(span('wiring'), [0, 2]);
  for (const p of O.PARAMS) assert.deepEqual(span(p), [0, O.GRID[p].length - 1]);
  assert.ok(span('features')[1] < 2 ** 21);
  assert.deepEqual(O.randomGenome(O.rng(9)), GENOME9);
  const w = O.withParams(O.HAND, O.rng(9));
  assert.deepEqual([w.on, w.wiring, w.features], [O.HAND.on, O.HAND.wiring, O.HAND.features]);
  assert.deepEqual(O.PARAMS.map((p) => w[p]), WITH9);
});

test('cross takes each gene, and each bit of the switches, from one parent by a coin', () => {
  const zero = Object.fromEntries(O.PARAMS.map((p) => [p, 0])), top = Object.fromEntries(O.PARAMS.map((p) => [p, O.GRID[p].length - 1]));
  const a = { on: 0b1010101, wiring: 0, features: 0, ...zero }, b = { on: 0b0101010, wiring: 2, features: 2 ** 21 - 1, ...top };
  const g = O.cross(a, b, seq(0, 0.9));
  assert.equal(g.on, 127);
  assert.equal(g.wiring, 2);
  assert.equal(g.features, 0xAAAAA);
  assert.deepEqual(O.PARAMS.map((p) => g[p]), O.PARAMS.map((p, k) => (k % 2 === 0 ? top[p] : 0)));
  assert.deepEqual(O.cross(a, b, () => 0), a);
  assert.deepEqual(O.cross(a, b, () => 0.5), b);
});

test('mutate changes exactly one slot: an element, the wiring, a measure, or one step of a parameter', () => {
  const at = (s) => (s + 0.5) / O.SLOTS;
  const g = { ...O.HAND, on: 0, wiring: 0, features: 0, bins: 1, book: 0, ownMin: 5 };
  assert.equal(O.SLOTS, 38);
  assert.equal(O.mutate(g, seq(at(0))).on, 1);
  assert.equal(O.mutate(g, seq(at(6))).on, 64);
  assert.deepEqual(O.mutate(g, seq(at(7), 0)), { ...g, wiring: 1 });
  assert.deepEqual(O.mutate(g, seq(at(7), 0.9)), { ...g, wiring: 2 });
  assert.deepEqual(O.mutate({ ...g, wiring: 2 }, seq(at(7), 0)), { ...g, wiring: 0 });
  assert.deepEqual(O.mutate(g, seq(at(8))), { ...g, features: 1 });
  assert.deepEqual(O.mutate(g, seq(at(28))), { ...g, features: 2 ** 20 });
  assert.deepEqual(O.mutate(g, seq(at(29), 0)), { ...g, bins: 0 });
  assert.deepEqual(O.mutate(g, seq(at(29), 0.9)), { ...g, bins: 2 });
  assert.deepEqual(O.mutate(g, seq(at(30), 0)), { ...g, book: 1 });
  assert.deepEqual(O.mutate(g, seq(at(37), 0.9)), { ...g, ownMin: 4 });
  assert.deepEqual(O.mutate(g, seq(at(37), 0)), { ...g, ownMin: 4 });
  assert.deepEqual(O.mutate({ ...g, ownMin: 4 }, seq(at(37), 0.9)), { ...g, ownMin: 5 });
});

test('observe switches on the measure its look suggested (and shape for a shaped one), else mutates blind', () => {
  const g = { ...O.HAND, on: 0, features: 0 };
  assert.deepEqual(O.observe(g, { suggest: 0 }, seq(0)), { ...g, features: 1 });
  assert.deepEqual(O.observe(g, { suggest: 16 }, seq(0)), { ...g, features: 2 ** 16, on: 4 });
  assert.deepEqual(O.observe({ ...g, features: 1 }, { suggest: 0 }, seq(0)), { ...g, features: 1 });
  assert.deepEqual(O.observe(g, { suggest: -1 }, seq(0.5 / O.SLOTS)), O.mutate(g, seq(0.5 / O.SLOTS)));
  assert.equal(O.keyOf(O.STEM), '127.1.2097151.4.4.2.2.3.3.2.3.2');
});

// ── the arms ────────────────────────────────────────────────────────────────────────────────────────────────────────
test('better: the fitter, or on a tie the earlier born; the budget counts every evaluation', () => {
  assert.equal(O.better({ fitness: 0.7, n: 3 }, { fitness: 0.6, n: 1 }), true);
  assert.equal(O.better({ fitness: 0.6, n: 1 }, { fitness: 0.7, n: 3 }), false);
  assert.equal(O.better({ fitness: 0.6, n: 1 }, { fitness: 0.6, n: 3 }), true);
  assert.equal(O.better({ fitness: 0.6, n: 3 }, { fitness: 0.6, n: 1 }), false);
  assert.equal(O.better({ fitness: 0.6, n: 3 }, { fitness: 0.6, n: 3 }), false);
  assert.equal(O.budgetOf({ population: 24, elites: 4, generations: 16 }), 324);
  assert.equal(O.budgetOf(TINY), 10);
});

test('grow: the stem and its differentiations, bred and selected within the budget, the same every time', () => {
  const d = parse(world(240, 1)), inner = O.split(d, range(240), 1 / 3, 1);
  let ticks = 0;
  const g = O.grow(d, inner, 1, TINY, () => { ticks += 1; });
  assert.equal(ticks, 10);
  assert.equal(g.evals, 10);
  assert.equal(g.history.length, 3);
  assert.ok(g.history.every((v, k) => k === 0 || v >= g.history[k - 1]));
  assert.equal(g.champion.fitness, g.history[2]);
  assert.deepEqual(O.grow(d, inner, 1, TINY), g);
  assert.notDeepEqual(O.grow(d, inner, 2, TINY).history, g.history);
  assert.deepEqual([O.keyOf(g.champion.g), g.champion.n], GROWN1);
});

test('search: the first genome, then the drawn ones, within the budget; a tie keeps the earlier', () => {
  const d = parse(world(240, 1)), inner = O.split(d, range(240), 1 / 3, 1);
  const flat = { ...LEAN, features: 0 };
  let ticks = 0;
  const s = O.search(d, inner, 1, TINY, flat, () => ({ ...flat, wiring: 1 }), () => { ticks += 1; });
  assert.equal(ticks, 10);
  assert.deepEqual([s.evals, s.champion.n, s.champion.fitness, s.champion.g], [10, 0, 0.5, flat]);
  const h = O.search(d, inner, 1, TINY, O.HAND, (r) => O.withParams(O.HAND, r));
  assert.equal(h.champion.fitness, Math.max(...HANDS));
  assert.deepEqual(O.search(d, inner, 1, TINY, O.HAND, (r) => O.withParams(O.HAND, r)), h);
});

// ── reading ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test('describe: conditions, books and organs in plain words', () => {
  assert.equal(O.describeCondition(PV), 'PageValues > 0');
  assert.equal(O.describeCondition({ f: 'ExitRates', op: '<=', v: 0.123456 }), 'ExitRates ≤ 0.1235');
  assert.equal(O.describeCondition({ f: 'VisitorType', op: '=', v: 'New_Visitor' }), 'VisitorType = New_Visitor');
  assert.deepEqual(O.describeBook({ patterns: [{ conds: [PV, EXIT], rate: 0.51234, lift: 2.0456 }] }), [{ when: 'PageValues > 0 and ExitRates > 0.5', bought: 51.2, lift: 2.05 }]);
  const d = parse(SHOP);
  const organ = O.fit(d, range(40), { ...LEAN, on: O.onOf(['own', 'run']), book: 1, minSupport: 3, smooth: 3 }, 1);
  assert.deepEqual(O.describeOrgan(organ), {
    elements: ['own', 'run'], wiring: 'list', measures: 16,
    settings: { bins: 3, book: 4, minSupport: 0.02, minLift: 1.5, smooth: 10, pairK: 6, proofZ: 1.5, halfLife: 6, ownMin: 100 },
    books: [{ who: 'everyone', base: 25, patterns: [{ when: 'PageValues > 0', bought: 50, lift: 2 }, { when: 'PageValues ≤ 0', bought: 16.7, lift: 0.67 }, { when: 'ExitRates > 0.1', bought: 12.5, lift: 0.5 }] }],
  });
});

// ── one seed, the whole experiment ──────────────────────────────────────────────────────────────────────────────────
test('checkConfig: whole numbers, at least one, fewer elites than the population', () => {
  assert.equal(O.checkConfig(TINY), null);
  assert.equal(O.checkConfig({ population: 2, elites: 1, generations: 1, resamples: 1 }), null);
  assert.equal(O.checkConfig(null), 'the configuration must be an object');
  assert.equal(O.checkConfig(7), 'the configuration must be an object');
  assert.equal(O.checkConfig({ ...TINY, population: 0 }), 'population must be a whole number ≥ 1');
  assert.equal(O.checkConfig({ ...TINY, generations: 1.5 }), 'generations must be a whole number ≥ 1');
  assert.equal(O.checkConfig({ ...TINY, resamples: undefined }), 'resamples must be a whole number ≥ 1');
  assert.equal(O.checkConfig({ ...TINY, elites: 4 }), 'elites must be fewer than the population');
});

test('runSeed: three arms on one split, each champion refit on all training months and graded once on the held-out months', () => {
  const d = parse(world(300, 2));
  let ticks = 0;
  const s = O.runSeed(d, 1, TINY, () => { ticks += 1; });
  assert.equal(ticks, 30);
  assert.equal(s.seed, 1);
  assert.deepEqual(Object.keys(s.arms), ['grown', 'hand', 'random']);
  for (const arm of Object.values(s.arms)) {
    assert.equal(arm.evals, 10);
    assert.ok(arm.heldAuc > 0 && arm.heldAuc < 1);
    assert.ok(arm.topTenth >= 0 && arm.topTenth <= 1);
    assert.equal(typeof arm.champion, 'string');
    assert.ok(Array.isArray(arm.organ.books));
  }
  assert.equal(s.arms.grown.history.length, 3);
  assert.equal(s.arms.hand.history, undefined);
  assert.equal(s.grownMinusHand.auc, Math.round((s.arms.grown.heldAuc - s.arms.hand.heldAuc) * 1e6) / 1e6);
  assert.ok(s.grownMinusHand.lo <= s.grownMinusHand.hi);
  // the hand-built champion, refit on every training session and graded on the held-out ones, by hand
  const train = O.rowsIn(d, O.TRAIN_MONTHS), held = O.rowsIn(d, O.HELD_MONTHS);
  const handGenome = O.search(d, O.split(d, train, 1 / 3, 1), 1, TINY, O.HAND, (r) => O.withParams(O.HAND, r)).champion.g;
  const organ = O.fit(d, train, handGenome, 1);
  assert.equal(s.arms.hand.heldAuc, Math.round(O.auc(held.map((i) => O.score(organ, d, i)), held.map((i) => d.y[i])) * 1e6) / 1e6);
  assert.equal(s.arms.hand.champion, O.keyOf(handGenome));
  assert.deepEqual(s.arms.hand.organ, O.describeOrgan(organ));
  assert.deepEqual(O.runSeed(d, 1, TINY), s);
  assert.deepEqual(RUN1, [s.arms.grown.heldAuc, s.arms.hand.heldAuc, s.arms.random.heldAuc, s.grownMinusHand.lo, s.grownMinusHand.hi]);
});

test('reference and experiment: the one-measure baseline; garbage in is refused, never thrown', () => {
  const text = csv(world(300, 2)), d = O.parseSessions(text);
  const held = O.rowsIn(d, O.HELD_MONTHS);
  assert.deepEqual(O.reference(d), { measure: 'PageValues', heldAuc: Math.round(O.auc(held.map((i) => d.cols.PageValues[i]), held.map((i) => d.y[i])) * 1e6) / 1e6 });
  assert.deepEqual(O.experiment(5, [1], TINY), { ok: false, error: 'the sessions must be CSV text' });
  assert.deepEqual(O.experiment(text, [1], { ...TINY, elites: 9 }), { ok: false, error: 'elites must be fewer than the population' });
  for (const seeds of ['1', [], [0], [1.5], [1, -2]]) assert.deepEqual(O.experiment(text, seeds, TINY), { ok: false, error: 'seeds must be whole numbers ≥ 1' });
  const noHeld = csv(world(60, 2).filter((r) => r.Month !== 'Nov' && r.Month !== 'Dec'));
  assert.deepEqual(O.experiment(noHeld, [1], TINY), { ok: false, error: 'need sessions in both the training and the held-out months' });
  const noTrain = csv(world(60, 2).map((r) => ({ ...r, Month: 'Nov' })));
  assert.deepEqual(O.experiment(noTrain, [1], TINY), { ok: false, error: 'need sessions in both the training and the held-out months' });
  const e = O.experiment(text, [1], TINY);
  assert.deepEqual(e, { ok: true, sessions: 300, budget: 10, reference: O.reference(d), seeds: [O.runSeed(d, 1, TINY)] });
});

