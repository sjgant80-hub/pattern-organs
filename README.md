# Pattern Organs

**Live: https://sjgant80-hub.github.io/pattern-organs/**

A funnel pattern organ **grown** from a stem cluster of seven elements, against the same organ **built by hand**: the same 12,330 real shop sessions, the same budget, and two months of sessions neither ever saw. Sealed before any organ was graded; re-runnable in your browser and on CI.

## The result

Sealed, being measured. The rules, the split, the budget and the sha256 of the sessions and the kernel were committed before any organ was graded on the real sessions; the result lands here whichever way it goes.

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
