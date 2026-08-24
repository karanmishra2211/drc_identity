// ============================================================
// scoring.js — Greenwald improved D, generic across instruments
//
// Each instrument names targetA (positive-D pole) and targetB.
//   posPairing = `${targetA.key}_good`
//   negPairing = `${targetB.key}_good`
//   D = ( mean RT[negPairing] − mean RT[posPairing] ) / SD_pooled
// D > 0  =  targetA + Good is faster.
//
// Scoring reads the per-trial `pairing` field, never the block
// number, so the counterbalancing arm cannot flip the sign.
// ============================================================

const IATScoring = {
  compute(trials, instrumentId) {
    const inst = IAT_CONFIG.getInstrument(instrumentId);
    const posPairing = `${inst.targetA.key}_good`;
    const negPairing = `${inst.targetB.key}_good`;
    const cfg = IAT_CONFIG.scoring;

    const primary = this._score(trials.filter(t => t.is_test), posPairing, negPairing, cfg);
    const robustness = this._score(trials.filter(t => t.pairing !== null), posPairing, negPairing, cfg);

    return {
      d: primary.d,
      posPairing,
      negPairing,
      primary,
      robustness,
      diagnostics: this._diagnostics(trials, cfg),
    };
  },

  _score(trials, posPairing, negPairing, cfg) {
    const pos = trials.filter(t => t.pairing === posPairing);
    const neg = trials.filter(t => t.pairing === negPairing);

    const posRT = this._latencies(pos, cfg);
    const negRT = this._latencies(neg, cfg);

    const meanPos = this._mean(posRT);
    const meanNeg = this._mean(negRT);
    const sd = this._sd([...posRT, ...negRT]);

    return {
      d: sd > 0 ? this._round((meanNeg - meanPos) / sd, 3) : 0,
      meanTargetAGood: Math.round(meanPos),
      meanTargetBGood: Math.round(meanNeg),
      sdPooled: Math.round(sd),
      nTrials: posRT.length + negRT.length,
    };
  },

  // Apply the pre-registered error rule and the max-RT cutoff.
  _latencies(trials, cfg) {
    const kept = trials.filter(t => t.rt_ms <= IAT_CONFIG.timing.maxRT);
    if (cfg.errorHandling === 'enforced') return kept.map(t => t.rt_ms);

    const correct = kept.filter(t => t.correct === 1).map(t => t.rt_ms);
    const blockMean = this._mean(correct);
    return kept.map(t => t.correct === 1 ? t.rt_ms : blockMean + cfg.errorPenaltyMs);
  },

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

    // Modality gap (only meaningful for mixed-modality instruments).
    const audio = combined.filter(t => t.stim_modality === 'audio' && t.correct === 1).map(t => t.rt_ms);
    const image = combined.filter(t => t.stim_modality === 'image' && t.correct === 1).map(t => t.rt_ms);
    const modalityGap = (audio.length && image.length)
      ? Math.round(this._mean(audio) - this._mean(image)) : null;
    if (modalityGap !== null && Math.abs(modalityGap) > 150) {
      flags.push(`Audio RTs run ${modalityGap}ms longer than image RTs — inflates within-subject variance`);
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

  interpret(d, instrumentId) {
    const inst = IAT_CONFIG.getInstrument(instrumentId);
    if (d > 0.15) return inst.interp.pos;
    if (d < -0.15) return inst.interp.neg;
    return inst.interp.neutral;
  },

  effectSize(d) {
    const a = Math.abs(d);
    if (a >= 0.65) return 'Large';
    if (a >= 0.35) return 'Medium';
    if (a >= 0.15) return 'Small';
    return 'Negligible';
  },

  _mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; },
  _sd(a) {
    if (a.length < 2) return 0;
    const m = this._mean(a);
    return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
  },
  _round(v, p) { const f = 10 ** p; return Math.round(v * f) / f; },
};
