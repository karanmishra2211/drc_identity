// ============================================================
// app.js — Setup page: assignment and launch
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('setup-form').addEventListener('submit', e => {
    e.preventDefault();

    const respId = document.getElementById('resp-id').value.trim() || 'R_' + Date.now();

    const armChoice = document.getElementById('arm').value;
    const arm = armChoice === 'random'
      ? (Math.random() < 0.5 ? 'national_first' : 'regional_first')
      : armChoice;

    const seedInput = document.getElementById('seed').value.trim();
    const seed = seedInput ? parseInt(seedInput, 10) : (Date.now() % 2147483647);

    localStorage.removeItem('iat1_session');

    const params = new URLSearchParams({
      rid: respId,
      arm,
      seed,
      swahili: document.getElementById('swahili').value,
      b5: document.getElementById('b5').value,
    });

    location.href = 'iat.html?' + params.toString();
  });
});
