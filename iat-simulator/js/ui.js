// ============================================================
// ui.js — DOM controller for the task page
// ============================================================

const IATUI = {
  init() {
    const p = new URLSearchParams(location.search);
    this.respId = p.get('rid') || 'R_' + Date.now();
    this.instrumentId = p.get('inst') || 'national_regional';
    this.arm = p.get('arm') || 'A_first';
    this.seed = parseInt(p.get('seed'), 10) || (Date.now() % 2147483647);

    if (p.get('swahili') === '0') IAT_CONFIG.options.dropConditionalSwahili = true;
    if (p.get('b5')) IAT_CONFIG.options.block5Trials = parseInt(p.get('b5'), 10);

    this.instrument = IAT_CONFIG.getInstrument(this.instrumentId);
    IATStorage.init({ respId: this.respId, instrumentId: this.instrumentId, arm: this.arm, seed: this.seed });

    this.engine = new IATEngine({
      instrumentId: this.instrumentId,
      arm: this.arm,
      seed: this.seed,
      onStateChange: s => this._render(s),
      onTrialEnd: t => IATStorage.recordTrial(t),
      onComplete: all => this._finish(all),
    });

    this._bindInput();

    // Safety-gated instruments must clear the gate before any trial.
    if (this.instrument.safetyGated) {
      this._showSafetyGate();
    } else {
      this.engine.start();
    }
  },

  // --- Safety gate (IAT #2) ---

  _showSafetyGate() {
    const g = this.instrument.safetyGate;
    const intro = document.getElementById('block-intro');

    const checks = g.confirmations.map((c, i) =>
      `<label class="gate-check"><input type="checkbox" class="gate-box" data-i="${i}"> <span>${c}</span></label>`
    ).join('');

    intro.innerHTML = `
      <div class="gate">
        <div class="gate-flag">⛔ ${g.title}</div>
        <p class="gate-body">${g.body}</p>
        <div class="gate-checks">${checks}</div>
        <div class="gate-actions">
          <button class="continue-btn" id="gate-begin" disabled>Begin instrument</button>
          ${g.allowSkip ? '<button class="skip-btn" id="gate-skip">Skip this IAT</button>' : ''}
        </div>
      </div>`;
    intro.classList.remove('hidden');

    const boxes = [...intro.querySelectorAll('.gate-box')];
    const beginBtn = document.getElementById('gate-begin');
    boxes.forEach(b => b.addEventListener('change', () => {
      beginBtn.disabled = !boxes.every(x => x.checked);
    }));
    beginBtn.addEventListener('click', () => this.engine.start());

    const skip = document.getElementById('gate-skip');
    if (skip) skip.addEventListener('click', () => {
      IATStorage.markSkipped('enumerator_skip');
      location.href = 'results.html';
    });
  },

  // --- State rendering ---

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

  // Browser TTS stands in for the recorded clips until they land.
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
      ? 'Sort each item as fast as you can. Press <strong>E</strong> or tap the left of the screen for the category on the left; <strong>I</strong> or the right of the screen for the category on the right. A ✕ appears if you are wrong — keep going.'
      : combined
        ? 'Two categories now share each key. Sort each item by whichever category it belongs to.'
        : 'The categories have changed. Check the labels above before you begin.';

    intro.innerHTML = `
      <div class="eyebrow">${this.instrument.short.toUpperCase()} · BLOCK ${info.index + 1} OF ${info.total} · ${info.trials} TRIALS</div>
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

    document.getElementById('left-labels').innerHTML = labelHTML(info.leftLabels) + '<span class="key-hint">E</span>';
    document.getElementById('right-labels').innerHTML = labelHTML(info.rightLabels) + '<span class="key-hint">I</span>';

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
        const intro = document.getElementById('block-intro');
        if (btn && !intro.classList.contains('hidden')) { e.preventDefault(); btn.click(); }
      }
    });
    document.getElementById('touch-left').addEventListener('click', () => this.engine.respond('left'));
    document.getElementById('touch-right').addEventListener('click', () => this.engine.respond('right'));
  },

  _finish(allTrials) {
    const results = IATScoring.compute(allTrials, this.instrumentId);
    IATStorage.complete(results);
    location.href = 'results.html';
  },
};

document.addEventListener('DOMContentLoaded', () => IATUI.init());

// Expose for debugging / field diagnostics (harmless in production).
window.IATUI = IATUI;
