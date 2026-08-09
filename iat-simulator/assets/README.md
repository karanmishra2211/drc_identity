# Stimulus assets

Placeholder tree. Until real files land, the task renders image stimuli as a
framed caption and speaks audio stimuli via the browser's speech synthesis.

## Images — `img/`

| Path | Stimulus |
|---|---|
| `img/national/leopards.png` | Les Léopards crest |
| `img/national/drc_map.png` | Congo / DRC territorial map |
| `img/regional/gorillas.png` | Gorillas of Virunga |
| `img/regional/lake_kivu.png` | Lake Kivu |

Specs: square-ish, ≥600px on the long edge, transparent or white ground,
matched in visual complexity and subjective size across the two categories.

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
drops a stimulus, replace it with one of the same modality. `test/test.js`
asserts this.

## Open question before recording

Audio stimuli carry a duration; images do not. RT measured from stimulus
onset therefore runs longer for audio, which inflates the pooled SD and
shrinks D. Either measure audio RT from clip **offset**, or keep the clips
as short and as uniform in length as the specs allow. The results page
reports the observed audio−image gap so the cost stays visible.
