// Browser smoke test — drives both instruments end to end in headless Chromium.
// Requires: npm i playwright-core, and a Chromium at CHROMIUM_PATH (or the default).
// Run: node test/smoke.js

const { chromium } = require('playwright-core');
const path = require('path');
const base = 'file://' + path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  let missingAssets = 0;
  page.on('console', m => {
    if (m.type() !== 'error') return;
    // Missing placeholder assets are expected and handled by the caption fallback.
    if (/ERR_FILE_NOT_FOUND/.test(m.text())) { missingAssets++; return; }
    errors.push('CONSOLE: ' + m.text());
  });

  async function runSession(url, label, { gate = false } = {}) {
    await page.goto(url);
    // Speed up: shrink timing so the run finishes fast, and auto-advance intros.
    await page.evaluate(() => {
      IAT_CONFIG.timing.fixation = 1;
      IAT_CONFIG.timing.errorFeedback = 1;
      IAT_CONFIG.timing.iti = 1;
    });

    if (gate) {
      // Gate must block until all boxes checked.
      const beginDisabled = await page.evaluate(() => document.getElementById('gate-begin').disabled);
      if (!beginDisabled) throw new Error(label + ': gate Begin was NOT disabled initially');
      await page.$$eval('.gate-box', boxes => boxes.forEach(b => { b.checked = true; b.dispatchEvent(new Event('change')); }));
      const beginEnabled = await page.evaluate(() => !document.getElementById('gate-begin').disabled);
      if (!beginEnabled) throw new Error(label + ': gate Begin did not enable after checks');
      await page.click('#gate-begin');
    }

    // Drive the whole task: dismiss each intro, answer each trial correctly.
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      if (page.url().includes('results.html')) break;
      let state;
      try {
        state = await page.evaluate(() => {
        const intro = document.getElementById('block-intro');
        const introVisible = intro && !intro.classList.contains('hidden');
        const contBtn = document.getElementById('continue-btn');
        if (introVisible && contBtn) return { kind: 'intro' };
        if (window.IATUI && IATUI.engine && IATUI.engine.state === 'AWAITING_RESPONSE') {
          const t = IATUI.engine.getCurrentTrial();
          return { kind: 'trial', side: t.expectedSide };
        }
        return { kind: 'wait' };
        });
      } catch (e) {
        // Navigation to results destroys the context — treat as done.
        if (page.url().includes('results.html')) break;
        state = { kind: 'wait' };
      }
      if (state.kind === 'intro') {
        await page.click('#continue-btn');
      } else if (state.kind === 'trial') {
        await page.keyboard.press(state.side === 'left' ? 'e' : 'i');
      } else {
        await page.waitForTimeout(3);
      }
    }

    if (!page.url().includes('results.html')) throw new Error(label + ': did not reach results');
    await page.waitForFunction(() => { const el=document.getElementById('d-value'); return el && el.textContent && el.textContent !== '—'; }, { timeout: 5000 });
    const d = await page.evaluate(() => document.getElementById('d-value').textContent);
    const trials = await page.evaluate(() => JSON.parse(localStorage.getItem('iat_session')).trials.length);
    console.log(`  ${label}: reached results, trials=${trials}, D=${d}`);
    if (trials !== 200) throw new Error(label + ': expected 200 trials, got ' + trials);
  }

  // Setup page loads
  await page.goto(base + '/index.html');
  console.log('  setup page loaded, title:', await page.title());

  // IAT #1 full run
  await runSession(base + '/iat.html?rid=SMOKE1&inst=national_regional&arm=A_first&seed=42', 'IAT#1');

  // IAT #2 full run (with gate)
  await runSession(base + '/iat.html?rid=SMOKE2&inst=banyarwanda_bias&arm=A_first&seed=42', 'IAT#2', { gate: true });

  // IAT #2 skip path
  await page.goto(base + '/iat.html?rid=SMOKE3&inst=banyarwanda_bias&arm=A_first&seed=1');
  await page.click('#gate-skip');
  await page.waitForFunction(() => location.href.includes('results.html'));
  const skipped = await page.evaluate(() => JSON.parse(localStorage.getItem('iat_session')).skipped);
  console.log('  IAT#2 skip: skipped=' + skipped);
  if (!skipped) throw new Error('skip did not record skipped=true');

  await browser.close();

  if (errors.length) {
    console.log('\nJS ERRORS:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log(`\nSMOKE OK — no real JS errors, both instruments run start to finish.`);
  console.log(`(${missingAssets} expected missing-placeholder-asset notices, handled by fallback.)`);
})().catch(e => { console.error('SMOKE FAILED:', e.message); process.exit(1); });
