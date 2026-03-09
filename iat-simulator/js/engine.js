// ============================================================
// engine.js — Core IAT trial engine (state machine)
// ============================================================

class IATEngine {
  constructor({ iatVersion, blockOrder, onStateChange, onTrialEnd, onBlockEnd, onComplete }) {
    this.iatVersion = iatVersion;
    this.blockOrder = blockOrder; // 'A' or 'B'
    this.onStateChange = onStateChange;
    this.onTrialEnd = onTrialEnd;
    this.onBlockEnd = onBlockEnd;
    this.onComplete = onComplete;

    this.targetConfig = IAT_CONFIG.targets[iatVersion];
    this.blockSequence = IAT_CONFIG.blockOrders[blockOrder];
    this.currentBlockIndex = 0;
    this.currentTrialIndex = 0;
    this.trials = [];
    this.blockTrials = [];
    this.allTrialData = [];
    this.state = 'IDLE'; // IDLE, FIXATION, STIMULUS, AWAITING_RESPONSE, FEEDBACK, ITI
    this.stimulusOnsetTime = 0;
    this._timeoutId = null;
  }

  // --- Public API ---

  start() {
    this.currentBlockIndex = 0;
    this.allTrialData = [];
    this._startBlock();
  }

  // Called when participant presses left or right
  respond(side) {
    if (this.state !== 'AWAITING_RESPONSE') return;

    const rt = performance.now() - this.stimulusOnsetTime;
    const trial = this.trials[this.currentTrialIndex];
    const correct = side === trial.expectedSide;

    const trialData = {
      block_num: this.blockSequence[this.currentBlockIndex],
      block_type: trial.blockType,
      is_test_block: trial.isTest,
      trial_num: this.currentTrialIndex + 1,
      stimulus_id: trial.stimulus.id,
      stimulus_word: trial.stimulus.word,
      stimulus_category: trial.category,
      expected_side: trial.expectedSide,
      response_side: side,
      rt_ms: Math.round(rt),
      correct: correct,
    };

    this.blockTrials.push(trialData);
    this.allTrialData.push(trialData);

    if (this.onTrialEnd) this.onTrialEnd(trialData);

    if (!correct) {
      this._setState('FEEDBACK');
      this._timeoutId = setTimeout(() => this._iti(), IAT_CONFIG.timing.errorFeedback);
    } else {
      this._iti();
    }
  }

  // Get current block info for UI
  getCurrentBlockInfo() {
    const blockNum = this.blockSequence[this.currentBlockIndex];
    const blockDef = IAT_CONFIG.blocks[blockNum];
    return {
      blockNum,
      blockDef,
      blockIndex: this.currentBlockIndex,
      totalBlocks: this.blockSequence.length,
      targetLabel: this.targetConfig.label,
      leftLabels: this._resolveLabels(blockDef.leftCategories),
      rightLabels: this._resolveLabels(blockDef.rightCategories),
    };
  }

  // Get current trial stimulus for display
  getCurrentStimulus() {
    if (this.currentTrialIndex < this.trials.length) {
      return this.trials[this.currentTrialIndex];
    }
    return null;
  }

  destroy() {
    if (this._timeoutId) clearTimeout(this._timeoutId);
  }

  // --- Internal ---

  _startBlock() {
    const blockNum = this.blockSequence[this.currentBlockIndex];
    const blockDef = IAT_CONFIG.blocks[blockNum];
    this.trials = this._generateTrials(blockDef, blockNum);
    this.currentTrialIndex = 0;
    this.blockTrials = [];
    this._setState('BLOCK_INTRO');
  }

  // Called by UI when participant dismisses block intro
  proceedFromIntro() {
    this._runTrial();
  }

  _runTrial() {
    if (this.currentTrialIndex >= this.trials.length) {
      this._endBlock();
      return;
    }
    this._setState('FIXATION');
    this._timeoutId = setTimeout(() => {
      this._setState('STIMULUS');
      this.stimulusOnsetTime = performance.now();
      this._setState('AWAITING_RESPONSE');
    }, IAT_CONFIG.timing.fixation);
  }

  _iti() {
    this._setState('ITI');
    this._timeoutId = setTimeout(() => {
      this.currentTrialIndex++;
      this._runTrial();
    }, IAT_CONFIG.timing.iti);
  }

  _endBlock() {
    if (this.onBlockEnd) this.onBlockEnd(this.blockTrials, this.getCurrentBlockInfo());

    this.currentBlockIndex++;
    if (this.currentBlockIndex >= this.blockSequence.length) {
      this._setState('COMPLETE');
      if (this.onComplete) this.onComplete(this.allTrialData);
    } else {
      this._startBlock();
    }
  }

  _setState(state) {
    this.state = state;
    if (this.onStateChange) this.onStateChange(state);
  }

  // --- Trial generation ---

  _generateTrials(blockDef, blockNum) {
    const allCategories = [...blockDef.leftCategories, ...blockDef.rightCategories];
    const hasTarget = allCategories.includes('target');
    const n = IAT_CONFIG.trialsPerBlock;

    let pool = [];

    if (hasTarget) {
      // Combined block: ~50% evaluative, ~50% target
      const nTarget = Math.floor(n / 2);
      const nEval = n - nTarget;
      const targetStimuli = this._sampleStimuli(this.targetConfig.stimuli, nTarget, 'target');
      const goodStimuli = this._sampleStimuli(IAT_CONFIG.evaluative.good, Math.floor(nEval / 2), 'good');
      const badStimuli = this._sampleStimuli(IAT_CONFIG.evaluative.bad, nEval - Math.floor(nEval / 2), 'bad');
      pool = [...targetStimuli, ...goodStimuli, ...badStimuli];
    } else {
      // Practice block: only evaluative
      const nGood = Math.floor(n / 2);
      const nBad = n - nGood;
      const goodStimuli = this._sampleStimuli(IAT_CONFIG.evaluative.good, nGood, 'good');
      const badStimuli = this._sampleStimuli(IAT_CONFIG.evaluative.bad, nBad, 'bad');
      pool = [...goodStimuli, ...badStimuli];
    }

    // Shuffle
    this._shuffle(pool);

    // Assign expected side
    return pool.map(item => {
      let expectedSide;
      if (blockDef.leftCategories.includes(item.category)) {
        expectedSide = 'left';
      } else {
        expectedSide = 'right';
      }
      return {
        ...item,
        expectedSide,
        blockType: blockDef.type,
        isTest: blockDef.isTest,
      };
    });
  }

  _sampleStimuli(stimuliArray, count, category) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const stim = stimuliArray[i % stimuliArray.length];
      result.push({ stimulus: stim, category });
    }
    return result;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  _resolveLabels(categories) {
    return categories.map(c => {
      if (c === 'target') return this.targetConfig.label;
      if (c === 'good') return IAT_CONFIG.categoryLabels.good;
      if (c === 'bad') return IAT_CONFIG.categoryLabels.bad;
      return c;
    });
  }
}
