// ============================================================
// storage.js — Session persistence and export
// ============================================================

const IATStorage = {
  KEY: 'iat_session',

  init({ respId, instrumentId, arm, seed }) {
    const session = {
      resp_id: respId,
      instrument_id: instrumentId,
      instrument_title: IAT_CONFIG.getInstrument(instrumentId).title,
      order_arm: arm,
      seed: seed,
      options: {
        dropConditionalSwahili: IAT_CONFIG.options.dropConditionalSwahili,
        block5Trials: IAT_CONFIG.options.block5Trials,
      },
      error_handling: IAT_CONFIG.scoring.errorHandling,
      start_time: new Date().toISOString(),
      end_time: null,
      completed: false,
      skipped: false,
      trials: [],
    };
    this._save(session);
    return session;
  },

  get() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : null;
  },

  recordTrial(t) {
    const s = this.get();
    if (!s) return;
    s.trials.push(t);
    this._save(s);
  },

  complete(results) {
    const s = this.get();
    if (!s) return;
    s.end_time = new Date().toISOString();
    s.completed = true;
    s.d_score = results.d;
    s.error_rate = results.diagnostics.error_rate;
    s.pct_fast = results.diagnostics.pct_fast;
    this._save(s);
  },

  // Record that a safety-gated instrument was declined.
  markSkipped(reason) {
    const s = this.get();
    if (!s) return;
    s.end_time = new Date().toISOString();
    s.skipped = true;
    s.skip_reason = reason || 'enumerator_skip';
    this._save(s);
  },

  clear() { localStorage.removeItem(this.KEY); },

  exportJSON() { return JSON.stringify(this.get(), null, 2); },

  exportCSV() {
    const s = this.get();
    if (!s || !s.trials.length) return '';
    const cols = [
      'resp_id', 'instrument_id', 'order_arm', 'seed',
      'block', 'block_fn', 'is_test', 'pairing', 'trial_no',
      'stimulus', 'stim_modality', 'category', 'response_key', 'correct', 'rt_ms',
    ];
    const rows = s.trials.map(t => [
      s.resp_id, s.instrument_id, s.order_arm, s.seed,
      t.block, t.block_fn, t.is_test ? 1 : 0, t.pairing || '', t.trial_no,
      t.stimulus, t.stim_modality, t.category, t.response_key, t.correct, t.rt_ms,
    ]);
    return [cols.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  download(content, filename, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  _save(s) { localStorage.setItem(this.KEY, JSON.stringify(s)); },
};
