# pattern-organs — specification

## Purpose

Pattern organs: a funnel organ grown from a stem cluster of seven elements, against the same organ built by hand, on two held-out months of real shop sessions — sealed first, re-runnable in the browser.

## Contract

- **assess** — part of the pattern-organs public surface; deterministic, total (never throws).
- **auc** — part of the pattern-organs public surface; deterministic, total (never throws).
- **aucOf** — part of the pattern-organs public surface; deterministic, total (never throws).
- **better** — part of the pattern-organs public surface; deterministic, total (never throws).
- **bootstrap** — part of the pattern-organs public surface; deterministic, total (never throws).
- **budgetOf** — part of the pattern-organs public surface; deterministic, total (never throws).
- **checkConfig** — part of the pattern-organs public surface; deterministic, total (never throws).
- **coin** — part of the pattern-organs public surface; deterministic, total (never throws).
- **condMask** — part of the pattern-organs public surface; deterministic, total (never throws).
- **conditions** — part of the pattern-organs public surface; deterministic, total (never throws).
- **cross** — part of the pattern-organs public surface; deterministic, total (never throws).
- **describeBook** — part of the pattern-organs public surface; deterministic, total (never throws).
- **describeCondition** — part of the pattern-organs public surface; deterministic, total (never throws).
- **describeOrgan** — part of the pattern-organs public surface; deterministic, total (never throws).
- **draw** — part of the pattern-organs public surface; deterministic, total (never throws).
- **elementsOf** — part of the pattern-organs public surface; deterministic, total (never throws).
- **experiment** — part of the pattern-organs public surface; deterministic, total (never throws).
- **fires** — part of the pattern-organs public surface; deterministic, total (never throws).
- **fit** — part of the pattern-organs public surface; deterministic, total (never throws).
- **frame** — part of the pattern-organs public surface; deterministic, total (never throws).
- **grow** — part of the pattern-organs public surface; deterministic, total (never throws).
- **holds** — part of the pattern-organs public surface; deterministic, total (never throws).
- **keyOf** — part of the pattern-organs public surface; deterministic, total (never throws).
- **mine** — part of the pattern-organs public surface; deterministic, total (never throws).
- **mutate** — part of the pattern-organs public surface; deterministic, total (never throws).
- **observe** — part of the pattern-organs public surface; deterministic, total (never throws).
- **onOf** — part of the pattern-organs public surface; deterministic, total (never throws).
- **parseSessions** — part of the pattern-organs public surface; deterministic, total (never throws).
- **popcount** — part of the pattern-organs public surface; deterministic, total (never throws).
- **randomGenome** — part of the pattern-organs public surface; deterministic, total (never throws).
- **ranker** — part of the pattern-organs public surface; deterministic, total (never throws).
- **reference** — part of the pattern-organs public surface; deterministic, total (never throws).
- **rng** — part of the pattern-organs public surface; deterministic, total (never throws).
- **rowsIn** — part of the pattern-organs public surface; deterministic, total (never throws).
- **runSeed** — part of the pattern-organs public surface; deterministic, total (never throws).
- **score** — part of the pattern-organs public surface; deterministic, total (never throws).
- **search** — part of the pattern-organs public surface; deterministic, total (never throws).
- **selfLook** — part of the pattern-organs public surface; deterministic, total (never throws).
- **settings** — part of the pattern-organs public surface; deterministic, total (never throws).
- **split** — part of the pattern-organs public surface; deterministic, total (never throws).
- **topTenth** — part of the pattern-organs public surface; deterministic, total (never throws).
- **weigh** — part of the pattern-organs public surface; deterministic, total (never throws).
- **wilson** — part of the pattern-organs public surface; deterministic, total (never throws).
- **withParams** — part of the pattern-organs public surface; deterministic, total (never throws).

## Guarantees

- **Deterministic** — the same input yields the same output on any machine, any run.
- **Total** — hostile or malformed input returns a defined value, never an exception.
- **Zero-dependency** — no third-party runtime code inside the trust boundary.

## Verification

The suite exercises the public surface directly and is mutation-checked: a change to any guarded line makes a
test fail. konomify admits pattern-organs only when both the structure rubric (acg-assessor) and the behaviour gate
(witness) pass.
