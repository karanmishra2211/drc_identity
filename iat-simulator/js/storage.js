// ============================================================
// storage.js — Data persistence and export
// ============================================================

const IATStorage = {
  STORAGE_KEY: 'iat_session',

  // Initialize a new session
  initSession(respondentId, iatVersion, blockOrder, language) {
    const session = {
      respondent_id: respondentId,
      iat_version: iatVersion,
      block_order: blockOrder,
      language: language,
      start_time: new Date().toISOString(),
      end_time: null,
      trials: [],
      completed: false,
    };
    this._save(session);
    return session;
  },

  // Get current session
  getSession() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  // Record a single trial
  recordTrial(trialData) {
    const session = this.getSession();
    if (!session) return;
    session.trials.push(trialData);
    this._save(session);
  },

  // Record a batch of trials (after a block)
  recordBlock(trials) {
    const session = this.getSession();
    if (!session) return;
    session.trials.push(...trials);
    this._save(session);
  },

  // Mark session complete
  completeSession(dScore, errorRate, meanRT) {
    const session = this.getSession();
    if (!session) return;
    session.end_time = new Date().toISOString();
    session.completed = true;
    session.d_score = dScore;
    session.error_rate = errorRate;
    session.mean_rt = meanRT;
    this._save(session);
  },

  // Clear current session
  clearSession() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Export session as JSON string
  exportJSON() {
    const session = this.getSession();
    return JSON.stringify(session, null, 2);
  },

  // Export trials as CSV string
  exportCSV() {
    const session = this.getSession();
    if (!session || !session.trials.length) return '';

    const header = [
      'respondent_id', 'iat_version', 'block_order', 'language',
      'block_num', 'block_type', 'is_test_block', 'trial_num',
      'stimulus_id', 'stimulus_word', 'stimulus_category',
      'expected_side', 'response_side', 'rt_ms', 'correct',
    ];

    const rows = session.trials.map(t => [
      session.respondent_id,
      session.iat_version,
      session.block_order,
      session.language,
      t.block_num,
      t.block_type,
      t.is_test_block ? 1 : 0,
      t.trial_num,
      t.stimulus_id,
      t.stimulus_word,
      t.stimulus_category,
      t.expected_side,
      t.response_side,
      t.rt_ms,
      t.correct ? 1 : 0,
    ]);

    return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  // Trigger file download
  download(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  _save(session) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  },
};
