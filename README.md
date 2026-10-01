# Pattern Organs

**Live: https://sjgant80-hub.github.io/pattern-organs/**

A funnel pattern organ **grown** from a stem cluster of seven elements, against the same organ **built by hand**: the same 12,330 real shop sessions, the same budget, and two months of sessions neither ever saw. Sealed before any organ was graded; re-runnable in your browser and on CI.

## The result

6 of 6 sealed rules held. Over 5 seeds, the grown organ's median held-out AUC was 0.826, the hand-built organ's 0.823, the random arm's 0.816, and PageValues alone 0.807. The grown organ was ahead of the hand-built one in 5 of 5 seeds; the bootstrap called it sure in 3.

| Sealed rule | Result | | Predicted |
|---|---|---|---|
| the grown organ's median held-out AUC over the five seeds is higher than the hand-built organ's | median held-out AUC 0.826104 grown vs 0.822631 hand-built | PASS | fail, narrowly — the hand design is a strong prior and 324 evaluations is little for a search over 18 genes; within 0.01 AUC either way |
| the grown organ beats the hand-built one on held-out AUC in at least 4 of the 5 seeds | grown ahead in 5 of 5 seeds | PASS | fail |
| in at least 3 of the 5 seeds the bootstrap lower bound of grown minus hand-built is above 0 | bootstrap lower bound above 0 in 3 of 5 seeds | PASS | fail — the two will be too close for the bootstrap to call |
| the grown organ's median held-out AUC is higher than the random arm's | median held-out AUC 0.826104 grown vs 0.815975 random | PASS | pass — selection should beat drawing blind with the same budget |
| the grown organ's median held-out AUC is higher than ranking the held-out sessions by PageValues alone | median grown 0.826104 vs PageValues alone 0.806814 | PASS | pass — PageValues alone near 0.80–0.88; the organs near 0.86–0.92 |
| re-running every seed from this seal gives an identical record — CI re-runs it on every push | CI re-runs every seed from the seal and compares the record | PASS | pass |

| Seed | Grown | Hand-built | Random | Grown − hand (95% interval) |
|---|---|---|---|---|
| 1 | 0.823 | 0.823 | 0.819 | +0.001 (−0.010 to +0.013) |
| 2 | 0.819 | 0.810 | 0.816 | +0.010 (+0.001 to +0.019) |
| 3 | 0.827 | 0.823 | 0.807 | +0.004 (−0.003 to +0.010) |
| 4 | 0.826 | 0.815 | 0.828 | +0.012 (+0.004 to +0.020) |
| 5 | 0.839 | 0.823 | 0.806 | +0.015 (+0.008 to +0.022) |

Held-out AUC on November and December. PageValues alone: 0.807.

## What it is

- `organ.mjs` — the kernel: a pattern organ (a book of one- and two-condition patterns, scored by list, sum or mean), the seven elements as switches (prove, own, shape, carry, remember, run, connect), the stem and the hand-built design, the three arms (grown, hand-built, random), AUC and a paired bootstrap. Pure and deterministic; the checked entry point `experiment()` returns `{ok:false}` on garbage, never throws.
- `tools/seal.mjs` — the pre-registration (`data/prereg.json`), committed and pushed before the run.
- `tools/run.mjs` — the sealed run (`--run`), its re-run (`--verify`) and its grade.
- `tools/make-page.mjs` — this README, `index.html` and `llms.txt`, generated from the seal and the record.

## Verify

```bash
node --test                       # the kernel's tests (made-up sessions only)
node tools/seal.mjs --check       # the seal matches the committed sessions, kernel and runner
node tools/run.mjs --verify       # re-run all five seeds and compare the record
```

CI runs all three on every push, plus the mutation gate (witness) on `organ.mjs`, and regenerates this README and the page and fails on any difference.

## Credits

- Sessions: Online Shoppers Purchasing Intention Dataset — C. Sakar and Y. Kastro, UCI Machine Learning Repository (2018), DOI 10.24432/C5F88Q, CC BY 4.0. Introduced in Sakar, Polat, Katircioglu and Kastro, "Real-time prediction of online shoppers' purchasing intention using multilayer perceptron and LSTM recurrent neural networks", Neural Computing & Applications (2019).
- The seven elements are the stages of the estate's capability router, whose basis is Thomas Frumkin's MACCubeFACE lattice. Powered by the Konomi architecture, created by Thomas Frumkin.
- Code: MIT. The sessions file keeps its own licence (CC BY 4.0).
