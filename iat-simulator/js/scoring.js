// ============================================================
// scoring.js — D-score algorithm (Greenwald et al., 2003)
// ============================================================

const IATScoring = {
  /**
   * Compute the D-score from trial-level data.
   * @param {Array} trials - All trial data from the session
   * @param {string} blockOrder - 'A' or 'B' (which block order was used)
   * @returns {Object} { dScore, meanCompatible, meanIncompatible, sdPooled, errorRate, meanRT, flags }
   */
  compute(trials) {
    // Step 0: Identify test blocks (compatible and incompatible)
    const testTrials = trials.filter(t => t.is_test_block);
    const compatibleTrials = testTrials.filter(t => t.block_type === 'compatible');
    const incompatibleTrials = testTrials.filter(t => t.block_type === 'incompatible');

    // Step 1: Data cleaning flags
    const flags = [];

    // Remove trials with RT > 10,000ms
    const cleanCompatible = compatibleTrials.filter(t => t.rt_ms <= IAT_CONFIG.timing.maxRT);
    const cleanIncompatible = incompatibleTrials.filter(t => t.rt_ms <= IAT_CONFIG.timing.maxRT);
    const removedSlow = testTrials.length - cleanCompatible.length - cleanIncompatible.length;
    if (removedSlow > 0) flags.push(`Removed ${removedSlow} trials with RT > 10s`);

    // Check for fast responding (RT < 300ms)
    const allClean = [...cleanCompatible, ...cleanIncompatible];
    const fastTrials = allClean.filter(t => t.rt_ms < IAT_CONFIG.timing.minRT);
    const fastPercent = allClean.length > 0 ? fastTrials.length / allClean.length : 0;
    if (fastPercent > IAT_CONFIG.timing.minRTPercent) {
      flags.push(`WARNING: ${(fastPercent * 100).toFixed(1)}% of trials < ${IAT_CONFIG.timing.minRT}ms (random responding?)`);
    }

    // Check overall error rate
    const totalErrors = allClean.filter(t => !t.correct).length;
    const errorRate = allClean.length > 0 ? totalErrors / allClean.length : 0;
    if (errorRate > IAT_CONFIG.timing.maxErrorRate) {
      flags.push(`WARNING: Error rate ${(errorRate * 100).toFixed(1)}% exceeds ${IAT_CONFIG.timing.maxErrorRate * 100}% threshold`);
    }

    // Step 2: Mean RTs for correct trials only
    const correctCompatible = cleanCompatible.filter(t => t.correct);
    const correctIncompatible = cleanIncompatible.filter(t => t.correct);

    const meanCompatible = this._mean(correctCompatible.map(t => t.rt_ms));
    const meanIncompatible = this._mean(correctIncompatible.map(t => t.rt_ms));

    // Step 3: Pooled SD across both test blocks (correct trials)
    const allCorrectRTs = [
      ...correctCompatible.map(t => t.rt_ms),
      ...correctIncompatible.map(t => t.rt_ms),
    ];
    const sdPooled = this._sd(allCorrectRTs);

    // Step 4: D-score = (Mean_Incompatible - Mean_Compatible) / SD_pooled
    const dScore = sdPooled > 0 ? (meanIncompatible - meanCompatible) / sdPooled : 0;

    // Overall mean RT
    const meanRT = this._mean(allClean.map(t => t.rt_ms));

    return {
      dScore: Math.round(dScore * 1000) / 1000,
      meanCompatible: Math.round(meanCompatible),
      meanIncompatible: Math.round(meanIncompatible),
      sdPooled: Math.round(sdPooled),
      errorRate: Math.round(errorRate * 1000) / 1000,
      meanRT: Math.round(meanRT),
      totalTrials: allClean.length,
      flags,
      interpretation: this._interpret(dScore),
      effectSize: this._effectSize(dScore),
    };
  },

  _mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  _sd(arr) {
    if (arr.length < 2) return 0;
    const m = this._mean(arr);
    const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  },

  _interpret(d) {
    if (d > 0.15) return 'Positive implicit attitude toward target';
    if (d < -0.15) return 'Negative implicit attitude toward target';
    return 'Neutral implicit attitude';
  },

  _effectSize(d) {
    const abs = Math.abs(d);
    if (abs >= 0.65) return 'Large';
    if (abs >= 0.35) return 'Medium';
    if (abs >= 0.15) return 'Small';
    return 'Negligible';
  },
};
