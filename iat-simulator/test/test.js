// Node test harness for the IAT battery. Run: node test/test.js
const fs = require('fs');
const dir = __dirname + '/../js/';
const load = f => fs.readFileSync(dir + f, 'utf8');

global.performance = { now: () => Date.now() };
const geval = eval;
geval(load('config.js')     + '\nglobalThis.IAT_CONFIG = IAT_CONFIG;');
geval(load('validation.js') + '\nglobalThis.IATValidation = IATValidation;');
geval(load('scoring.js')    + '\nglobalThis.IATScoring = IATScoring;');
geval(load('engine.js')     + '\nglobalThis.IATEngine = IATEngine;');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); if (!c) fail++; };
const INSTRUMENTS = ['national_regional', 'banyarwanda_bias'];

// ---- 1. Block structure, both instruments, both arms ----
console.log('\n1. Block structure');
for (const inst of INSTRUMENTS) {
  for (const arm of ['A_first', 'B_first']) {
    const e = new IATEngine({ instrumentId: inst, arm, seed: 42 });
    const total = e.blocks.reduce((s, b) => s + b.trials, 0);
    ok(e.blocks.length === 7, `${inst}/${arm}: 7 blocks`);
    ok(total === 200, `${inst}/${arm}: 200 trials (got ${total})`);

    const tests = e.blocks.filter(b => b.isTest);
    const A = IAT_CONFIG.getInstrument(inst).targetA.key;
    const B = IAT_CONFIG.getInstrument(inst).targetB.key;
    const pairings = tests.map(b => b.pairing).sort();
    ok(pairings.length === 2 && pairings.includes(`${A}_good`) && pairings.includes(`${B}_good`),
       `${inst}/${arm}: test blocks cover both pairings (${pairings.join(', ')})`);

    const combined = e.blocks.filter(b => b.pairing);
    ok(combined.every(b => b.left.includes('good')), `${inst}/${arm}: GOOD pinned left`);
    ok(combined.every(b => b.right.includes('bad')), `${inst}/${arm}: BAD pinned right`);
  }
}

// ---- 2. Trial generation balance ----
console.log('\n2. Trial generation');
for (const inst of INSTRUMENTS) {
  const e = new IATEngine({ instrumentId: inst, arm: 'A_first', seed: 7 });
  for (const blk of e.blocks) {
    const trials = e._generateTrials(blk);
    ok(trials.length === blk.trials, `${inst} block ${blk.n}: ${blk.trials} trials`);
    const counts = {};
    trials.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
    const vals = Object.values(counts);
    ok(vals.every(v => v === vals[0]), `${inst} block ${blk.n}: balanced ${JSON.stringify(counts)}`);
    const validCats = blk.left.concat(blk.right);
    ok(trials.every(t => validCats.includes(t.category)), `${inst} block ${blk.n}: categories valid`);
  }
}

// ---- 3. Seed reproducibility ----
console.log('\n3. Seed reproducibility');
{
  const seq = (inst, seed) => new IATEngine({ instrumentId: inst, arm: 'A_first', seed })
    ._generateTrials({ n: 4, trials: 40, kinds: ['target', 'attribute'], left: [], right: [], phase: 'first' })
    .map(t => t.stim.id).join(',');
  ok(seq('national_regional', 999) === seq('national_regional', 999), 'Same seed → same order');
  ok(seq('national_regional', 999) !== seq('national_regional', 1000), 'Different seed → different order');
}

// ---- 4. SIGN CONVENTION — both instruments, both arms ----
console.log('\n4. Sign convention');
function synth(inst, arm, fastKey) {
  const e = new IATEngine({ instrumentId: inst, arm, seed: 5 });
  const out = [];
  for (const blk of e.blocks) {
    if (!blk.pairing) continue;
    const base = blk.pairing === `${fastKey}_good` ? 600 : 800;
    e._generateTrials(blk).forEach((t, i) => out.push({
      block: blk.n, block_fn: blk.fn, is_test: blk.isTest, pairing: blk.pairing,
      trial_no: i + 1, stimulus: t.stim.id, stim_modality: t.stim.modality,
      category: t.category, response_key: t.expectedSide, correct: 1,
      rt_ms: base + (i % 10) * 5,
    }));
  }
  return IATScoring.compute(out, inst).d;
}
for (const inst of INSTRUMENTS) {
  const A = IAT_CONFIG.getInstrument(inst).targetA.key;
  const B = IAT_CONFIG.getInstrument(inst).targetB.key;
  for (const arm of ['A_first', 'B_first']) {
    ok(synth(inst, arm, A) > 0, `${inst}/${arm}: faster on ${A}+Good → D > 0`);
    ok(synth(inst, arm, B) < 0, `${inst}/${arm}: faster on ${B}+Good → D < 0`);
  }
  const d1 = synth(inst, 'A_first', A);
  const d2 = synth(inst, 'B_first', A);
  ok(Math.abs(d1 - d2) < 0.05, `${inst}: both arms give identical D (${d1} vs ${d2})`);
}

// ---- 5. Error penalty ----
console.log('\n5. Error handling');
{
  const mk = (pairing, rt, correct) => ({
    block: 4, block_fn: 'combined_test', is_test: true, pairing,
    trial_no: 1, stimulus: 'x', stim_modality: 'audio', category: 'national',
    response_key: 'left', correct, rt_ms: rt,
  });
  const trials = [
    ...Array(10).fill(0).map(() => mk('national_good', 600, 1)),
    ...Array(10).fill(0).map(() => mk('regional_good', 600, 1)),
  ];
  const clean = IATScoring.compute(trials, 'national_regional').d;
  const withErr = IATScoring.compute([...trials, mk('regional_good', 400, 0)], 'national_regional').d;
  ok(withErr > clean, `Error on B+Good raises its latency → D up (${clean} → ${withErr})`);
}

// ---- 6. Diagnostics ----
console.log('\n6. Diagnostics');
{
  const mk = (mod, rt, correct) => ({
    block: 4, block_fn: 'combined_test', is_test: true, pairing: 'national_good',
    trial_no: 1, stimulus: 'x', stim_modality: mod, category: 'national',
    response_key: 'left', correct, rt_ms: rt,
  });
  const t = [
    ...Array(20).fill(0).map(() => mk('audio', 900, 1)),
    ...Array(20).fill(0).map(() => mk('image', 500, 1)),
    ...Array(20).fill(0).map(() => mk('audio', 700, 0)),
  ];
  const g = IATScoring.compute(t, 'national_regional').diagnostics;
  ok(g.modality_gap_ms === 400, `Modality gap detected (${g.modality_gap_ms}ms)`);
  ok(g.flags.some(f => /within-subject variance/.test(f)), 'Modality gap flagged');
  ok(g.flags.some(f => /Error rate/.test(f)), 'High error rate flagged');
}

// ---- 7. Conditional Swahili swap (IAT #1) ----
console.log('\n7. Conditional Swahili');
{
  IAT_CONFIG.options.dropConditionalSwahili = false;
  let r = IAT_CONFIG.resolveStimuli('national_regional', 'regional');
  ok(r.length === 4 && r.some(s => s.id === 'kiswahili') && !r.some(s => s.id === 'mashariki'),
     'Included: Kiswahili present, Mashariki absent (4 total)');

  IAT_CONFIG.options.dropConditionalSwahili = true;
  r = IAT_CONFIG.resolveStimuli('national_regional', 'regional');
  ok(r.length === 4 && !r.some(s => s.id === 'kiswahili') && r.some(s => s.id === 'mashariki'),
     'Dropped: Mashariki swapped in (4 total)');
  const img = r.filter(s => s.modality === 'image').length;
  const aud = r.filter(s => s.modality === 'audio').length;
  ok(img === 2 && aud === 2, `Modality balance held (${img} image / ${aud} audio)`);
  IAT_CONFIG.options.dropConditionalSwahili = false;
}

// ---- 8. IAT #2 specifics ----
console.log('\n8. IAT #2 — Banyarwanda');
{
  const inst = IAT_CONFIG.getInstrument('banyarwanda_bias');
  ok(inst.safetyGated === true, 'Marked safety-gated');
  ok(inst.safetyGate && inst.safetyGate.confirmations.length === 3, 'Gate has 3 confirmations');

  const us = IAT_CONFIG.resolveStimuli('banyarwanda_bias', 'autochthonous');
  const them = IAT_CONFIG.resolveStimuli('banyarwanda_bias', 'banyarwanda');
  ok(us.length === 6 && them.length === 6, 'Six names per side');
  ok(us.every(s => s.modality === 'audio') && them.every(s => s.modality === 'audio'), 'All audio');

  const groups = new Set(us.map(s => s.group));
  ok(groups.size > 1, `"Us" spans multiple groups (${[...groups].join(', ')})`);

  const warnings = IATValidation.check('banyarwanda_bias');
  ok(warnings.some(w => /public figure/i.test(w)), 'Ingabire public-figure flag surfaced');
  ok(warnings.some(w => /Gender composition/i.test(w)), 'Gender-composition flag surfaced');
  ok(warnings.some(w => /own-group/i.test(w)), 'Own-group confound flag surfaced');
}

// ---- 9. Block 5 trim lever ----
console.log('\n9. Block 5 trim lever');
{
  IAT_CONFIG.options.block5Trials = 20;
  const e = new IATEngine({ instrumentId: 'national_regional', arm: 'A_first', seed: 1 });
  ok(e.blocks.reduce((s, b) => s + b.trials, 0) === 180, 'Trimmed total = 180');
  IAT_CONFIG.options.block5Trials = 40;
}

console.log(fail === 0 ? '\nAll tests passed.\n' : `\n${fail} FAILURE(S).\n`);
process.exit(fail ? 1 : 0);
