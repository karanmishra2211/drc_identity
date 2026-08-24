// ============================================================
// app.js — Setup page: instrument selection, assignment, launch
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const instSel = document.getElementById('instrument');
  const note = document.getElementById('instrument-note');
  const gateWarn = document.getElementById('gate-warning');
  const validationBox = document.getElementById('validation');
  const iat1Options = document.getElementById('iat1-options');

  function refresh() {
    const id = instSel.value;
    const inst = IAT_CONFIG.getInstrument(id);
    note.textContent = inst.question;

    // Safety-gate banner
    if (inst.safetyGated) {
      gateWarn.classList.remove('hidden');
      gateWarn.innerHTML = '⛔ Safety-gated. A confirmation gate blocks the task until sign-off is attested. Nothing runs — pre-pilot included — before Raul / Marakuja clearance.';
    } else {
      gateWarn.classList.add('hidden');
    }

    // IAT #1-only options
    iat1Options.style.display = (id === 'national_regional') ? '' : 'none';

    // Validation warnings
    const warnings = IATValidation.check(id);
    if (warnings.length) {
      validationBox.classList.remove('hidden');
      validationBox.innerHTML =
        '<div class="validation-title">Validation flags</div><ul>' +
        warnings.map(w => `<li>${w}</li>`).join('') + '</ul>';
    } else {
      validationBox.classList.add('hidden');
    }
  }

  instSel.addEventListener('change', refresh);
  refresh();

  document.getElementById('setup-form').addEventListener('submit', e => {
    e.preventDefault();

    const instrumentId = instSel.value;
    const respId = document.getElementById('resp-id').value.trim() || 'R_' + Date.now();

    const armChoice = document.getElementById('arm').value;
    const arm = armChoice === 'random'
      ? (Math.random() < 0.5 ? 'A_first' : 'B_first')
      : armChoice;

    const seedInput = document.getElementById('seed').value.trim();
    const seed = seedInput ? parseInt(seedInput, 10) : (Date.now() % 2147483647);

    localStorage.removeItem('iat_session');

    const params = new URLSearchParams({
      rid: respId,
      inst: instrumentId,
      arm,
      seed,
      swahili: document.getElementById('swahili').value,
      b5: document.getElementById('b5').value,
    });

    location.href = 'iat.html?' + params.toString();
  });
});
