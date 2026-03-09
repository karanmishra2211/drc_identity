// ============================================================
// app.js — Entry page controller (setup + randomization)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('setup-form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const respondentId = document.getElementById('respondent-id').value.trim()
      || 'R_' + Date.now();

    const iatSelect = document.getElementById('iat-version').value;
    const orderSelect = document.getElementById('block-order').value;
    const language = document.getElementById('language').value;

    // Resolve "random" selections
    const iatVersion = iatSelect === 'random'
      ? (Math.random() < 0.5 ? 'other_congolese' : 'congolese_state')
      : iatSelect;

    const blockOrder = orderSelect === 'random'
      ? (Math.random() < 0.5 ? 'A' : 'B')
      : orderSelect;

    // Clear any previous session
    localStorage.removeItem('iat_session');

    // Navigate to IAT task
    const params = new URLSearchParams({
      rid: respondentId,
      iat: iatVersion,
      order: blockOrder,
      lang: language,
    });

    window.location.href = 'iat.html?' + params.toString();
  });
});
