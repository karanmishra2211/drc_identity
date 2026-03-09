// ============================================================
// config.js — Stimuli, timing constants, and block definitions
// ST-IAT Protocol for DRC National Identity Study
// ============================================================

const IAT_CONFIG = {
  // --- Timing (milliseconds) ---
  timing: {
    fixation: 500,        // Fixation cross duration
    errorFeedback: 200,   // Red X display after incorrect response
    iti: 250,             // Inter-trial interval
    maxRT: 10000,         // Trials slower than this are excluded
    minRT: 300,           // Trials faster than this flag random responding
    minRTPercent: 0.10,   // Exclude participant if >10% trials < minRT
    maxErrorRate: 0.30,   // Exclude participant if >30% errors
  },

  // --- Trials per block ---
  trialsPerBlock: 24,

  // --- Shared evaluative stimuli (used in all IATs) ---
  evaluative: {
    good: [
      { id: 'furaha',  word: 'Furaha',  translation: 'Joy / Happiness' },
      { id: 'amani',   word: 'Amani',   translation: 'Peace' },
      { id: 'upendo',  word: 'Upendo',  translation: 'Love' },
      { id: 'rafiki',  word: 'Rafiki',  translation: 'Friend' },
      { id: 'baraka',  word: 'Baraka',  translation: 'Blessing' },
      { id: 'uzuri',   word: 'Uzuri',   translation: 'Beauty' },
    ],
    bad: [
      { id: 'huzuni',   word: 'Huzuni',   translation: 'Sadness' },
      { id: 'hatari',   word: 'Hatari',   translation: 'Danger' },
      { id: 'chuki',    word: 'Chuki',    translation: 'Hatred' },
      { id: 'adui',     word: 'Adui',     translation: 'Enemy' },
      { id: 'maumivu',  word: 'Maumivu',  translation: 'Pain' },
      { id: 'hofu',     word: 'Hofu',     translation: 'Fear' },
    ],
  },

  // --- Target stimuli by IAT version ---
  targets: {
    other_congolese: {
      label: 'Other Congolese',
      labelSwahili: 'Wacongo Wengine',
      stimuli: [
        { id: 'kinois',           word: 'Kinois',           translation: 'Person from Kinshasa' },
        { id: 'mtu_wa_kinshasa',  word: 'Mtu wa Kinshasa',  translation: 'Person from Kinshasa (Sw.)' },
        { id: 'katangais',        word: 'Katangais',        translation: 'Person from Katanga' },
        { id: 'mtu_wa_lubumbashi',word: 'Mtu wa Lubumbashi',translation: 'Person from Lubumbashi' },
        { id: 'mukongo',          word: 'Mukongo',          translation: 'Person from Kongo Central' },
        { id: 'lingala',          word: 'Lingala',          translation: 'The Lingala language' },
      ],
    },
    congolese_state: {
      label: 'Congolese State',
      labelSwahili: 'Serikali ya Congo',
      stimuli: [
        { id: 'serikali',         word: 'Serikali',         translation: 'Government' },
        { id: 'drapeau_ya_congo', word: 'Drapeau ya Congo', translation: 'Congolese flag' },
        { id: 'fardc',            word: 'FARDC',            translation: 'Congolese armed forces' },
        { id: 'polisi',           word: 'Polisi',           translation: 'Police' },
        { id: 'carte_identite',   word: "Carte d'identité", translation: 'National ID card' },
        { id: 'kinshasa',         word: 'Kinshasa',         translation: 'The capital' },
      ],
    },
  },

  // --- Block structure ---
  // Block types:
  //   'practice'       = evaluative only (GOOD vs BAD)
  //   'compatible'     = Target+GOOD on left, BAD on right
  //   'incompatible'   = GOOD on left, Target+BAD on right
  //
  // Order A (compatible first): 1→2→3→4
  // Order B (incompatible first): 1→4→3→2
  blocks: {
    1: { type: 'practice',     leftCategories: ['good'],           rightCategories: ['bad'],           isTest: false, label: 'Practice' },
    2: { type: 'compatible',   leftCategories: ['target', 'good'], rightCategories: ['bad'],           isTest: true,  label: 'Combined A' },
    3: { type: 'practice',     leftCategories: ['good'],           rightCategories: ['bad'],           isTest: false, label: 'Re-practice' },
    4: { type: 'incompatible', leftCategories: ['good'],           rightCategories: ['target', 'bad'], isTest: true,  label: 'Combined B' },
  },

  // Block orders for counterbalancing
  blockOrders: {
    A: [1, 2, 3, 4],  // compatible first
    B: [1, 4, 3, 2],  // incompatible first
  },

  // --- Key mappings ---
  keys: {
    left: ['e', 'E', 'ArrowLeft'],
    right: ['i', 'I', 'ArrowRight'],
  },

  // --- Category display labels ---
  categoryLabels: {
    good: 'GOOD',
    bad: 'BAD',
  },
};
