// ============================================================
// ui.js — DOM controller for the IAT task
// ============================================================

const IATUI = {
  init() {
    const p = new URLSearchParams(location.search);
    const respId = p.get('rid') || 'R_' + Date.now();
    const arm = p.get('arm') || 'national_first';
    const seed = parseInt(p.get('seed'), 10) || (Date.now() % 2147483647);

    if (p.get('swahili') === '0') IAT_CONFIG.useConditionalSwahili = false;
    if (p.get('b5')) IAT_CONFIG.block5Trials = parseInt(p.get('b5'), 10);

    IATStorage.init({ respId, arm, seed });

    this.engine = new IATEngine({
      arm,
      seed,
      onStateChange: s => this._render(s),
      onTrialEnd: t => IATStorage.recordTrial(t),
      onComplete: all => this._finish(all),
    });

    this._bindInput();
    this.engine.start();
  },

  // --- Rendering ---

  _render(state) {
    const area = document.getElementById('stimulus-area');
    const touch = document.getElementById('touch-targets');
    const intro = document.getElementById('block-intro');

    switch (state) {
      case 'BLOCK_INTRO':
        this._showIntro();
        break;

      case 'FIXATION':
        intro.classList.add('hidden');
        touch.classList.add('disabled');
        area.innerHTML = '<div class="fixation">+</div>';
        break;

      case 'STIMULUS':
      case 'AWAITING_RESPONSE': {
        const trial = this.engine.getCurrentTrial();
        if (trial) {
          area.innerHTML = this._stimulusHTML(trial.stim);
          if (trial.stim.modality === 'audio') this._speak(trial.stim.label);
          touch.classList.remove('disabled');
        }
        this._updateProgress();
        break;
      }

      case 'FEEDBACK':
        touch.classList.add('disabled');
        area.innerHTML = '<div class="error-feedback">✕</div>';
        break;

      case 'ITI':
        touch.classList.add('disabled');
        area.innerHTML = '';
        break;
    }
  },

  // Image assets are placeholders until the real files land; the frame
  // falls back to a caption if the file is missing.
  _stimulusHTML(stim) {
    if (stim.modality === 'image') {
      return `
        <div class="stim-image">
          <div class="frame">
            <img src="${stim.asset}" alt=""
                 onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'caption',textContent:'${stim.label}'}))">
          </div>
          <div class="modality-tag">IMAGE</div>
        </div>`;
    }
    return `
      <div class="stim-audio">
        <div class="word">${stim.label}</div>
        <div class="modality-tag">AUDIO</div>
      </div>`;
  },

  // Stand-in for the recorded clips so the task is testable now.
  _speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'sw-KE';
    u.rate = 1.0;
    speechSynthesis.speak(u);
  },

  _showIntro() {
    const info = this.engine.getBlockInfo();
    const intro = document.getElementById('block-intro');

    const labelHTML = cats => cats
      .map(c => `<span class="category-label">${c.label}${c.sublabel ? `<span class="sub">${c.sublabel}</span>` : ''}</span>`)
      .join('<span class="label-or">OR</span>');

    const first = info.index === 0;
    const combined = info.left.length > 1;

    const text = first
      ? 'Sort each item as fast as you can. Press <strong>E</strong> or tap the left side of the screen for the category on the left; press <strong>I</strong> or tap the right side for the category on the right. A ✕ appears if you are wrong — keep going.'
      : combined
        ? 'Two categories now share each key. Sort each item by whichever category it belongs to.'
        : 'The categories have changed. Check the labels above before you begin.';

    intro.innerHTML = `
      <div class="eyebrow">BLOCK ${info.index + 1} OF ${info.total} · ${info.trials} TRIALS</div>
      <h2>${info.label}</h2>
      <div class="mapping">
        <div class="mapping-side">
          <h3>LEFT · E KEY</h3>
          <div class="mapping-labels">${labelHTML(info.leftLabels)}</div>
        </div>
        <div class="mapping-side">
          <h3>RIGHT · I KEY</h3>
          <div class="mapping-labels">${labelHTML(info.rightLabels)}</div>
        </div>
      </div>
      <p class="instruction-text">${text}</p>
      <button class="continue-btn" id="continue-btn">Begin</button>`;

    intro.classList.remove('hidden');

    document.getElementById('left-labels').innerHTML = labelHTML(info.leftLabels)
      + '<span class="key-hint">E</span>';
    document.getElementById('right-labels').innerHTML = labelHTML(info.rightLabels)
      + '<span class="key-hint">I</span>';

    document.getElementById('continue-btn')
      .addEventListener('click', () => this.engine.proceedFromIntro());
  },

  _updateProgress() {
    const p = this.engine.progress();
    const info = this.engine.getBlockInfo();
    document.getElementById('progress-fill').style.width = p.pct + '%';
    document.getElementById('progress-text').textContent =
      `Block ${info.index + 1}/${info.total} · trial ${this.engine.trialIndex + 1}/${info.trials}`;
  },

  // --- Input ---

  _bindInput() {
    document.addEventListener('keydown', e => {
      if (IAT_CONFIG.keys.left.includes(e.key)) {
        e.preventDefault();
        this.engine.respond('left');
      } else if (IAT_CONFIG.keys.right.includes(e.key)) {
        e.preventDefault();
        this.engine.respond('right');
      } else if (e.key === ' ' || e.key === 'Enter') {
        const btn = document.getElementById('continue-btn');
        if (btn && !document.getElementById('block-intro').classList.contains('hidden')) {
          e.preventDefault();
          btn.click();
        }
      }
    });

    document.getElementById('touch-left')
      .addEventListener('click', () => this.engine.respond('left'));
    document.getElementById('touch-right')
      .addEventListener('click', () => this.engine.respond('right'));
  },

  _finish(allTrials) {
    const results = IATScoring.compute(allTrials);
    IATStorage.complete(results);
    location.href = 'results.html';
  },
};

document.addEventListener('DOMContentLoaded', () => IATUI.init());
