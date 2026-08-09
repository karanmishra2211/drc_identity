// ============================================================
// config.js — IAT #1: National vs. Regional Identity
// Instrument spec v1.0 · August 2026
//
// Two-target IAT. D > 0 = faster when National + Good share a
// key = stronger implicit national identity. This sign is
// LOCKED. See scoring.js — scoring is keyed on PAIRING TYPE,
// not on presentation position, so counterbalancing cannot
// flip it.
// ============================================================

const IAT_CONFIG = {
  meta: {
    instrument: 'IAT #1 — National vs. Regional Identity',
    version: 'v1.0',
  },

  // --- Timing (milliseconds) ---
  timing: {
    fixation: 500,
    errorFeedback: 300,
    iti: 250,
    maxRT: 10000,
  },

  // --- Scoring parameters ---
  scoring: {
    // Error handling. Pick ONE and pre-register it — these are
    // different estimators and must not be mixed.
    //   'penalty'  = replace error latency with block mean + 600ms
    //   'enforced' = require correction, use time-to-correct
    errorHandling: 'penalty',
    errorPenaltyMs: 600,

    // Subject-level exclusion criteria
    fastTrialThreshold: 300,      // ms
    fastTrialSubjectLimit: 0.10,  // flag if >10% of trials are faster
    maxErrorRate: 0.30,           // flag if error rate exceeds this

    // The improved D algorithm does NOT trim the lower tail at the
    // trial level. Leave false unless deliberately deviating.
    dropFastTrials: false,
  },

  // --- Category display ---
  categories: {
    national: { label: 'CONGO',  sublabel: 'the nation' },
    regional: { label: 'KIVU',   sublabel: 'the East' },
    good:     { label: 'GOOD',   sublabel: '' },
    bad:      { label: 'BAD',    sublabel: '' },
  },

  // --- Target stimuli (locked core, modality-balanced 2 image + 2 audio) ---
  // Modality balance is a HARD constraint. If validation drops a
  // stimulus, replace it with one of the same modality.
  targets: {
    national: [
      { id: 'leopards', label: 'Les Léopards', modality: 'image', asset: 'assets/img/national/leopards.png',  note: 'national team crest' },
      { id: 'drc_map',  label: 'Carte RDC',    modality: 'image', asset: 'assets/img/national/drc_map.png',   note: 'territorial map' },
      { id: 'congo',    label: 'Congo',        modality: 'audio', asset: 'assets/audio/national/congo.mp3' },
      { id: 'rdc',      label: 'RDC',          modality: 'audio', asset: 'assets/audio/national/rdc.mp3' },
    ],
    regional: [
      { id: 'gorillas',  label: 'Gorilles du Virunga', modality: 'image', asset: 'assets/img/regional/gorillas.png' },
      { id: 'lake_kivu', label: 'Lac Kivu',            modality: 'image', asset: 'assets/img/regional/lake_kivu.png' },
      { id: 'kivu',      label: 'Kivu',                modality: 'audio', asset: 'assets/audio/regional/kivu.mp3' },
      // CONDITIONAL: drop if IAT #2 fields with Kinyarwanda names
      // (cross-priming), and arguably drop regardless — every
      // attribute trial is already Swahili audio.
      { id: 'kiswahili', label: 'Kiswahili',           modality: 'audio', asset: 'assets/audio/regional/kiswahili.mp3', conditional: true },
      // Same-modality replacement if Kiswahili is dropped:
      { id: 'mashariki', label: 'Mashariki',           modality: 'audio', asset: 'assets/audio/regional/mashariki.mp3', replacesConditional: true },
    ],
  },

  // Set false to drop Kiswahili and swap in the non-linguistic backup.
  useConditionalSwahili: true,

  // --- Attribute stimuli (audio, reused across both IATs) ---
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

  // --- Block structure (standard 7-block improved procedure) ---
  // 'phase' selects which target sits on the LEFT:
  //   'first'  = the arm's opening target
  //   'second' = the reversed assignment
  // Attributes never move: GOOD is always left, BAD always right.
  blocks: [
    { n: 1, fn: 'target_practice',     label: 'Target practice',          trials: 20, kinds: ['target'],              phase: 'first',  isTest: false },
    { n: 2, fn: 'attribute_practice',  label: 'Attribute practice',       trials: 20, kinds: ['attribute'],           phase: null,     isTest: false },
    { n: 3, fn: 'combined_practice',   label: 'Combined practice',        trials: 20, kinds: ['target', 'attribute'], phase: 'first',  isTest: false },
    { n: 4, fn: 'combined_test',       label: 'Combined test',            trials: 40, kinds: ['target', 'attribute'], phase: 'first',  isTest: true  },
    { n: 5, fn: 'reversed_target',     label: 'Reversed target practice', trials: 40, kinds: ['target'],              phase: 'second', isTest: false },
    { n: 6, fn: 'combined_practice_r', label: 'Combined practice',        trials: 20, kinds: ['target', 'attribute'], phase: 'second', isTest: false },
    { n: 7, fn: 'combined_test_r',     label: 'Combined test',            trials: 40, kinds: ['target', 'attribute'], phase: 'second', isTest: true  },
  ],

  // Trim lever: set to 20 to save ~45s (total 180 trials). This is
  // the FIRST and ONLY place to cut. Counterbalancing then carries
  // the order-effect protection on its own.
  block5Trials: 40,

  // --- Counterbalancing arms ---
  // Which target pairs with GOOD in the first combined phase.
  arms: {
    national_first: { firstTarget: 'national', secondTarget: 'regional' },
    regional_first: { firstTarget: 'regional', secondTarget: 'national' },
  },

  // --- Response keys ---
  keys: {
    left:  ['e', 'E', 'ArrowLeft'],
    right: ['i', 'I', 'ArrowRight'],
  },
};

// Resolve the conditional Swahili stimulus into a usable target list.
IAT_CONFIG.resolvedTargets = function (side) {
  const all = IAT_CONFIG.targets[side];
  return all.filter(s => {
    if (s.conditional) return IAT_CONFIG.useConditionalSwahili;
    if (s.replacesConditional) return !IAT_CONFIG.useConditionalSwahili;
    return true;
  });
};
