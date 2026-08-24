// ============================================================
// config.js — IAT battery configuration
//
// Two instruments share one engine:
//   national_regional  — IAT #1, National vs. Regional Identity
//   banyarwanda_bias   — IAT #2, Banyarwanda in/out-group (safety-gated)
//
// Sign convention is generic. Each instrument names a targetA
// (the positive-D pole) and targetB. Scoring computes
//   D = ( mean RT[targetB+Good] − mean RT[targetA+Good] ) / SD
// so D > 0 always means "targetA + Good is faster". The engine
// keys everything on PAIRING TYPE, never on presentation
// position, so the counterbalancing arm cannot flip the sign.
// ============================================================

const IAT_CONFIG = {

  // --- Shared timing (ms) ---
  timing: {
    fixation: 500,
    errorFeedback: 300,
    iti: 250,
    maxRT: 10000,
  },

  // --- Shared scoring parameters ---
  scoring: {
    // LOCKED: 'penalty'. Error latencies are replaced with the block's
    // correct-trial mean + 600ms. Alternative 'enforced' (require the
    // correct key, use time-to-correct) is Greenwald's nominal
    // recommendation; the two are psychometrically comparable. We
    // deviate deliberately — enforced correction lets a confused
    // respondent stall on a screen until they guess right, inviting
    // enumerator intervention that destroys the privacy justifying an
    // implicit measure. See README § Error handling. Do not mix.
    errorHandling: 'penalty',
    errorPenaltyMs: 600,

    // Subject-level exclusions (the improved D algorithm does NOT trim
    // the lower tail at the trial level — that is why dropFastTrials
    // stays false).
    fastTrialThreshold: 300,      // ms
    fastTrialSubjectLimit: 0.10,  // flag if >10% of trials are faster
    maxErrorRate: 0.30,
    dropFastTrials: false,
  },

  // --- Shared response keys ---
  keys: {
    left:  ['e', 'E', 'ArrowLeft'],
    right: ['i', 'I', 'ArrowRight'],
  },

  // --- Shared attribute stimuli (audio, reused across both IATs) ---
  attributes: {
    good: [
      { id: 'furaha', label: 'Furaha', gloss: 'joy',      modality: 'audio', asset: 'assets/audio/attr/furaha.mp3' },
      { id: 'amani',  label: 'Amani',  gloss: 'peace',    modality: 'audio', asset: 'assets/audio/attr/amani.mp3' },
      { id: 'upendo', label: 'Upendo', gloss: 'love',     modality: 'audio', asset: 'assets/audio/attr/upendo.mp3' },
      { id: 'rafiki', label: 'Rafiki', gloss: 'friend',   modality: 'audio', asset: 'assets/audio/attr/rafiki.mp3' },
      { id: 'baraka', label: 'Baraka', gloss: 'blessing', modality: 'audio', asset: 'assets/audio/attr/baraka.mp3' },
      { id: 'uzuri',  label: 'Uzuri',  gloss: 'beauty',   modality: 'audio', asset: 'assets/audio/attr/uzuri.mp3' },
    ],
    bad: [
      { id: 'huzuni',  label: 'Huzuni',  gloss: 'sadness', modality: 'audio', asset: 'assets/audio/attr/huzuni.mp3' },
      { id: 'hatari',  label: 'Hatari',  gloss: 'danger',  modality: 'audio', asset: 'assets/audio/attr/hatari.mp3' },
      { id: 'chuki',   label: 'Chuki',   gloss: 'hatred',  modality: 'audio', asset: 'assets/audio/attr/chuki.mp3' },
      { id: 'adui',    label: 'Adui',    gloss: 'enemy',   modality: 'audio', asset: 'assets/audio/attr/adui.mp3' },
      { id: 'maumivu', label: 'Maumivu', gloss: 'pain',    modality: 'audio', asset: 'assets/audio/attr/maumivu.mp3' },
      { id: 'hofu',    label: 'Hofu',    gloss: 'fear',    modality: 'audio', asset: 'assets/audio/attr/hofu.mp3' },
    ],
  },

  // --- Global instrument options ---
  options: {
    // IAT #1: drop the conditional "Kiswahili" regional stimulus and
    // swap in the non-linguistic backup. Recommended ON whenever IAT #2
    // is in the field (language/name salience in both → cross-priming),
    // and arguably ON regardless since every attribute trial is already
    // Swahili audio.
    dropConditionalSwahili: false,

    // The one trim lever — Block 5 length. 40 = 200 trials (standard);
    // 20 = 180 trials (~45s saved). Counterbalancing carries the
    // order-effect protection if trimmed.
    block5Trials: 40,
  },

  // --- Block skeleton (shared 7-block improved procedure) ---
  // phase: which target sits LEFT — 'first' = the arm's opening target,
  // 'second' = reversed. Attributes never move: GOOD left, BAD right.
  blocks: [
    { n: 1, fn: 'target_practice',     label: 'Target practice',          trials: 20, kinds: ['target'],              phase: 'first',  isTest: false },
    { n: 2, fn: 'attribute_practice',  label: 'Attribute practice',       trials: 20, kinds: ['attribute'],           phase: null,     isTest: false },
    { n: 3, fn: 'combined_practice',   label: 'Combined practice',        trials: 20, kinds: ['target', 'attribute'], phase: 'first',  isTest: false },
    { n: 4, fn: 'combined_test',       label: 'Combined test',            trials: 40, kinds: ['target', 'attribute'], phase: 'first',  isTest: true  },
    { n: 5, fn: 'reversed_target',     label: 'Reversed target practice', trials: 40, kinds: ['target'],              phase: 'second', isTest: false },
    { n: 6, fn: 'combined_practice_r', label: 'Combined practice',        trials: 20, kinds: ['target', 'attribute'], phase: 'second', isTest: false },
    { n: 7, fn: 'combined_test_r',     label: 'Combined test',            trials: 40, kinds: ['target', 'attribute'], phase: 'second', isTest: true  },
  ],

  // ============================================================
  // INSTRUMENTS
  // ============================================================
  instruments: {

    // ---- IAT #1 — National vs. Regional Identity ----
    national_regional: {
      id: 'national_regional',
      title: 'IAT #1 — National vs. Regional Identity',
      short: 'National vs. Regional',
      question: 'Does formative M23 exposure shift implicit identification from the Congolese nation toward the Kivu region?',
      safetyGated: false,

      // targetA is the positive-D pole.
      targetA: { key: 'national', label: 'CONGO', sublabel: 'the nation' },
      targetB: { key: 'regional', label: 'KIVU',  sublabel: 'the East' },

      interp: {
        pos: 'Stronger implicit national identity',
        neg: 'Stronger implicit regional identity',
        neutral: 'No clear directional association',
      },

      // 2 image + 2 audio per side — modality balance is load-bearing.
      stimuli: {
        national: [
          { id: 'leopards', label: 'Les Léopards', modality: 'image', asset: 'assets/img/national/leopards.png', note: 'national team crest' },
          { id: 'drc_map',  label: 'Carte RDC',    modality: 'image', asset: 'assets/img/national/drc_map.png',  note: 'territorial map' },
          { id: 'congo',    label: 'Congo',        modality: 'audio', asset: 'assets/audio/national/congo.mp3' },
          { id: 'rdc',      label: 'RDC',          modality: 'audio', asset: 'assets/audio/national/rdc.mp3' },
        ],
        regional: [
          { id: 'gorillas',  label: 'Gorilles du Virunga', modality: 'image', asset: 'assets/img/regional/gorillas.png' },
          { id: 'lake_kivu', label: 'Lac Kivu',            modality: 'image', asset: 'assets/img/regional/lake_kivu.png' },
          { id: 'kivu',      label: 'Kivu',                modality: 'audio', asset: 'assets/audio/regional/kivu.mp3' },
          // Conditional pair — exactly one is active (see resolveStimuli).
          { id: 'kiswahili', label: 'Kiswahili', modality: 'audio', asset: 'assets/audio/regional/kiswahili.mp3', activeUnless: 'dropConditionalSwahili' },
          { id: 'mashariki', label: 'Mashariki', modality: 'audio', asset: 'assets/audio/regional/mashariki.mp3', activeWhen:   'dropConditionalSwahili' },
        ],
      },
    },

    // ---- IAT #2 — Banyarwanda in/out-group bias (SAFETY-GATED) ----
    banyarwanda_bias: {
      id: 'banyarwanda_bias',
      title: 'IAT #2 — Banyarwanda In/Out-Group Bias',
      short: 'Banyarwanda Bias',
      question: 'Automatic evaluation of the Rwandophone (Banyarwanda) out-group, net of ordinary own-group favouritism.',
      safetyGated: true,

      // targetA (positive-D pole) = the autochthonous reference group.
      // D > 0 = autochthonous+Good faster = stronger implicit favourability
      // toward "our communities" relative to the Banyarwanda out-group.
      //
      // WORKING on-screen labels only. The actual category framing and
      // its translation are gated on the safety review — displaying
      // "Banyarwanda vs. locals" sorting on a device is precisely the
      // exposure the gate exists to control.
      targetA: { key: 'autochthonous', label: 'WENYEJI',     sublabel: 'watu wa hapa' },
      targetB: { key: 'banyarwanda',   label: 'BANYARWANDA', sublabel: 'Kinyarwanda' },

      interp: {
        pos: 'Stronger implicit favourability toward the autochthonous reference (relative anti-Banyarwanda bias)',
        neg: 'Stronger implicit favourability toward the Banyarwanda reference',
        neutral: 'No clear directional association',
      },

      // Audio names only. All flagged validation-pending.
      // "us" is a BALANCED set across autochthonous groups, by design:
      // a single-group set would make "us" the own-group for that
      // group's respondents and revive the confound the instrument
      // exists to net out. Sourcing more non-Nande/Hunde names
      // (Tembo, Nyanga) is an open field task.
      stimuli: {
        autochthonous: [
          { id: 'kambale',      label: 'Kambale',      modality: 'audio', asset: 'assets/audio/iat2/kambale.mp3',      group: 'Nande', gender: 'm' },
          { id: 'kasereka',     label: 'Kasereka',     modality: 'audio', asset: 'assets/audio/iat2/kasereka.mp3',     group: 'Nande', gender: 'm' },
          { id: 'kanyamuhanga', label: 'Kanyamuhanga', modality: 'audio', asset: 'assets/audio/iat2/kanyamuhanga.mp3', group: 'Hunde', gender: 'm' },
          { id: 'katungu',      label: 'Katungu',      modality: 'audio', asset: 'assets/audio/iat2/katungu.mp3',      group: 'Nande', gender: 'f' },
          { id: 'zawadi',       label: 'Zawadi',       modality: 'audio', asset: 'assets/audio/iat2/zawadi.mp3',       group: 'Swahili', gender: 'u' },
          { id: 'nabintu',      label: 'Nabintu',      modality: 'audio', asset: 'assets/audio/iat2/nabintu.mp3',      group: 'Bembe', gender: 'f' },
        ],
        banyarwanda: [
          { id: 'habimana',    label: 'Habimana',    modality: 'audio', asset: 'assets/audio/iat2/habimana.mp3',    group: 'Rwandophone', gender: 'm' },
          { id: 'nsengiyumva', label: 'Nsengiyumva', modality: 'audio', asset: 'assets/audio/iat2/nsengiyumva.mp3', group: 'Rwandophone', gender: 'm' },
          { id: 'uwimana',     label: 'Uwimana',     modality: 'audio', asset: 'assets/audio/iat2/uwimana.mp3',     group: 'Rwandophone', gender: 'u' },
          { id: 'iradukunda',  label: 'Iradukunda',  modality: 'audio', asset: 'assets/audio/iat2/iradukunda.mp3',  group: 'Rwandophone', gender: 'u' },
          // FLAG: Ingabire collides with a prominent Rwandan public
          // figure (Victoire Ingabire). Kill-criterion candidate; swap
          // before fielding. Left in so pre-pilot can confirm/deny.
          { id: 'ingabire',    label: 'Ingabire',    modality: 'audio', asset: 'assets/audio/iat2/ingabire.mp3',    group: 'Rwandophone', gender: 'f', publicFigure: true },
          { id: 'mukamana',    label: 'Mukamana',    modality: 'audio', asset: 'assets/audio/iat2/mukamana.mp3',    group: 'Rwandophone', gender: 'f' },
        ],
      },

      // Hard gate shown before the task. The engine will not deal a
      // single trial until every confirmation is checked, or the
      // enumerator skips the instrument.
      safetyGate: {
        title: 'Security gate — IAT #2',
        body: 'This instrument sorts Banyarwanda names against autochthonous names. On a device seen in M23-controlled territory it can read as a record of ethnic sorting and endanger the respondent and enumerator. It must not run — pre-pilot included — before Raul / Marakuja sign-off.',
        confirmations: [
          'Raul / Marakuja security sign-off has been obtained for this village-tier.',
          'I have assessed the immediate setting and it is safe to administer this instrument now.',
          'The respondent has voluntarily agreed and may stop at any point without explanation.',
        ],
        allowSkip: true,
      },
    },
  },

  // ============================================================
  // Helpers
  // ============================================================

  // Resolve a target's active stimulus list, applying conditional
  // include/exclude flags. Keeps counts and modality balance intact.
  resolveStimuli(instrumentId, targetKey) {
    const list = this.instruments[instrumentId].stimuli[targetKey];
    return list.filter(s => {
      if (s.activeWhen)   return this.options[s.activeWhen] === true;
      if (s.activeUnless) return this.options[s.activeUnless] !== true;
      return true;
    });
  },

  getInstrument(id) {
    return this.instruments[id];
  },
};
