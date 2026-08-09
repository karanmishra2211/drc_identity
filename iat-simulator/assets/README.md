# Stimulus assets

Placeholder tree. Until real files land, the task renders image stimuli as a
framed caption and speaks audio stimuli via the browser's speech synthesis, so
the instrument is fully testable now.

## Images — `img/`

| Path | Stimulus | Status |
|---|---|---|
| `img/national/leopards.png` | Les Léopards crest | needed |
| `img/national/drc_map.png` | Congo / DRC territorial map | needed |
| `img/regional/gorillas.png` | Gorillas of Virunga | needed |
| `img/regional/lake_kivu.png` | Lake Kivu | needed |

Specs: square-ish, ≥600px on the long edge, transparent or white ground,
matched in visual complexity and subjective size across the two categories.
Two images per target category — the balance is load-bearing (see below).

Drop files at these exact paths and they render automatically; the frame falls
back to a caption if a file is missing, so a partial set still runs.

## Sourcing note — presidence.cd

`presidence.cd/symboles-de-la-republique` was proposed as the image source. Two
problems worth settling before pulling from it:

**It is the wrong source for the wrong pole.** That page is the *Presidency's*
inventory of *state* symbols — flag, coat of arms, anthem, motto. The spec's
national pole is deliberately "the nation as a whole, kept clear of state and
capital symbols," and the flag sits in the validation-pending backups
precisely because it must first clear the state-contamination screen (§5:
"does NOT read primarily as 'the government in Kinshasa'"). An image sourced
from and framed by the Presidency is close to the definition of what that
screen is designed to catch.

**Les Léopards is not on it.** The crest belongs to the football federation
(FECOFA), not the state — a separate source. That separation is a feature:
it is why the Léopards survive Rule 2 where the flag has to be screened.

Useful for the flag and coat of arms *if* they clear §5. Not a source for the
locked core set.

Also note the safety gate: the flag is named as the highest-risk item for
tablet inspection in M23-controlled villages. Sourcing it is a measurement
question; displaying it is a separate deployment question.

## Audio — `audio/`

| Path | Stimulus |
|---|---|
| `audio/national/congo.mp3` | "Congo" |
| `audio/national/rdc.mp3` | "RDC" |
| `audio/regional/kivu.mp3` | "Kivu" |
| `audio/regional/kiswahili.mp3` | "Kiswahili" — conditional, see config |
| `audio/regional/mashariki.mp3` | "Mashariki" — swap-in if Kiswahili is dropped |
| `audio/attr/*.mp3` | The twelve Good/Bad attribute words |

Specs: mono, 44.1kHz, 500–800ms, silent ground, one native Swahili speaker
throughout, neutral prosody, all clips loudness-normalised.

## Modality balance is load-bearing

Each target category must hold exactly **2 image + 2 audio**. If validation
drops a stimulus, replace it with one of the same modality. An imbalance
leaks modality into the D-score as *bias*, which no sample size corrects.
`test/test.js` asserts this survives the conditional-Kiswahili swap.

## Before recording

Audio carries a duration; images do not, so RT from onset runs longer for
audio. That is a *reliability* cost, not a bias — it adds within-subject noise
that attenuates the exposure→D relationship. Keep the clips as short and as
uniform in length as the specs allow, or measure audio RT from clip offset.

The results page reports the observed audio−image gap and flags anything over
150ms, so this surfaces in pre-pilot rather than in analysis.
