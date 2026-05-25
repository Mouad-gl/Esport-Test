/* ── Tab navigation ─────────────────────────────────── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'teams') loadTeams();
    if (btn.dataset.tab === 'gallery') loadGallery();
  });
});

/* ── Drop zone ──────────────────────────────────────── */
const dropZone = document.getElementById('drop-zone');
const photoInput = document.getElementById('photo-input');
const dropContent = document.getElementById('drop-content');
const previewImg = document.getElementById('preview-img');
let selectedFile = null;

function showPreview(file) {
  selectedFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.classList.remove('hidden');
  dropContent.classList.add('hidden');
}

photoInput.addEventListener('change', e => {
  if (e.target.files[0]) showPreview(e.target.files[0]);
});

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) showPreview(file);
});
dropZone.addEventListener('click', e => {
  if (e.target !== photoInput && !e.target.closest('button')) photoInput.click();
});

/* ── Team name debounce check ───────────────────────── */
const teamNameInput = document.getElementById('team-name');
const teamBanner = document.getElementById('team-status-banner');
let debounceTimer = null;

teamNameInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const val = teamNameInput.value.trim();
  if (!val) { teamBanner.className = 'team-banner hidden'; return; }
  debounceTimer = setTimeout(() => checkTeamExists(val), 500);
});

async function checkTeamExists(name) {
  try {
    const res = await fetch('/api/teams');
    const teams = await res.json();
    const norm = name.toLowerCase();
    const match = teams.find(t => t.name.toLowerCase() === norm);
    if (match) {
      teamBanner.textContent =
        `✅ Existing team found — jersey identity will be reused (${match.game}, ${match.region})`;
      teamBanner.className = 'team-banner existing';
    } else {
      teamBanner.textContent =
        '🆕 New team — a unique jersey identity will be created and saved for all future players.';
      teamBanner.className = 'team-banner new-team';
    }
  } catch { teamBanner.className = 'team-banner hidden'; }
}

/* ── Generate form submit ───────────────────────────── */
const form = document.getElementById('generate-form');
const submitBtn = document.getElementById('submit-btn');
const submitLabel = document.getElementById('submit-label');
const submitSpinner = document.getElementById('submit-spinner');
const resultPanel = document.getElementById('result-panel');
const errorPanel = document.getElementById('error-panel');

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!selectedFile) { showError('Please upload a player photo first.'); return; }

  setLoading(true);
  resultPanel.classList.add('hidden');
  errorPanel.classList.add('hidden');

  const fd = new FormData();
  fd.append('photo', selectedFile);
  fd.append('player_name', document.getElementById('player-name').value.trim());
  fd.append('game_tag', document.getElementById('game-tag').value.trim());
  fd.append('team_name', document.getElementById('team-name').value.trim());
  fd.append('game', document.getElementById('game').value);
  fd.append('region', document.getElementById('region').value);
  fd.append('role', document.getElementById('role').value.trim());

  try {
    const res = await fetch('/api/generate', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Generation failed');
    showResult(data);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.disabled = on;
  submitLabel.textContent = on ? 'Generating…' : '⚡ Generate Esports Portrait';
  submitSpinner.classList.toggle('hidden', !on);
}

function showResult(data) {
  const imgUrl = data.generated_image_url || '';
  const resultImg = document.getElementById('result-img');
  resultImg.src = imgUrl;

  const dlBtn = document.getElementById('download-btn');
  dlBtn.href = imgUrl;

  const qualityPct = data.quality_score != null ? Math.round(data.quality_score) : '—';
  const qualityColor = (data.quality_score || 0) >= 70
    ? 'var(--accent2)' : (data.quality_score || 0) >= 40 ? '#f0a500' : 'var(--danger)';

  const issues = data.quality_issues ? JSON.parse(data.quality_issues) : [];

  document.getElementById('result-meta').innerHTML = `
    <table>
      <tr><td>Player</td><td><strong>${esc(data.player_name || '')}</strong></td></tr>
      <tr><td>Team</td><td>${esc(data.team_name || '')}</td></tr>
      <tr><td>Pose</td><td>${esc(data.pose_name || 'Random')}</td></tr>
      <tr><td>Status</td><td><span class="status-badge status-${data.status}">${esc(data.status)}</span></td></tr>
      <tr><td>Quality score</td><td>
        ${qualityPct}/100
        <div class="quality-bar-wrap">
          <div class="quality-bar" style="width:${qualityPct}%;background:${qualityColor}"></div>
        </div>
        ${issues.length ? `<small style="color:var(--danger)">${issues.join(' · ')}</small>` : ''}
      </td></tr>
    </table>
    ${data.full_prompt_used ? `
    <details class="prompt-box">
      <summary>View generation prompt</summary>
      <pre>${esc(data.full_prompt_used)}</pre>
    </details>` : ''}
  `;
  resultPanel.classList.remove('hidden');
  resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(msg) {
  errorPanel.innerHTML = `<div class="error-box">⚠ ${esc(msg)}</div>`;
  errorPanel.classList.remove('hidden');
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Teams tab ──────────────────────────────────────── */
async function loadTeams() {
  const grid = document.getElementById('teams-grid');
  grid.innerHTML = '<div class="loading-placeholder">Loading…</div>';
  try {
    const res = await fetch('/api/teams');
    const teams = await res.json();
    if (!teams.length) {
      grid.innerHTML = '<div class="loading-placeholder">No teams yet — generate your first portrait!</div>';
      return;
    }
    grid.innerHTML = teams.map(t => `
      <div class="team-card">
        <h3>${esc(t.name)}</h3>
        <span class="game-badge">${esc(t.game)} · ${esc(t.region)}</span>
        ${t.jersey_prompt ? `
          <div class="color-chips">
            ${t.jersey_prompt.primary_color ? `<div class="color-chip" style="background:${esc(t.jersey_prompt.primary_color)}" title="Primary: ${esc(t.jersey_prompt.primary_color)}"></div>` : ''}
            ${t.jersey_prompt.secondary_color ? `<div class="color-chip" style="background:${esc(t.jersey_prompt.secondary_color)}" title="Secondary: ${esc(t.jersey_prompt.secondary_color)}"></div>` : ''}
            ${t.jersey_prompt.accent_color ? `<div class="color-chip" style="background:${esc(t.jersey_prompt.accent_color)}" title="Accent: ${esc(t.jersey_prompt.accent_color)}"></div>` : ''}
          </div>
          <div class="jersey-indicator">✅ Jersey identity saved · v${t.jersey_prompt.version}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:6px">${esc(t.jersey_prompt.design_style || '')}</div>
        ` : '<div class="jersey-indicator no-jersey">No jersey yet</div>'}
        <div style="font-size:12px;color:var(--text-dim);margin-top:10px">${t.player_count} player${t.player_count !== 1 ? 's' : ''}</div>
      </div>
    `).join('');
  } catch (e) {
    grid.innerHTML = `<div class="loading-placeholder">Failed to load teams: ${esc(e.message)}</div>`;
  }
}

/* ── Gallery tab ────────────────────────────────────── */
async function loadGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '<div class="loading-placeholder">Loading…</div>';
  try {
    const [teamsRes, playersRes] = await Promise.all([fetch('/api/teams'), fetch('/api/players')]);
    const players = await playersRes.json();

    if (!players.length) {
      grid.innerHTML = '<div class="loading-placeholder">No portraits yet — generate your first one!</div>';
      return;
    }

    // Load gallery for first 20 players
    const galleryItems = [];
    for (const p of players.slice(0, 20)) {
      const gRes = await fetch(`/api/players/${p.id}/gallery`);
      const gens = await gRes.json();
      gens.forEach(g => galleryItems.push({ player: p, gen: g }));
    }

    if (!galleryItems.length) {
      grid.innerHTML = '<div class="loading-placeholder">No completed portraits yet.</div>';
      return;
    }

    grid.innerHTML = galleryItems
      .filter(item => item.gen.generated_image_url)
      .sort((a, b) => new Date(b.gen.created_at) - new Date(a.gen.created_at))
      .map(({ player, gen }) => `
        <div class="gallery-card">
          <img src="${esc(gen.generated_image_url)}" alt="${esc(player.name)} portrait"
               onerror="this.src='https://placehold.co/300x400/161b22/8b949e?text=No+Image'" />
          <div class="gallery-card-info">
            <strong>${esc(player.name)}</strong>
            <span>${esc(gen.team_name || '')} · ${esc(gen.pose_name || '')}</span>
          </div>
        </div>
      `).join('');
  } catch (e) {
    grid.innerHTML = `<div class="loading-placeholder">Failed to load gallery: ${esc(e.message)}</div>`;
  }
}
