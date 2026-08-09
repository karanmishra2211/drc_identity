// ============================================================
// scoring.js — Greenwald improved D algorithm
//
// SIGN CONVENTION (locked, never flip):
//   D = ( mean RT[regional+good] − mean RT[national+good] ) / SD_pooled
//   D > 0  =  faster when National + Good share a key
//          =  stronger implicit NATIONAL identity
//
// Scoring keys on PAIRING TYPE, not presentation position, so the
// counterbalancing arm cannot flip the sign.
// ============================================================

const IATScoring = {
  compute(trials) {
    const cfg = IAT_CONFIG.scoring;

    // Primary: test blocks only. Robustness: practice + test.
    const primary = this._score(trials.filter(t => t.is_test), cfg);
    const robustness = this._score(trials.filter(t => t.pairing !== null), cfg);

    return {
      d_national: primary.d,
      primary,
      robustness,
      diagnostics: this._diagnostics(trials, cfg),
    };
  },

  // --- Core D computation over a set of combined-block trials ---

  _score(trials, cfg) {
    const nat = trials.filter(t => t.pairing === 'national_good');
    const reg = trials.filter(t => t.pairing === 'regional_good');

    const natRT = this._latencies(nat, cfg);
    const regRT = this._latencies(reg, cfg);

    const meanNat = this._mean(natRT);
    const meanReg = this._mean(regRT);

    // Pooled SD across both conditions (inclusive SD, per Greenwald 2003)
    const sd = this._sd([...natRT, ...regRT]);

    return {
      d: sd > 0 ? this._round((meanReg - meanNat) / sd, 3) : 0,
      meanNationalGood: Math.round(meanNat),
      meanRegionalGood: Math.round(meanReg),
      sdPooled: Math.round(sd),
      nTrials: natRT.length + regRT.length,
    };
  },

  // Apply the pre-registered error-handling rule and max-RT cutoff.
  _latencies(trials, cfg) {
    const kept = trials.filter(t => t.rt_ms <= IAT_CONFIG.timing.maxRT);

    if (cfg.errorHandling === 'enforced') {
      // Latency already runs to the corrected response; no penalty.
      return kept.map(t => t.rt_ms);
    }

    // 'penalty': error latencies become block mean (correct trials) + 600ms
    const correct = kept.filter(t => t.correct === 1).map(t => t.rt_ms);
    const blockMean = this._mean(correct);
    return kept.map(t =>
      t.correct === 1 ? t.rt_ms : blockMean + cfg.errorPenaltyMs
    );
  },

  // --- Subject-level quality diagnostics ---

  _diagnostics(trials, cfg) {
    const combined = trials.filter(t => t.pairing !== null);
    const flags = [];

    const fast = combined.filter(t => t.rt_ms < cfg.fastTrialThreshold);
    const pctFast = combined.length ? fast.length / combined.length : 0;
    if (pctFast > cfg.fastTrialSubjectLimit) {
      flags.push(`${(pctFast * 100).toFixed(1)}% of trials under ${cfg.fastTrialThreshold}ms — possible random responding`);
    }

    const errors = combined.filter(t => t.correct === 0);
    const errorRate = combined.length ? errors.length / combined.length : 0;
    if (errorRate > cfg.maxErrorRate) {
      flags.push(`Error rate ${(errorRate * 100).toFixed(1)}% exceeds the ${(cfg.maxErrorRate * 100)}% threshold`);
    }

    // Modality gap: audio stimuli carry a duration that images do not,
    // so audio RTs run longer. A large gap inflates the pooled SD and
    // shrinks D. Reported so the cost is visible, not hidden.
    const audio = combined.filter(t => t.stim_modality === 'audio' && t.correct === 1).map(t => t.rt_ms);
    const image = combined.filter(t => t.stim_modality === 'image' && t.correct === 1).map(t => t.rt_ms);
    const modalityGap = (audio.length && image.length)
      ? Math.round(this._mean(audio) - this._mean(image))
      : null;
    if (modalityGap !== null && Math.abs(modalityGap) > 150) {
      flags.push(`Audio RTs run ${modalityGap}ms longer than image RTs — inflates pooled SD`);
    }

    return {
      error_rate: this._round(errorRate, 3),
      pct_fast: this._round(pctFast, 3),
      mean_rt: Math.round(this._mean(combined.map(t => t.rt_ms))),
      mean_rt_audio: audio.length ? Math.round(this._mean(audio)) : null,
      mean_rt_image: image.length ? Math.round(this._mean(image)) : null,
      modality_gap_ms: modalityGap,
      n_trials: trials.length,
      flags,
    };
  },

  // --- Interpretation helpers ---

  interpret(d) {
    if (d > 0.15) return 'Stronger implicit national identity';
    if (d < -0.15) return 'Stronger implicit regional identity';
    return 'No clear directional association';
  },

  effectSize(d) {
    const a = Math.abs(d);
    if (a >= 0.65) return 'Large';
    if (a >= 0.35) return 'Medium';
    if (a >= 0.15) return 'Small';
    return 'Negligible';
  },

  // --- Math ---

  _mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; },

  _sd(a) {
    if (a.length < 2) return 0;
    const m = this._mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
  },

  _round(v, p) { const f = 10 ** p; return Math.round(v * f) / f; },
};
