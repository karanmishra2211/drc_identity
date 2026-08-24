// ============================================================
// engine.js — Instrument-agnostic trial engine
// ============================================================

// Seeded RNG (mulberry32) — reproducible trial order from the seed.
function makeRNG(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class IATEngine {
  // arm: 'A_first' (targetA opens) | 'B_first' (targetB opens)
  constructor({ instrumentId, arm, seed, onStateChange, onTrialEnd, onComplete }) {
    this.instrument = IAT_CONFIG.getInstrument(instrumentId);
    this.arm = arm;
    this.seed = seed;
    this.rng = makeRNG(seed);

    this.onStateChange = onStateChange;
    this.onTrialEnd = onTrialEnd;
    this.onComplete = onComplete;

    this.blocks = this._buildBlocks();
    this.blockIndex = 0;
    this.trialIndex = 0;
    this.trials = [];
    this.allTrialData = [];

    this.state = 'IDLE';
    this.stimulusOnset = 0;
    this._timer = null;
  }

  // --- Public API ---

  start() {
    this.blockIndex = 0;
    this.allTrialData = [];
    this._startBlock();
  }

  proceedFromIntro() { this._runTrial(); }

  respond(side) {
    if (this.state !== 'AWAITING_RESPONSE') return;

    const rt = performance.now() - this.stimulusOnset;
    const trial = this.trials[this.trialIndex];
    const correct = side === trial.expectedSide;
    const block = this.blocks[this.blockIndex];

    const record = {
      block: block.n,
      block_fn: block.fn,
      is_test: block.isTest,
      pairing: block.pairing,            // '<targetKey>_good' | null
      trial_no: this.trialIndex + 1,
      stimulus: trial.stim.id,
      stim_label: trial.stim.label,
      stim_modality: trial.stim.modality,
      category: trial.category,          // targetA.key | targetB.key | good | bad
      response_key: side,
      correct: correct ? 1 : 0,
      rt_ms: Math.round(rt),
    };

    this.allTrialData.push(record);
    if (this.onTrialEnd) this.onTrialEnd(record);

    if (!correct) {
      this._set('FEEDBACK');
      this._timer = setTimeout(() => this._iti(), IAT_CONFIG.timing.errorFeedback);
    } else {
      this._iti();
    }
  }

  getBlockInfo() {
    const b = this.blocks[this.blockIndex];
    return {
      ...b,
      index: this.blockIndex,
      total: this.blocks.length,
      leftLabels: b.left.map(c => this._catLabel(c)),
      rightLabels: b.right.map(c => this._catLabel(c)),
    };
  }

  getCurrentTrial() { return this.trials[this.trialIndex] || null; }

  progress() {
    const total = this.blocks.reduce((s, b) => s + b.trials, 0);
    let done = 0;
    for (let i = 0; i < this.blockIndex; i++) done += this.blocks[i].trials;
    done += this.trialIndex;
    return { done, total, pct: Math.round((done / total) * 100) };
  }

  destroy() { if (this._timer) clearTimeout(this._timer); }

  // --- Block construction ---

  _buildBlocks() {
    const A = this.instrument.targetA.key;
    const B = this.instrument.targetB.key;
    const firstTarget  = this.arm === 'B_first' ? B : A;
    const secondTarget = this.arm === 'B_first' ? A : B;

    return IAT_CONFIG.blocks.map(def => {
      const trials = def.n === 5 ? IAT_CONFIG.options.block5Trials : def.trials;

      const leftTarget = def.phase === 'first' ? firstTarget
        : def.phase === 'second' ? secondTarget
        : null;
      const rightTarget = leftTarget ? (leftTarget === A ? B : A) : null;

      const hasTarget = def.kinds.includes('target');
      const hasAttribute = def.kinds.includes('attribute');

      const left = [];
      const right = [];
      if (hasTarget) { left.push(leftTarget); right.push(rightTarget); }
      // GOOD always left, BAD always right — attributes never move.
      if (hasAttribute) { left.push('good'); right.push('bad'); }

      // Pairing = whichever target shares a key with GOOD (always left).
      const pairing = (hasTarget && hasAttribute) ? `${leftTarget}_good` : null;

      return { ...def, trials, left, right, leftTarget, rightTarget, pairing };
    });
  }

  // --- Trial generation ---

  _startBlock() {
    this.trials = this._generateTrials(this.blocks[this.blockIndex]);
    this.trialIndex = 0;
    this._set('BLOCK_INTRO');
  }

  _generateTrials(block) {
    const n = block.trials;
    const A = this.instrument.targetA.key;
    const B = this.instrument.targetB.key;
    const pool = [];

    const wantsTarget = block.kinds.includes('target');
    const wantsAttribute = block.kinds.includes('attribute');

    if (wantsTarget && wantsAttribute) {
      const half = n / 2;
      pool.push(...this._draw(A, half / 2));
      pool.push(...this._draw(B, half / 2));
      pool.push(...this._draw('good', half / 2));
      pool.push(...this._draw('bad', half / 2));
    } else if (wantsTarget) {
      pool.push(...this._draw(A, n / 2));
      pool.push(...this._draw(B, n / 2));
    } else {
      pool.push(...this._draw('good', n / 2));
      pool.push(...this._draw('bad', n / 2));
    }

    this._shuffle(pool);

    return pool.map(item => ({
      ...item,
      expectedSide: block.left.includes(item.category) ? 'left' : 'right',
    }));
  }

  // Draw `count` stimuli from a category, cycling a shuffled bag so
  // exemplars appear equally often rather than clumping.
  _draw(category, count) {
    const source = (category === 'good' || category === 'bad')
      ? IAT_CONFIG.attributes[category]
      : IAT_CONFIG.resolveStimuli(this.instrument.id, category);

    const out = [];
    let bag = [];
    for (let i = 0; i < count; i++) {
      if (bag.length === 0) { bag = source.slice(); this._shuffle(bag); }
      out.push({ stim: bag.pop(), category });
    }
    return out;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // --- Trial flow ---

  _runTrial() {
    if (this.trialIndex >= this.trials.length) return this._endBlock();
    this._set('FIXATION');
    this._timer = setTimeout(() => {
      this._set('STIMULUS');
      this.stimulusOnset = performance.now();
      this._set('AWAITING_RESPONSE');
    }, IAT_CONFIG.timing.fixation);
  }

  _iti() {
    this._set('ITI');
    this._timer = setTimeout(() => {
      this.trialIndex++;
      this._runTrial();
    }, IAT_CONFIG.timing.iti);
  }

  _endBlock() {
    this.blockIndex++;
    if (this.blockIndex >= this.blocks.length) {
      this._set('COMPLETE');
      if (this.onComplete) this.onComplete(this.allTrialData);
    } else {
      this._startBlock();
    }
  }

  _set(state) {
    this.state = state;
    if (this.onStateChange) this.onStateChange(state);
  }

  _catLabel(cat) {
    if (cat === 'good') return { label: 'GOOD', sublabel: '' };
    if (cat === 'bad')  return { label: 'BAD',  sublabel: '' };
    if (cat === this.instrument.targetA.key) return this.instrument.targetA;
    if (cat === this.instrument.targetB.key) return this.instrument.targetB;
    return { label: cat, sublabel: '' };
  }
}
