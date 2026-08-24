// ============================================================
// validation.js — Pre-field stimulus checks
//
// Surfaces the validation flags recorded in the spec (gender
// balance, public figures, group balance) so they are visible
// at setup rather than discovered in analysis. These are
// warnings for the field team, not hard blocks.
// ============================================================

const IATValidation = {
  check(instrumentId) {
    const inst = IAT_CONFIG.getInstrument(instrumentId);
    const warnings = [];

    const targets = [inst.targetA.key, inst.targetB.key];
    const sets = targets.map(k => IAT_CONFIG.resolveStimuli(instrumentId, k));

    // Count balance across the two target sets.
    if (sets[0].length !== sets[1].length) {
      warnings.push(`Target sets differ in size: ${inst.targetA.key}=${sets[0].length}, ${inst.targetB.key}=${sets[1].length}.`);
    }

    // Modality balance within each target set.
    targets.forEach((k, i) => {
      const img = sets[i].filter(s => s.modality === 'image').length;
      const aud = sets[i].filter(s => s.modality === 'audio').length;
      if (img > 0 && aud > 0 && img !== aud) {
        warnings.push(`${k}: modality imbalance (${img} image / ${aud} audio) — leaks modality into D.`);
      }
    });

    // Gender composition, where tagged.
    const genderProfile = set => {
      const c = { m: 0, f: 0, u: 0 };
      set.forEach(s => { if (s.gender) c[s.gender] = (c[s.gender] || 0) + 1; });
      return c;
    };
    if (sets.every(s => s.some(x => x.gender))) {
      const a = genderProfile(sets[0]);
      const b = genderProfile(sets[1]);
      const gap = Math.abs(a.m - b.m) + Math.abs(a.f - b.f);
      if (gap > 0) {
        warnings.push(`Gender composition differs across target sets (${inst.targetA.key}: ${a.m}m/${a.f}f/${a.u}u vs ${inst.targetB.key}: ${b.m}m/${b.f}f/${b.u}u). Match across columns or hold single-gender.`);
      }
    }

    // Public figures.
    sets.flat().filter(s => s.publicFigure).forEach(s => {
      warnings.push(`"${s.label}" may collide with a public figure — swap before fielding.`);
    });

    // Own-group confound note for the balanced-"us" design.
    const groups = new Set(sets.flat().map(s => s.group).filter(Boolean));
    if (instrumentId === 'banyarwanda_bias') {
      warnings.push(`"Us" set spans ${[...groups].filter(g => g !== 'Rwandophone').join(', ')}. A respondent from one of these groups still hears own-group names in "us"; balance mitigates but does not eliminate the confound. Consider an own-group screener.`);
    }

    return warnings;
  },
};
