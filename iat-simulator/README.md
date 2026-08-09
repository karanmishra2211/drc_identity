# IAT #1 — National vs. Regional Identity

Browser implementation of the instrument spec v1.0. Two-target IAT, standard
7-block improved procedure, 200 trials (~7–8 min).

Open `index.html` — no build step, no server, works offline.

```
index.html      setup: respondent ID, arm, seed, instrument options
iat.html        the task
results.html    D-score, diagnostics, JSON/CSV export
js/config.js    stimuli, timing, block structure, locked decisions
js/engine.js    seeded trial generation, block sequencing, trial flow
js/scoring.js   Greenwald improved D
js/storage.js   localStorage persistence + export
js/ui.js        DOM rendering, keyboard + touch input
test/test.js    55 assertions — `node test/test.js`
assets/         stimulus files (see assets/README.md)
```

---

## Locked decisions

These are pre-registration commitments. Changing one means re-registering.

### Sign convention

```
D = ( mean RT[Regional+Good] − mean RT[National+Good] ) / SD_pooled

D > 0  =  faster when National + Good share a key
       =  stronger implicit national identity
```

**Scoring keys on pairing type, not presentation position.** The spec defines
D as "Block 7 minus Block 4", but under counterbalancing *Block 4 is a
different pairing for each arm* — scoring by block number silently flips the
sign for half the sample. Every trial therefore carries a `pairing` field
(`national_good` / `regional_good`) and the D computation reads that field.

`test/test.js` asserts both arms return an identical D (+1.967) for the same
simulated respondent. This is the single most common IAT analysis error and it
is now structurally foreclosed rather than merely documented.

### Attribute assignment is fixed

GOOD is pinned to the left key and BAD to the right for the entire task; only
the *target* assignment reverses between phases. This is what makes the
pairing label unambiguous, and it reproduces the spec's Block 4/7 table
exactly.

### Error handling — `penalty`

Error-trial latencies are replaced with the block's correct-trial mean +
600ms.

The alternative is enforced correction (require the correct key, record
time-to-correct), which is Greenwald's nominal recommendation because it
avoids the arbitrary 600ms constant. The two are psychometrically comparable.

**We deviate deliberately.** Enforced correction lets a confused respondent
stall on a screen until they guess right. With low-literacy respondents on
unfamiliar tablets that means enumerator intervention — and an enumerator
leaning over the tablet destroys the privacy that is the whole reason for
using an implicit measure here. It also makes task duration variable against
a fixed ~55-minute survey budget.

Cost accepted: errors concentrate in the incompatible block, so the
imputation does genuine work in the numerator. This is standard and
defensible, but it must be pre-registered explicitly rather than left as an
"or".

### Trial-level trimming — off

`dropFastTrials: false`. The improved D algorithm deliberately does not trim
the lower tail at the trial level; fast responding is handled as a
*subject-level* exclusion (>10% of trials under 300ms). The spec specified
both, which is a conventional-algorithm habit carried into an improved-
algorithm design. Only the subject-level rule is active.

### Modality balance

Each target category holds exactly **2 image + 2 audio**. If validation drops
a stimulus, its replacement must match modality. An imbalance leaks modality
into the D-score as bias, which no sample size corrects. `test/test.js`
asserts the balance survives the conditional-Kiswahili swap.

---

## Open, not yet locked

### The Kiswahili stimulus

`useConditionalSwahili` (setup page toggle). Included by default; dropping it
swaps in `Mashariki`, preserving modality balance.

The spec conditions this on IAT #2 fielding Kinyarwanda names (cross-priming).
There is a second reason to drop it that applies regardless: **every attribute
trial is already Swahili audio.** Making Swahili itself a category member
while it is also the medium of the attribute set is structurally confusing in
a way pre-pilot categorisation testing may not surface.

### Audio vs. image reaction times

Audio stimuli carry a duration; images do not. RT from stimulus onset
therefore runs systematically longer for audio.

This does **not** shrink D in a way that costs power directly — a uniform
shrinkage cancels, because the between-subject SD of D shrinks with it and the
t-statistic is unchanged. The real cost is **reliability**: extra within-
subject RT variance makes each respondent's D noisier, which attenuates the
exposure→D relationship.

Two implications:

1. Attenuation is absorbed by sample size; **bias is not**. Protect the
   modality balance above all else.
2. A test-retest gate would be at risk. IAT test-retest sits near r ≈ 0.5 to
   begin with; added modality noise could fail a `r > 0.5` criterion on a
   measure that is fine for group-level use. Set that threshold deliberately
   or drop it for this instrument.

The results page reports the observed audio−image gap and flags anything over
150ms, so the cost stays visible in pre-pilot rather than discovered in
analysis. **Decision pending on target N.**

### Block 5 length

`block5Trials`, setup page dropdown. 40 (standard, 200 total) or 20 (180
total, ~45s saved). This is the first and only trim lever; counterbalancing
carries the order-effect protection if it is used.

---

## Reproducibility

Trial order comes from a seeded RNG (mulberry32). The seed is stored on the
session and exported, so any respondent's exact sequence can be regenerated.
Arm assignment is stored alongside it.

## Data

Trial-level CSV columns:

```
resp_id · order_arm · seed · block · block_fn · is_test · pairing ·
trial_no · stimulus · stim_modality · category · response_key ·
correct · rt_ms
```

Respondent level: `d_national`, `error_rate`, `pct_fast`, `order_arm`, `seed`.

Both `primary` (test blocks only, 4 vs 7) and `robustness` (practice + test,
3+4 vs 6+7) D estimates are computed and shown.

## Current limitation

**Data is local-only.** Trials persist to `localStorage` and export as
JSON/CSV by hand. There is no backend — nothing is transmitted or collected
centrally. Fielding this requires either enumerator-side export per session or
a sync layer.
