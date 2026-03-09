# IAT Simulator Implementation Plan

## Scope
Build ST-IAT 1 (Other Congolese) and ST-IAT 2 (Congolese State) as a web-based simulator. Leave ST-IAT 3 (Outsiders) for later.

---

## Architecture

Single-page web application using **vanilla HTML/CSS/JS** (no frameworks). This keeps it lightweight, offline-capable, and easy to deploy on tablets in the field.

### File Structure
```
/iat-simulator/
  index.html          — Entry point: language select, IAT assignment, respondent ID
  iat.html            — The actual IAT task engine (full-screen, minimal UI)
  results.html        — Post-task: D-score display, data export
  css/
    main.css          — Shared styles (entry, results pages)
    iat.css           — IAT task styles (full-screen, high-contrast, large touch targets)
  js/
    config.js         — All stimuli definitions, timing constants, block structures
    engine.js         — Core IAT trial engine (state machine: fixation → stimulus → response → feedback → ITI)
    audio.js          — Audio playback manager (loads files, falls back to Web Speech API TTS for demo)
    scoring.js        — D-score calculation (Greenwald et al. 2003 algorithm)
    storage.js        — Data persistence (localStorage + JSON export)
    ui.js             — UI controller for iat.html (renders blocks, category labels, handles touch/keyboard input)
    app.js            — Entry page controller (setup, randomization, launch)
  audio/
    swahili/          — Swahili audio clips (placeholder directory)
    french/           — French audio clips (placeholder directory)
```

---

## Step-by-Step Plan

### Step 1: Configuration Module (`js/config.js`)
Define all data structures that drive the IAT:

- **Timing constants**: fixation duration (500ms), error feedback duration (200ms), inter-trial interval (250ms), max RT (10000ms), min RT threshold (300ms)
- **Evaluative stimuli** (shared across both IATs):
  - GOOD: Furaha, Amani, Upendo, Rafiki, Baraka, Uzuri (with English translations)
  - BAD: Huzuni, Hatari, Chuki, Adui, Maumivu, Hofu (with English translations)
- **Target stimuli for IAT 1** (Other Congolese): Kinois, Mtu wa Kinshasa, Katangais, Mtu wa Lubumbashi, Mukongo, Lingala
- **Target stimuli for IAT 2** (Congolese State): Serikali, Drapeau ya Congo, FARDC, Polisi, Carte d'identité, Kinshasa
- **Block definitions**: 4 blocks of 24 trials each, specifying which categories map to left/right for each block, and which blocks are test blocks vs. practice
- **Counterbalance orders**: Order A (Target+Good first: blocks 1→2→3→4) vs. Order B (Target+Bad first: blocks 1→4→3→2)

### Step 2: Audio Module (`js/audio.js`)
Handle stimulus presentation:

- **Primary path**: Look for pre-recorded audio files at `audio/{language}/{stimulus_id}.mp3`
- **Fallback**: Use browser Web Speech API (`SpeechSynthesis`) to speak the word — this enables immediate demo/testing before real audio recordings exist
- **Preloading**: On IAT start, preload all audio clips for the assigned IAT version to avoid playback delay mid-trial
- **API**: `playStimulus(stimulusId, language)` → returns a Promise that resolves when audio finishes playing

### Step 3: Storage Module (`js/storage.js`)
Handle data persistence:

- **Trial-level data**: For each trial, store: `{block, trial_num, stimulus, category, expected_side, response_side, rt_ms, correct, timestamp}`
- **Session-level data**: `{respondent_id, iat_version, block_order, language, start_time, end_time}`
- **Auto-save**: Write to `localStorage` after every block (crash recovery)
- **Export**: Generate downloadable JSON and CSV files with all trial data + computed D-score
- **Data structure** matches the protocol's specified format

### Step 4: IAT Engine (`js/engine.js`)
The core state machine that runs each trial:

- **States**: `READY → FIXATION → STIMULUS → AWAITING_RESPONSE → FEEDBACK → ITI → (next trial or next block)`
- **Trial flow** (per protocol):
  1. Show fixation cross (500ms)
  2. Play audio stimulus
  3. Wait for left/right response (record RT from stimulus onset)
  4. If incorrect: show red X (200ms); if correct: proceed
  5. Inter-trial interval (250ms)
  6. Next trial
- **Trial generation**: For each block, generate 24 trials by sampling stimuli. In practice blocks (1 & 3): sample only from GOOD/BAD evaluative stimuli. In combined blocks (2 & 4): sample from both evaluative and target stimuli, balanced so ~50% are evaluative and ~50% are target
- **Input handling**: Listen for keyboard (E/I keys or arrow keys) AND touch (left/right screen halves) — support both desktop testing and tablet deployment
- **Block transitions**: Between blocks, show instruction screen explaining the new category mapping, wait for user to press "Continue"

### Step 5: Scoring Module (`js/scoring.js`)
Implement Greenwald et al. (2003) D-score algorithm:

1. **Data cleaning**:
   - Remove trials with RT > 10,000ms
   - Flag participants with >10% of trials RT < 300ms (random responding)
   - Flag participants with error rate > 30%
2. **Compute**:
   - Mean RT for correct trials in Block 2 (Target+Good combined block)
   - Mean RT for correct trials in Block 4 (Target+Bad combined block)
   - Pooled SD across both test blocks (correct trials only)
3. **D-score**: `(Mean_TargetBad - Mean_TargetGood) / SD_pooled`
4. **Return** D-score, interpretation (positive/negative/neutral), effect size category, data quality flags

### Step 6: Entry Page (`index.html` + `js/app.js`)
Setup screen before the IAT:

- **Respondent ID** input field (or auto-generate)
- **IAT version assignment**: Random assignment to IAT 1 or IAT 2 (50/50 since we're excluding IAT 3), or manual selection for testing/demo
- **Counterbalance assignment**: Random assignment to Order A or Order B (50/50)
- **Language selection**: Swahili (default) or French
- **"Begin" button** → navigates to iat.html with parameters

### Step 7: IAT Task Page (`iat.html` + `css/iat.css` + `js/ui.js`)
The full-screen IAT interface:

- **Layout**: Dark background, white text. Category labels pinned to top-left and top-right corners (large, clear text). Stimulus area centered.
- **Left/Right response areas**: Large touch targets covering each half of the screen (for tablet use)
- **Fixation cross**: Large "+" centered on screen
- **Error feedback**: Red "X" centered on screen
- **Block instruction screens**: Between blocks, show which categories are mapped to which side, with clear visual diagram
- **Progress indicator**: Subtle block/trial counter (e.g., "Block 2 of 4")
- **High contrast**: Optimized for outdoor/variable lighting conditions on tablets

### Step 8: Results Page (`results.html`)
Post-task display:

- **D-score** with interpretation
- **Summary statistics**: mean RT per block, error rate, completion time
- **Data quality flags**: any exclusion criteria triggered
- **Export buttons**: Download JSON, Download CSV
- **Option to start another session** (for enumerators running multiple respondents)

### Step 9: Testing and Polish
- Test both IAT versions end-to-end
- Verify D-score calculation against known test data
- Test counterbalancing (both orders produce valid results)
- Test touch input on mobile/tablet viewport
- Test offline capability (no network dependencies)
- Test crash recovery (close mid-block, reopen)
- Verify data export format matches protocol specification

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vanilla JS | No build step, works offline, simple deployment to tablets |
| Audio fallback | Web Speech API TTS | Enables immediate testing before real audio recordings are made |
| Input | Keyboard + Touch | Desktop dev + tablet field deployment |
| Data storage | localStorage + file export | Works offline; export for analysis |
| Styling | Dark IAT screen | Standard IAT presentation; reduces distraction |
| Timing | `performance.now()` | Millisecond-precision RT measurement |

## Implementation Order
1. `config.js` — foundation all other modules depend on
2. `audio.js` — needed before the engine can present stimuli
3. `storage.js` — needed before the engine can record data
4. `engine.js` — core trial logic
5. `css/iat.css` — IAT visual design
6. `iat.html` + `ui.js` — wire engine to DOM
7. `scoring.js` — compute results
8. `css/main.css` — shared styles
9. `index.html` + `app.js` — entry/setup page
10. `results.html` — results display and export
11. Integration testing and polish
