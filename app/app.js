// GTA 6 Trophy Guide & Tracker — Leonida.
// Loads app/data/trophies.json (same origin, no network), renders the tracker,
// roadmap, missables and sources tabs, and keeps earned trophies in localStorage.
// Filters (search, grade, kind, missable-only) combine; spoiler mode hides story
// trophies until they are earned. Progress exports to a JSON file and imports back.

const EARNED_KEY = 'gta6-trophy-guide-earned-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoiler-v1';
const DATA_URL = 'data/trophies.json';

const $ = (id) => document.getElementById(id);
const els = {
  search: $('search'),
  grade: $('grade-filter'),
  kind: $('kind-filter'),
  missableOnly: $('missable-only'),
  spoiler: $('spoiler'),
  exportBtn: $('export-btn'),
  importBtn: $('import-btn'),
  importFile: $('import-file'),
  resetBtn: $('reset-btn'),
  saveNote: $('save-note'),
  status: $('status'),
  progressCount: $('progress-count'),
  progressPct: $('progress-pct'),
  progressFill: $('progress-fill'),
  progressBreakdown: $('progress-breakdown'),
  trackerCount: $('tracker-count'),
  trackerList: $('tracker-list'),
  trackerEmpty: $('tracker-empty'),
  roadmapList: $('roadmap-list'),
  missableList: $('missable-list'),
  missableEmpty: $('missable-empty'),
  sourceList: $('source-list'),
};

let data = { trophies: [], sources: [], roadmap: [] };
let byId = new Map();
let sourcesById = new Map();
let earned = new Set();

function loadEarned() {
  try {
    const raw = localStorage.getItem(EARNED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveEarned() {
  try {
    localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
    els.saveNote.textContent = 'Saved just now.';
  } catch {
    els.saveNote.textContent = 'Could not save in this browser — export your progress to keep it.';
  }
}

function trophyKey(t) {
  return t.id ?? t.name;
}

function gradeOf(t) {
  return String(t.grade ?? '').toLowerCase();
}

function kindOf(t) {
  return String(t.kind ?? '').toLowerCase();
}

function isMissable(t) {
  if (t.missable === true) return true;
  if (kindOf(t) === 'missable') return true;
  if (typeof t.status === 'string' && /miss/i.test(t.status)) return true;
  return false;
}

function isStory(t) {
  return kindOf(t) === 'story';
}

function isHidden(t) {
  return t.hidden === true;
}

function gradeLabel(t) {
  const g = gradeOf(t);
  return g ? g.charAt(0).toUpperCase() + g.slice(1) : 'Bronze';
}

function spoilerOn() {
  return els.spoiler.checked;
}

function spoilerHides(t) {
  return spoilerOn() && isStory(t) && !earned.has(trophyKey(t));
}

function esc(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function citeNumber(sourceId) {
  const idx = data.sources.findIndex((s) => s.id === sourceId);
  return idx >= 0 ? idx + 1 : null;
}

function sourceLink(sourceId) {
  const s = sourcesById.get(sourceId);
  if (!s) return null;
  if (s.url) return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`;
  return esc(s.name);
}

function renderSteps(t) {
  if (!Array.isArray(t.steps) || t.steps.length === 0) return '';
  const items = t.steps.map((step) => {
    const cites = Array.isArray(step.cites) ? step.cites : [];
    const marks = cites
      .map((id) => citeNumber(id))
      .filter((n) => n !== null)
      .map((n) => `<sup class="cite">[${n}]</sup>`)
      .join('');
    return `<li>${esc(step.text)}${marks}</li>`;
  }).join('');
  return `<ol class="steps">${items}</ol>`;
}

function renderSourceLine(t) {
  const ids = Array.isArray(t.sources) ? t.sources : [];
  if (ids.length === 0) return '';
  const links = ids.map((id) => sourceLink(id)).filter(Boolean).join(', ');
  if (!links) return '';
  return `<p class="trophy-sources">Sources: ${links}</p>`;
}

function trophyCard(t) {
  const key = trophyKey(t);
  const done = earned.has(key);
  const grade = gradeOf(t) || 'bronze';
  const missable = isMissable(t);
  const hidden = spoilerHides(t);

  const card = document.createElement('article');
  card.className = 'trophy' + (done ? ' earned' : '') + (missable ? ' missable' : '');
  card.dataset.trophy = key;

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = done;
  check.setAttribute('aria-label', `Mark ${t.name} as earned`);
  check.addEventListener('change', () => {
    if (check.checked) earned.add(key);
    else earned.delete(key);
    saveEarned();
    renderAll();
  });

  const head = document.createElement('div');
  head.className = 'trophy-head';
  head.append(check);

  const titleWrap = document.createElement('div');
  titleWrap.className = 'trophy-title';
  if (hidden) {
    titleWrap.innerHTML = `<h3>Hidden story trophy</h3>
      <p class="trophy-desc">Spoiler mode hides this story trophy until you earn it. Tick the box once it pops to reveal its name and guide.</p>`;
  } else {
    titleWrap.innerHTML = `<h3>${esc(t.name)}</h3>
      <p class="trophy-desc">${esc(t.description ?? '')}</p>`;
  }
  head.append(titleWrap);

  const badge = document.createElement('span');
  badge.className = `grade grade-${grade}`;
  badge.textContent = gradeLabel(t);
  head.append(badge);
  card.append(head);

  const meta = document.createElement('p');
  meta.className = 'trophy-meta';
  const bits = [];
  if (kindOf(t)) bits.push(esc(kindOf(t)));
  if (isHidden(t)) bits.push('Hidden on PlayStation');
  if (missable) bits.push('<span class="missable-tag">Missable</span>');
  meta.innerHTML = bits.join(' &middot; ');
  card.append(meta);

  if (!hidden) {
    if (t.guide) {
      const guide = document.createElement('p');
      guide.className = 'trophy-guide';
      guide.textContent = t.guide;
      card.append(guide);
    }
    const stepsHtml = renderSteps(t);
    if (stepsHtml) {
      const wrap = document.createElement('div');
      wrap.innerHTML = stepsHtml;
      card.append(wrap);
    }
    const sourcesHtml = renderSourceLine(t);
    if (sourcesHtml) {
      const wrap = document.createElement('div');
      wrap.innerHTML = sourcesHtml;
      card.append(wrap);
    }
  }

  return card;
}

function matchesFilters(t) {
  const q = els.search.value.trim().toLowerCase();
  if (q) {
    const hay = [
      t.name, t.description, t.guide,
      ...(Array.isArray(t.steps) ? t.steps.map((s) => s.text) : []),
    ].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  const grade = els.grade.value;
  if (grade !== 'all' && gradeOf(t) !== grade) return false;
  const kind = els.kind.value;
  if (kind !== 'all') {
    if (kind === 'missable') {
      if (!isMissable(t)) return false;
    } else if (kindOf(t) !== kind) {
      return false;
    }
  }
  if (els.missableOnly.checked && !isMissable(t)) return false;
  return true;
}

function renderProgress() {
  const total = data.trophies.length;
  const count = data.trophies.filter((t) => earned.has(trophyKey(t))).length;
  const pct = total ? Math.round((count / total) * 100) : 0;
  els.progressCount.textContent = `${count} / ${total} earned`;
  els.progressPct.textContent = `${pct}%`;
  els.progressFill.style.width = `${pct}%`;

  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  const parts = grades.map((g) => {
    const inGrade = data.trophies.filter((t) => gradeOf(t) === g);
    const got = inGrade.filter((t) => earned.has(trophyKey(t))).length;
    return `${got}/${inGrade.length} ${g}`;
  });
  els.progressBreakdown.textContent = parts.join(' · ');
}

function renderTracker() {
  const list = data.trophies.filter(matchesFilters);
  els.trackerList.replaceChildren();
  for (const t of list) els.trackerList.append(trophyCard(t));
  els.trackerEmpty.hidden = list.length !== 0;
  const shown = list.length;
  const total = data.trophies.length;
  els.trackerCount.textContent = shown === total
    ? `All ${total} trophies. Tick each one as you earn it.`
    : `Showing ${shown} of ${total} trophies.`;
}

function renderRoadmap() {
  els.roadmapList.replaceChildren();
  if (!Array.isArray(data.roadmap) || data.roadmap.length === 0) {
    els.roadmapList.innerHTML = '<p class="empty">No roadmap stages in the data.</p>';
    return;
  }
  data.roadmap.forEach((stage, i) => {
    const card = document.createElement('article');
    card.className = 'stage';
    const ids = Array.isArray(stage.trophies) ? stage.trophies : [];
    const names = ids.map((id) => {
      const t = byId.get(id);
      if (!t) return esc(id);
      const miss = isMissable(t) ? ' <span class="missable-tag">Missable</span>' : '';
      const done = earned.has(trophyKey(t)) ? ' ✓' : '';
      return `<li>${esc(t.name)}${miss}${done}</li>`;
    }).join('');
    card.innerHTML = `<h3><span class="stage-num">Stage ${i + 1}</span> ${esc(stage.title ?? stage.stage ?? '')}</h3>
      <p>${esc(stage.text ?? '')}</p>
      ${names ? `<ul class="stage-trophies">${names}</ul>` : ''}`;
    els.roadmapList.append(card);
  });
}

function renderMissables() {
  const list = data.trophies.filter(isMissable);
  els.missableList.replaceChildren();
  for (const t of list) els.missableList.append(trophyCard(t));
  els.missableEmpty.hidden = list.length !== 0;
}

function renderSources() {
  els.sourceList.replaceChildren();
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    els.sourceList.innerHTML = '<li class="empty">No sources listed.</li>';
    return;
  }
  data.sources.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'source';
    const read = s.read ? ` <span class="source-read">Read ${esc(s.read)}</span>` : '';
    li.innerHTML = `<strong>[${i + 1}] ${esc(s.name)}</strong>${read}<br>` +
      (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : '');
    els.sourceList.append(li);
  });
}

function renderAll() {
  renderProgress();
  renderTracker();
  renderRoadmap();
  renderMissables();
  renderSources();
}

function setStatus(msg) {
  els.status.textContent = msg;
}

function exportProgress() {
  const payload = {
    game: 'GTA 6',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  setStatus(`Exported ${earned.size} earned trophies.`);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const ids = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(ids)) throw new Error('bad file');
    const known = new Set(data.trophies.map(trophyKey));
    const kept = ids.filter((id) => known.has(id));
    earned = new Set(kept);
    saveEarned();
    renderAll();
    setStatus(`Imported ${kept.length} earned trophies${ids.length - kept.length ? ` (${ids.length - kept.length} unknown entries skipped)` : ''}.`);
  } catch {
    setStatus('That file could not be imported. It must be a progress file exported from this guide.');
  }
}

function resetProgress() {
  if (!earned.size) return;
  if (!window.confirm('Clear all earned trophies? This cannot be undone — export first if you want a backup.')) return;
  earned = new Set();
  saveEarned();
  renderAll();
  setStatus('Progress reset.');
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((other) => {
        other.classList.toggle('active', other === tab);
        other.setAttribute('aria-selected', String(other === tab));
      });
      document.querySelectorAll('.panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `panel-${tab.dataset.tab}`);
      });
    });
  });
}

function initControls() {
  els.search.addEventListener('input', renderTracker);
  els.grade.addEventListener('change', renderTracker);
  els.kind.addEventListener('change', renderTracker);
  els.missableOnly.addEventListener('change', renderTracker);
  els.spoiler.addEventListener('change', () => {
    try {
      localStorage.setItem(SPOILER_KEY, els.spoiler.checked ? '1' : '0');
    } catch { /* storage unavailable; spoiler still works for this visit */ }
    renderAll();
  });
  els.exportBtn.addEventListener('click', exportProgress);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', (e) => {
    importProgress(e.target.files[0]);
    e.target.value = '';
  });
  els.resetBtn.addEventListener('click', resetProgress);
}

async function init() {
  earned = loadEarned();
  try {
    els.spoiler.checked = localStorage.getItem(SPOILER_KEY) === '1';
  } catch { /* ignore */ }
  initTabs();
  initControls();
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    data = {
      trophies: Array.isArray(json.trophies) ? json.trophies : [],
      sources: Array.isArray(json.sources) ? json.sources : [],
      roadmap: Array.isArray(json.roadmap) ? json.roadmap : [],
    };
    byId = new Map(data.trophies.map((t) => [trophyKey(t), t]));
    sourcesById = new Map(data.sources.map((s) => [s.id, s]));
    // Drop earned ids the data no longer names, so the counter stays honest.
    const known = new Set(data.trophies.map(trophyKey));
    earned = new Set([...earned].filter((id) => known.has(id)));
    saveEarned();
    renderAll();
  } catch (err) {
    els.trackerList.innerHTML = '';
    els.trackerEmpty.hidden = false;
    els.trackerEmpty.textContent = 'Could not load the trophy data (data/trophies.json). Serve the app folder with a static server and reload — opening the file directly can block the data fetch.';
    setStatus('Failed to load trophy data.');
  }
}

init();
