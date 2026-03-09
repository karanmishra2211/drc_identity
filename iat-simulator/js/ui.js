// ============================================================
// ui.js — IAT UI controller (wires engine to DOM)
// ============================================================

const IATUI = {
  engine: null,

  init() {
    // Read session params from URL
    const params = new URLSearchParams(window.location.search);
    const respondentId = params.get('rid') || 'TEST_' + Date.now();
    const iatVersion = params.get('iat') || 'other_congolese';
    const blockOrder = params.get('order') || 'A';
    const language = params.get('lang') || 'swahili';

    // Initialize storage
    IATStorage.initSession(respondentId, iatVersion, blockOrder, language);

    // Create engine
    this.engine = new IATEngine({
      iatVersion,
      blockOrder,
      onStateChange: (state) => this._handleState(state),
      onTrialEnd: (data) => this._handleTrialEnd(data),
      onBlockEnd: (trials, info) => this._handleBlockEnd(trials, info),
      onComplete: (allTrials) => this._handleComplete(allTrials),
    });

    // Bind input
    this._bindInput();

    // Start
    this.engine.start();
  },

  // --- State rendering ---

  _handleState(state) {
    const stimArea = document.getElementById('stimulus-area');
    const touchTargets = document.getElementById('touch-targets');
    const blockIntro = document.getElementById('block-intro');

    switch (state) {
      case 'BLOCK_INTRO':
        this._showBlockIntro();
        break;

      case 'FIXATION':
        blockIntro.classList.add('hidden');
        touchTargets.classList.add('disabled');
        stimArea.innerHTML = '<div class="fixation">+</div>';
        break;

      case 'STIMULUS':
      case 'AWAITING_RESPONSE': {
        const trial = this.engine.getCurrentStimulus();
        if (trial) {
          stimArea.innerHTML = `<div class="stimulus-word ${trial.category}">${trial.stimulus.word}</div>`;
          touchTargets.classList.remove('disabled');
        }
        this._updateProgress();
        break;
      }

      case 'FEEDBACK':
        touchTargets.classList.add('disabled');
        stimArea.innerHTML = '<div class="error-feedback">X</div>';
        break;

      case 'ITI':
        touchTargets.classList.add('disabled');
        stimArea.innerHTML = '';
        break;

      case 'COMPLETE':
        break;
    }
  },

  _showBlockIntro() {
    const info = this.engine.getCurrentBlockInfo();
    const blockIntro = document.getElementById('block-intro');

    // Build category labels HTML
    const leftHTML = info.leftLabels.map(l => {
      const cls = this._labelClass(l, info.targetLabel);
      return `<span class="category-label ${cls}">${l}</span>`;
    }).join('');

    const rightHTML = info.rightLabels.map(l => {
      const cls = this._labelClass(l, info.targetLabel);
      return `<span class="category-label ${cls}">${l}</span>`;
    }).join('');

    const isFirst = info.blockIndex === 0;
    const instructionText = isFirst
      ? 'Sort each word as fast as you can by pressing the LEFT or RIGHT side of the screen (or E / I keys). If you make a mistake, a red X will appear — just keep going.'
      : 'The categories have changed. Look at the new labels above and sort accordingly.';

    blockIntro.innerHTML = `
      <h2>Block ${info.blockIndex + 1} of ${info.totalBlocks}: ${info.blockDef.label}</h2>
      <div class="mapping">
        <div class="mapping-side">
          <h3>Left (E key)</h3>
          <div class="mapping-labels">${leftHTML}</div>
        </div>
        <div class="mapping-side">
          <h3>Right (I key)</h3>
          <div class="mapping-labels">${rightHTML}</div>
        </div>
      </div>
      <p class="instruction-text">${instructionText}</p>
      <button class="continue-btn" id="continue-btn">Press to Begin</button>
    `;

    blockIntro.classList.remove('hidden');

    // Also update the persistent category labels
    this._updateCategoryLabels(info);

    // Bind continue button
    document.getElementById('continue-btn').addEventListener('click', () => {
      this.engine.proceedFromIntro();
    });
  },

  _updateCategoryLabels(info) {
    const leftGroup = document.getElementById('left-labels');
    const rightGroup = document.getElementById('right-labels');

    leftGroup.innerHTML = info.leftLabels.map(l => {
      const cls = this._labelClass(l, info.targetLabel);
      return `<span class="category-label ${cls}">${l}</span>`;
    }).join('');

    rightGroup.innerHTML = info.rightLabels.map(l => {
      const cls = this._labelClass(l, info.targetLabel);
      return `<span class="category-label ${cls}">${l}</span>`;
    }).join('');
  },

  _labelClass(label, targetLabel) {
    if (label === 'GOOD') return 'good';
    if (label === 'BAD') return 'bad';
    if (label === targetLabel) return 'target';
    return '';
  },

  _updateProgress() {
    const total = IAT_CONFIG.trialsPerBlock * this.engine.blockSequence.length;
    const done = (this.engine.currentBlockIndex * IAT_CONFIG.trialsPerBlock) + this.engine.currentTrialIndex;
    const pct = Math.round((done / total) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').textContent =
      `Block ${this.engine.currentBlockIndex + 1}/${this.engine.blockSequence.length} | Trial ${this.engine.currentTrialIndex + 1}/${IAT_CONFIG.trialsPerBlock}`;
  },

  // --- Event handlers ---

  _handleTrialEnd(data) {
    IATStorage.recordTrial(data);
  },

  _handleBlockEnd(trials, info) {
    // Auto-save is handled per trial already
  },

  _handleComplete(allTrials) {
    const results = IATScoring.compute(allTrials);
    const session = IATStorage.getSession();
    IATStorage.completeSession(results.dScore, results.errorRate, results.meanRT);

    // Navigate to results
    window.location.href = 'results.html';
  },

  // --- Input binding ---

  _bindInput() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (IAT_CONFIG.keys.left.includes(e.key)) {
        e.preventDefault();
        this.engine.respond('left');
      } else if (IAT_CONFIG.keys.right.includes(e.key)) {
        e.preventDefault();
        this.engine.respond('right');
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Space/Enter to dismiss block intro
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
          e.preventDefault();
          continueBtn.click();
        }
      }
    });

    // Touch
    document.getElementById('touch-left').addEventListener('click', () => {
      this.engine.respond('left');
    });
    document.getElementById('touch-right').addEventListener('click', () => {
      this.engine.respond('right');
    });
  },
};

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => IATUI.init());
