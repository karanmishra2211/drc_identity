const fs = require('fs');
const path = __dirname + '/../js/';
const load = f => fs.readFileSync(path + f, 'utf8');

global.performance = { now: () => Date.now() };
const geval = eval;
geval(load('config.js') + '\nglobalThis.IAT_CONFIG = IAT_CONFIG;');
geval(load('scoring.js') + '\nglobalThis.IATScoring = IATScoring;');
geval(load('engine.js') + '\nglobalThis.IATEngine = IATEngine;');

let fail = 0;
const ok = (c, m) => { console.log((c ? '  PASS  ' : '  FAIL  ') + m); if (!c) fail++; };

// ---- 1. Block construction ----
console.log('\n1. Block structure');
for (const arm of ['national_first', 'regional_first']) {
  const e = new IATEngine({ arm, seed: 42 });
  const total = e.blocks.reduce((s, b) => s + b.trials, 0);
  ok(e.blocks.length === 7, `${arm}: 7 blocks`);
  ok(total === 200, `${arm}: 200 trials total (got ${total})`);

  const tests = e.blocks.filter(b => b.isTest);
  ok(tests.length === 2, `${arm}: 2 test blocks`);
  const pairings = tests.map(b => b.pairing).sort();
  ok(pairings[0] === 'national_good' && pairings[1] === 'regional_good',
     `${arm}: test blocks cover both pairings (${pairings.join(', ')})`);

  // GOOD must always be on the left
  const combined = e.blocks.filter(b => b.pairing);
  ok(combined.every(b => b.left.includes('good')), `${arm}: GOOD pinned left in all combined blocks`);
  ok(combined.every(b => b.right.includes('bad')), `${arm}: BAD pinned right in all combined blocks`);
}

// Arm 1 must match the spec table exactly
console.log('\n2. Arm 1 matches spec table');
{
  const e = new IATEngine({ arm: 'national_first', seed: 1 });
  const b = n => e.blocks.find(x => x.n === n);
  ok(b(4).leftTarget === 'national' && b(4).pairing === 'national_good', 'Block 4 = National+Good');
  ok(b(7).leftTarget === 'regional' && b(7).pairing === 'regional_good', 'Block 7 = Regional+Good');
  ok(b(5).leftTarget === 'regional', 'Block 5 reverses targets');
  const t = [20,20,20,40,40,20,40];
  ok(t.every((v,i) => b(i+1).trials === v), 'Trial counts 20/20/20/40/40/20/40');
}

// ---- 3. Trial generation ----
console.log('\n3. Trial generation');
{
  const e = new IATEngine({ arm: 'national_first', seed: 7 });
  for (const blk of e.blocks) {
    const trials = e._generateTrials(blk);
    ok(trials.length === blk.trials, `Block ${blk.n}: ${blk.trials} trials generated`);
    const bad = trials.filter(t => !blk.left.concat(blk.right).includes(t.category));
    ok(bad.length === 0, `Block ${blk.n}: all categories valid for this block`);
    // balance
    const counts = {};
    trials.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
    const vals = Object.values(counts);
    ok(vals.every(v => v === vals[0]), `Block ${blk.n}: categories balanced (${JSON.stringify(counts)})`);
  }
}

// ---- 4. Seed reproducibility ----
console.log('\n4. Seed reproducibility');
{
  const a = new IATEngine({ arm: 'national_first', seed: 999 });
  const b = new IATEngine({ arm: 'national_first', seed: 999 });
  const c = new IATEngine({ arm: 'national_first', seed: 1000 });
  const seq = e => e._generateTrials(e.blocks[3]).map(t => t.stim.id).join(',');
  ok(seq(a) === seq(b), 'Same seed → same trial order');
  ok(seq(a) !== seq(c), 'Different seed → different trial order');
}

// ---- 5. SIGN CONVENTION (the critical test) ----
console.log('\n5. Sign convention — must hold for BOTH arms');
function synth(arm, fastPairing) {
  // Simulate a respondent who is 200ms faster on `fastPairing`.
  const e = new IATEngine({ arm, seed: 5 });
  const out = [];
  for (const blk of e.blocks) {
    if (!blk.pairing) continue;
    const base = blk.pairing === fastPairing ? 600 : 800;
    e._generateTrials(blk).forEach((t, i) => out.push({
      block: blk.n, block_fn: blk.fn, is_test: blk.isTest, pairing: blk.pairing,
      trial_no: i + 1, stimulus: t.stim.id, stim_modality: t.stim.modality,
      category: t.category, response_key: t.expectedSide, correct: 1,
      rt_ms: base + (i % 10) * 5,
    }));
  }
  return IATScoring.compute(out).d_national;
}

for (const arm of ['national_first', 'regional_first']) {
  const dNat = synth(arm, 'national_good');
  const dReg = synth(arm, 'regional_good');
  ok(dNat > 0, `${arm}: faster on National+Good → D > 0 (got ${dNat})`);
  ok(dReg < 0, `${arm}: faster on Regional+Good → D < 0 (got ${dReg})`);
}
// Arms must agree in magnitude — counterbalancing must not bias D
{
  const d1 = synth('national_first', 'national_good');
  const d2 = synth('regional_first', 'national_good');
  ok(Math.abs(d1 - d2) < 0.05, `Both arms give near-identical D (${d1} vs ${d2})`);
}

// ---- 6. Error penalty ----
console.log('\n6. Error handling');
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
  const clean = IATScoring.compute(trials).d_national;
  const withErr = IATScoring.compute([...trials, mk('regional_good', 400, 0)]).d_national;
  ok(withErr > clean, `Error on Regional+Good raises its latency → D increases (${clean} → ${withErr})`);
}

// ---- 7. Diagnostics ----
console.log('\n7. Diagnostics');
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
  const g = IATScoring.compute(t).diagnostics;
  ok(g.modality_gap_ms === 400, `Modality gap detected (${g.modality_gap_ms}ms)`);
  ok(g.flags.some(f => /inflates pooled SD/.test(f)), 'Modality gap raises a flag');
  ok(Math.abs(g.error_rate - 1/3) < 0.01, `Error rate ${g.error_rate}`);
  ok(g.flags.some(f => /Error rate/.test(f)), 'High error rate raises a flag');
}

// ---- 8. Conditional Swahili ----
console.log('\n8. Conditional Swahili swap');
{
  IAT_CONFIG.useConditionalSwahili = true;
  let r = IAT_CONFIG.resolvedTargets('regional');
  ok(r.length === 4, `Included: 4 regional stimuli`);
  ok(r.some(s => s.id === 'kiswahili'), 'Kiswahili present');

  IAT_CONFIG.useConditionalSwahili = false;
  r = IAT_CONFIG.resolvedTargets('regional');
  ok(r.length === 4, 'Dropped: still 4 regional stimuli');
  ok(!r.some(s => s.id === 'kiswahili'), 'Kiswahili absent');
  ok(r.some(s => s.id === 'mashariki'), 'Mashariki swapped in');

  // modality balance must survive the swap
  const img = r.filter(s => s.modality === 'image').length;
  const aud = r.filter(s => s.modality === 'audio').length;
  ok(img === 2 && aud === 2, `Modality balance held: ${img} image / ${aud} audio`);
  IAT_CONFIG.useConditionalSwahili = true;
}

// ---- 9. Block 5 trim lever ----
console.log('\n9. Block 5 trim lever');
{
  IAT_CONFIG.block5Trials = 20;
  const e = new IATEngine({ arm: 'national_first', seed: 1 });
  const total = e.blocks.reduce((s, b) => s + b.trials, 0);
  ok(total === 180, `Trimmed total = 180 (got ${total})`);
  IAT_CONFIG.block5Trials = 40;
}

console.log(fail === 0 ? '\nAll tests passed.\n' : `\n${fail} FAILURE(S).\n`);
process.exit(fail ? 1 : 0);
