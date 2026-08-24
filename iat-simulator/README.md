# IAT Battery — DRC National Identity Study

Browser implementation of two Single-Category-style two-target IATs that share
one engine. Standard 7-block improved procedure, 200 trials each (~7–8 min).

Open `index.html` — no build step, no server, works offline.

```
index.html      setup: instrument, respondent ID, arm, seed, options
iat.html        the task (+ safety gate for gated instruments)
results.html    D-score, diagnostics, JSON/CSV export
js/config.js    instruments, stimuli, timing, block structure, locked decisions
js/engine.js    instrument-agnostic trial generation + sequencing
js/scoring.js   Greenwald improved D, generic sign convention
js/validation.js  pre-field stimulus checks, surfaced at setup
js/storage.js   localStorage persistence + export
js/ui.js        DOM rendering, safety gate, keyboard + touch input
test/test.js    90 assertions — `node test/test.js`
assets/         stimulus files (see assets/README.md)
```

## The two instruments

| | IAT #1 | IAT #2 |
|---|---|---|
| id | `national_regional` | `banyarwanda_bias` |
| targetA (D>0 pole) | Congo (national) | autochthonous ("us") |
| targetB | Kivu (regional) | Banyarwanda ("them") |
| stimuli | 2 image + 2 audio / side | 6 audio names / side |
| safety gate | no | **yes — hard gate** |
| D>0 means | stronger national identity | favourability toward "us" (relative anti-Banyarwanda bias) |

---

## Locked decisions (pre-registration commitments)

### Generic sign convention

Each instrument names a `targetA` (positive-D pole) and `targetB`:

```
D = ( mean RT[targetB + Good] − mean RT[targetA + Good] ) / SD_pooled
D > 0  =  targetA + Good is faster
```

**Scoring keys on pairing type, not presentation position.** The spec defines
D as "Block 7 minus Block 4", but under counterbalancing *Block 4 is a
different pairing per arm* — scoring by block number silently flips the sign
for half the sample. Every trial carries a `pairing` field
(`<targetKey>_good`) and the D computation reads that. `test/test.js` asserts
both arms return an identical D for the same simulated respondent, **for both
instruments**. This is the single most common IAT analysis error and it is
structurally foreclosed.

**IAT #2 sign — chosen, confirm before pre-registration.** targetA is the
autochthonous reference, so D > 0 = "us + Good" faster = relative
anti-Banyarwanda bias. This is the natural direction but it is a researcher's
call; flip `targetA`/`targetB` in `config.js` to reverse it. One line.

### Attribute assignment is fixed

GOOD is pinned to the left key, BAD to the right, for the whole task; only the
*target* assignment reverses between phases. This is what makes the pairing
label unambiguous.

### Error handling — `penalty`

Error latencies are replaced with the block's correct-trial mean + 600ms. The
alternative (enforced correction) is Greenwald's nominal recommendation and is
psychometrically comparable. We deviate deliberately: enforced correction lets
a confused respondent stall on a screen until they guess right, inviting
enumerator intervention that destroys the privacy justifying an implicit
measure — and it makes duration variable against a fixed survey budget. Cost
accepted: errors concentrate in the incompatible block, so the imputation does
real work in the numerator. Pre-register it explicitly.

### Trial-level trimming — off

`dropFastTrials: false`. The improved D algorithm does not trim the lower tail
at the trial level; fast responding is a *subject-level* exclusion (>10% of
trials under 300ms).

### Modality balance (IAT #1)

Each target category holds exactly 2 image + 2 audio. An imbalance leaks
modality into D as *bias*, which no sample size corrects. Asserted in tests,
including across the conditional-Kiswahili swap.

---

## Safety gate (IAT #2)

IAT #2 is `safetyGated: true`. Before the engine deals a single trial the task
shows a gate requiring three attestations:

1. Raul / Marakuja security sign-off obtained for this village-tier;
2. the immediate setting has been assessed and is safe now;
3. the respondent has voluntarily agreed and may stop at any time.

"Begin" stays disabled until all three are checked. A **Skip this IAT** button
records `skipped: true` with a reason and no trials. The setup page also shows
a standing safety banner for gated instruments.

This is a procedural safeguard in software; it does not substitute for the
actual sign-off. Faces were rejected at the spec level (phenotype sorting
reproduces the region's genocide ideology) and are not implementable here.

---

## Open, not yet locked

- **IAT #1 Kiswahili stimulus** (`dropConditionalSwahili`, setup toggle).
  Drop when IAT #2 is fielded (name/language salience in both →
  cross-priming); arguably drop regardless, since every attribute trial is
  already Swahili audio. Swaps in `Mashariki`, preserving modality balance.
- **IAT #2 name validation** — gender balance, the Ingabire public-figure
  collision, Zawadi/Nabintu autochthony, and the balanced-"us" own-group
  confound. All surfaced at setup via `js/validation.js`; see
  `assets/README.md`.
- **IAT #2 on-screen category labels** — working placeholders pending the
  safety review and a translator.
- **Audio vs. image RT** (IAT #1) — audio carries a duration, images do not,
  so audio RT runs longer. This is a *reliability* cost (within-subject
  noise, attenuating exposure→D), not bias. At N = 1500–1800 the resulting
  MDE stays near 0.06 D units, well under the 0.15 "small" line, so the mixed
  modality is affordable — **keep it**. Protect the balance, not the noise.
  The results page reports the observed audio−image gap and flags >150ms.
- **Block 5 length** (`block5Trials`, setup dropdown) — 40 (200 total) or 20
  (180 total). First and only trim lever.

---

## Reproducibility & data

Trial order comes from a seeded RNG (mulberry32); the seed and arm are stored
and exported, so any respondent's exact sequence regenerates.

Trial-level CSV columns:

```
resp_id · instrument_id · order_arm · seed · block · block_fn · is_test ·
pairing · trial_no · stimulus · stim_modality · category · response_key ·
correct · rt_ms
```

Both `primary` (test blocks only) and `robustness` (practice + test) D
estimates are computed and shown.

## Current limitation

Data is local-only — trials persist to `localStorage` and export as JSON/CSV
by hand. No backend, nothing transmitted. Fielding needs enumerator-side
export per session or a sync layer.
