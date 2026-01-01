/* =========================================================================
   YouTube Klima Monitoring – app.js
   - Steuert UI (Filter, Dark Mode, Modal)
   - Lädt Daten via PHP-Endpunkte (queries.php, table.php, series_*.php)
   - Zeichnet Charts (Chart.js) und befüllt die Tabelle
   ========================================================================= */

// HiDPI/Retina: wir begrenzen die Pixel-Dichte, damit das Canvas nicht zu groß wird
const DPR_CAP = Math.min(window.devicePixelRatio || 1, 2);
const MAX_CANVAS_PX = 4096;

// Globale Zustände
let chart = null; // Chart.js Instanz
let videoModal = null; // Bootstrap Modal Instanz
let currentRows = []; // aktuell angezeigte Tabellen-Zeilen (für Sortierung)
let sortState = {
	key: 'views',
	dir: 'desc'
}; // aktuelle Sortierung
let activeHelpPopover = null;
const THEME_KEY = 'ykm-theme'; // LocalStorage-Key für Dark Mode

// -------------------------------------------------------------------------
// DOM-Elemente (UI-Controls)
// -------------------------------------------------------------------------
const modeEl = document.getElementById('mode'); // Duel / Deep
const viewModeEl = document.getElementById('viewMode'); // trend / top
const daysEl = document.getElementById('days'); // 7/14/30
const metricEl = document.getElementById('metric'); // Views/Likes/Kommentare (nur Duel)
const qaEl = document.getElementById('qa'); // Begriff A
const qbEl = document.getElementById('qb'); // Begriff B
const qbWrap = document.getElementById('qbWrap'); // Wrapper zum Ein-/Ausblenden von Begriff B
const metricWrap = document.getElementById('metricWrap'); // Wrapper zum Ein-/Ausblenden der Metrik
const reloadBtn = document.getElementById('reload'); // Anzeigen-Button
const tblTerm = document.getElementById('tblTerm'); // Anzeige des aktuellen Begriffs in der Tabellen-Überschrift
const tbody = document.getElementById('tbody'); // Tabellen-Body
const chartTitleEl = document.getElementById('chartTitle'); // dynamischer Chart-Titel
const chartSubtitleEl = document.getElementById('chartSubtitle'); // dynamischer Chart-Untertitel
const viewModeHintEl = document.getElementById('viewModeHint');
const insightTextEl = document.getElementById('insightText');

// -------------------- HELP SYSTEM (central) --------------------
// Key = id des Formular-Controls (select/input/button), z.B. "viewMode"
const HELP = {
  viewMode: {
    title: 'Ansicht',
    html: `
      <div><strong>Zeitverlauf</strong>: zeigt die Entwicklung über Tage (Trend).</div>
      <div class="mt-1"><strong>Top-Videos</strong>: zeigt die Top 10 zu <strong>Begriff A</strong> (Ranking nach Views).</div>
      <div class="mt-1 text-muted">Hinweis: In Top-Videos sind Modus, Begriff B und Metrik deaktiviert.</div>
    `
  },
  mode: {
    title: 'Modus',
    html: `
      <div><strong>Duel</strong>: 2 Begriffe werden für <em>eine</em> Metrik verglichen.</div>
      <div class="mt-1"><strong>Deep-Dive</strong>: 1 Begriff, dafür Views/Likes/Kommentare gleichzeitig.</div>
    `
  },
  metric: {
    title: 'Metrik',
    html: `
      <div>Nur relevant im <strong>Duel</strong>-Modus (Trend).</div>
      <div class="mt-1">Wähle, ob Views, Likes oder Kommentare verglichen werden sollen.</div>
    `
  },
  days: {
    title: 'Zeitraum',
    html: `
      <div>Filtert die Anzeige auf die letzten 7/14/30 Tage.</div>
      <div class="mt-1 text-muted">Je kürzer der Zeitraum, desto „spitzer“ werden Peaks sichtbar.</div>
    `
  },
  qa: {
    title: 'Begriff A',
    html: `
      <div>Primärer Suchbegriff.</div>
      <div class="mt-1">In <strong>Top-Videos</strong> basiert alles ausschließlich auf Begriff A.</div>
    `
  },
  qb: {
    title: 'Begriff B',
    html: `
      <div>Vergleichsbegriff – nur aktiv im <strong>Duel</strong>-Modus (Trend).</div>
    `
  },
  reload: {
    title: 'Anzeigen',
    html: `
      <div>Lädt die Daten neu und aktualisiert Chart + Tabelle.</div>
    `
  }
};

// =========================================================================
// 0) Helper, der Icons automatisch neben Labels einfügt
// =========================================================================

function initHelpSystem() {
  if (!window.bootstrap) return;

  // 1) Für jedes Label[for] prüfen: gibt es dazu eine HELP-Definition?
  document.querySelectorAll('label.form-label[for]').forEach((label) => {
    const targetId = label.getAttribute('for');
    if (!targetId) return;

    const def = HELP[targetId];
    if (!def) return;

    // doppelt verhindern
    if (label.dataset.helpBound === '1') return;
    label.dataset.helpBound = '1';

    // Label in eine Row verpacken (flex) und Info-Button anfügen
    const row = document.createElement('div');
    row.className = 'ykm-labelrow';

    // Label aus DOM lösen und in row packen
    const parent = label.parentElement;
    parent.insertBefore(row, label);
    row.appendChild(label);

    // Info Button erstellen
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ykm-help-btn';
    btn.setAttribute('data-bs-toggle', 'popover');
    btn.setAttribute('data-bs-placement', 'top');
    btn.setAttribute('data-bs-trigger', 'hover focus click');
    btn.setAttribute('data-bs-html', 'true');
    btn.setAttribute('data-bs-title', def.title || 'Info');
    btn.setAttribute('data-bs-content', def.html || '');

    btn.innerHTML = `
      <span class="ykm-help-dot" aria-hidden="true">i</span>
      <span class="visually-hidden">Info</span>
    `;

    row.appendChild(btn);

    // Popover aktivieren
	const pop = new bootstrap.Popover(btn);

	// merken, welcher Popover aktiv ist
	btn.addEventListener('shown.bs.popover', () => {
		if (activeHelpPopover && activeHelpPopover !== pop) {
			activeHelpPopover.hide();
		}
		activeHelpPopover = pop;
	});

	// beim Schließen zurücksetzen
	btn.addEventListener('hidden.bs.popover', () => {
		if (activeHelpPopover === pop) {
			activeHelpPopover = null;
		}
	});
  });
}

// =========================================================================
// 1) THEME (Dark Mode)
// =========================================================================

/**
 * Setzt das Theme, indem eine CSS-Klasse auf <html> gesetzt/entfernt wird.
 */
function applyTheme(theme) {
	const root = document.documentElement;
	if (theme === 'dark') root.classList.add('dark-theme');
	else root.classList.remove('dark-theme');
}

/**
 * Initialisiert den Dark-Mode-Button:
 * - lädt Zustand aus LocalStorage
 * - setzt Button-Label
 * - toggelt bei Klick
 */
function initThemeToggle() {
	const stored = localStorage.getItem(THEME_KEY) || 'light';
	applyTheme(stored);

	const btn = document.getElementById('themeToggle');
	if (!btn) return;

	const updateLabel = () => {
		const isDark = document.documentElement.classList.contains('dark-theme');
		btn.textContent = isDark ? 'Light Mode' : 'Dark Mode';
	};

	updateLabel();

	btn.addEventListener('click', () => {
		const isDark = document.documentElement.classList.toggle('dark-theme');
		localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
		updateLabel();
	});
}

// =========================================================================
// 2) MODAL (Video-Detailansicht)
// =========================================================================

/**
 * Erstellt die Bootstrap-Modal-Instanz (falls Bootstrap verfügbar ist).
 */
function initVideoModal() {
	const el = document.getElementById('videoModal');
	if (!el || !window.bootstrap) return;
	videoModal = new bootstrap.Modal(el);
}

/**
 * Öffnet das Modal basierend auf den data-* Attributen einer Tabellenzeile.
 */
function openVideoModalFromRow(tr) {
	if (!videoModal) initVideoModal();
	if (!videoModal) return;

	const id = tr.dataset.videoId;
	if (!id) return;

	// Werte aus data-* ziehen und hübsch formatieren
	const title = tr.dataset.title || '';
	const views = tr.dataset.views ? Number(tr.dataset.views).toLocaleString('de-DE') : '–';
	const likes = tr.dataset.likes ? Number(tr.dataset.likes).toLocaleString('de-DE') : '–';
	const comments = tr.dataset.comments ? Number(tr.dataset.comments).toLocaleString('de-DE') : '–';
	const publishedAt = tr.dataset.publishedAt ? tr.dataset.publishedAt.replace('T', ' ').substring(0, 16) : '';
	const lang = tr.dataset.language || '–';
	const term = qaEl?.options[qaEl.selectedIndex]?.text || '';

	// Elemente im Modal füllen
	const titleEl = document.getElementById('videoModalLabel');
	const frameEl = document.getElementById('videoModalFrame');
	const termEl = document.getElementById('videoModalTerm');
	const dateEl = document.getElementById('videoModalDate');
	const langEl = document.getElementById('videoModalLang');
	const viewsEl = document.getElementById('videoModalViews');
	const likesEl = document.getElementById('videoModalLikes');
	const commentsEl = document.getElementById('videoModalComments');
	const linkEl = document.getElementById('videoModalYoutubeLink');

	if (titleEl) titleEl.textContent = title;
	if (termEl) termEl.textContent = term;
	if (dateEl) dateEl.textContent = publishedAt;
	if (langEl) langEl.textContent = lang;
	if (viewsEl) viewsEl.textContent = views;
	if (likesEl) likesEl.textContent = likes;
	if (commentsEl) commentsEl.textContent = comments;

	// Link und Embed setzen
	if (linkEl) linkEl.href = `https://www.youtube.com/watch?v=${id}`;
	if (frameEl) frameEl.src = `https://www.youtube.com/embed/${id}`;

	videoModal.show();
}

// =========================================================================
// 3) CHART (Chart.js) – erstellen/zerstören
// =========================================================================

/**
 * Löscht eine vorhandene Chart.js Instanz zuverlässig,
 * damit sich nicht mehrere Charts „stapeln“.
 */
function destroyChart() {
	const canvas = document.getElementById('chart');
	if (!canvas) return;

	const existing = Chart.getChart ? Chart.getChart(canvas) : null;
	if (existing) existing.destroy();
	chart = null;
}

/**
 * Zeichnet einen Line-Chart (Zeitverlauf).
 */
function buildChart(data) {
	destroyChart();

	const canvas = document.getElementById('chart');
	if (!canvas) return;

	// Canvas-Größe begrenzen (wichtig gegen „Canvas exceeds max size“)
	const box = canvas.parentElement;
	const w = Math.round(box.clientWidth);
	const h = Math.round(box.clientHeight);
	const physW = Math.min(Math.floor(w * DPR_CAP), MAX_CANVAS_PX);
	const physH = Math.min(Math.floor(h * DPR_CAP), MAX_CANVAS_PX);
	if (canvas.width !== physW) canvas.width = physW;
	if (canvas.height !== physH) canvas.height = physH;

	// Farben (Logo-nah): Duel = 2 Linien, Deep = 3 Linien
	const duelPalette = [{
			border: 'rgba(12,163,164,1)',
			fill: 'rgba(12,163,164,0.18)'
		},
		{
			border: 'rgba(255,91,108,1)',
			fill: 'rgba(255,91,108,0.21)'
		}
	];
	const deepPalette = [{
			border: 'rgba(12,163,164,1)',
			fill: 'rgba(12,163,164,0.18)'
		},
		{
			border: 'rgba(32,201,151,1)',
			fill: 'rgba(32,201,151,0.20)'
		},
		{
			border: 'rgba(255,175,63,1)',
			fill: 'rgba(255,175,63,0.22)'
		}
	];
	const palette =
		data.datasets.length === 2 ? duelPalette :
		data.datasets.length === 3 ? deepPalette : duelPalette;

	// Datasets dekorieren (Farben, Punkte)
	const decorated = data.datasets.map((ds, idx) => ({
		...ds,
		borderColor: palette[idx % palette.length].border,
		backgroundColor: palette[idx % palette.length].fill,
		pointRadius: 3,
		pointHoverRadius: 4
	}));

	const ctx = canvas.getContext('2d');
	chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: data.labels,
			datasets: decorated
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			devicePixelRatio: DPR_CAP,
			resizeDelay: 200,
			interaction: {
				mode: 'index',
				intersect: false
			},
			scales: {
				y: {
					beginAtZero: true
				}
			},
			animation: false
		}
	});
}

/**
 * Zeichnet einen horizontalen Bar-Chart (Top-Videos).
 */
function buildTopChart(data) {
	destroyChart();

	const canvas = document.getElementById('chart');
	if (!canvas) return;

	const box = canvas.parentElement;
	const w = Math.round(box.clientWidth);
	const h = Math.round(box.clientHeight);
	const physW = Math.min(Math.floor(w * DPR_CAP), MAX_CANVAS_PX);
	const physH = Math.min(Math.floor(h * DPR_CAP), MAX_CANVAS_PX);
	if (canvas.width !== physW) canvas.width = physW;
	if (canvas.height !== physH) canvas.height = physH;

	const ctx = canvas.getContext('2d');
	chart = new Chart(ctx, {
		type: 'bar',
		data: {
			labels: data.labels,
			datasets: data.datasets
		},
		options: {
			indexAxis: 'y',
			responsive: true,
			maintainAspectRatio: false,
			devicePixelRatio: DPR_CAP,
			resizeDelay: 200,
			interaction: {
				mode: 'index',
				intersect: false
			},
			scales: {
				x: {
					beginAtZero: true
				}
			},
			animation: false
		}
	});
}

// =========================================================================
// 4) UI-LOGIK: Welche Controls sind sichtbar/aktiv?
// =========================================================================

/**
 * Logik:
 * - Ansicht "Top-Videos": nur Begriff A, kein B, keine Metrik, Modus ist irrelevant → deaktivieren
 * - Ansicht "Zeitverlauf": Modus ist relevant:
 *    - Duel: zeigt B + Metrik
 *    - Deep-Dive: versteckt B + Metrik
 */
function updateControlVisibility() {
  const viewMode = viewModeEl?.value || 'trend';
  const duel = modeEl?.value === 'duel';

  // Hint ein-/ausblenden
  if (viewModeHintEl) {
    viewModeHintEl.classList.toggle('d-none', viewMode !== 'top');
  }

  if (viewMode === 'top') {
    // Top-Videos: nur Begriff A
    if (modeEl) {
      modeEl.value = 'deep';     // konsistenter interner Zustand
      modeEl.disabled = true;
    }

    if (qbWrap) qbWrap.style.display = 'none';
    if (qbEl) qbEl.disabled = true;

    if (metricWrap) metricWrap.style.display = 'none';
    if (metricEl) metricEl.disabled = true;
  } else {
    // Zeitverlauf
    if (modeEl) modeEl.disabled = false;

    // B & Metrik nur im Duel
    if (qbWrap) qbWrap.style.display = duel ? '' : 'none';
    if (qbEl) qbEl.disabled = !duel;

    if (metricWrap) metricWrap.style.display = duel ? '' : 'none';
    if (metricEl) metricEl.disabled = !duel;
  }
}

// =========================================================================
// 5) Dynamischer Chart-Titel / Untertitel
// =========================================================================

/**
 * Setzt Titel + Untertitel je nach Modus und Auswahl.
 */
function updateChartTitle(viewMode, duel, metric, qaText, qbText, days) {
	if (!chartTitleEl || !chartSubtitleEl) return;

	const metricLabels = {
		view_count: 'Views',
		like_count: 'Likes',
		comment_count: 'Kommentare'
	};

	const metricLabel = metricLabels[metric] || 'Views';
	const daysLabel = `letzte ${days} Tage`;

	if (viewMode === 'trend') {
		if (duel) {
			chartTitleEl.textContent = `Zeitverlauf: ${metricLabel} – ${qaText} vs. ${qbText}`;
		} else {
			chartTitleEl.textContent = `Zeitverlauf: Views, Likes & Kommentare – ${qaText}`;
		}
		chartSubtitleEl.textContent = daysLabel;
	} else {
		chartTitleEl.textContent = `Top-Videos: ${qaText}`;
		chartSubtitleEl.textContent = `Basis: Views, ${daysLabel}`;
	}
}

// -------------------- INSIGHTS --------------------

// Zahl formatieren (de-DE)
function fmt(n) {
  if (n == null || !isFinite(n)) return '0';
  return Number(n).toLocaleString('de-DE');
}

// Prozent formatieren
function fmtPct(p) {
  if (p == null || !isFinite(p)) return '0%';
  return `${Math.round(p)}%`;
}

// Sicherstellen, dass wir mit Zahlen arbeiten
function toNum(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

// Größten Peak finden (Label + Wert)
function findPeak(labels, values) {
  let maxVal = -Infinity;
  let maxIdx = -1;
  values.forEach((v, i) => {
    const n = toNum(v);
    if (n > maxVal) {
      maxVal = n;
      maxIdx = i;
    }
  });
  return { label: labels[maxIdx] ?? '', value: maxVal };
}

// Größten Tagesanstieg finden (Label des Zieltags + delta)
function findMaxIncrease(labels, values) {
  let bestDelta = -Infinity;
  let bestIdx = -1; // idx des Tages, an dem der Sprung sichtbar wird (i)
  for (let i = 1; i < values.length; i++) {
    const delta = toNum(values[i]) - toNum(values[i - 1]);
    if (delta > bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  }
  return { label: labels[bestIdx] ?? '', delta: bestDelta };
}

// Insight-Text setzen
function setInsight(text) {
  if (!insightTextEl) return;
  insightTextEl.textContent = text || '–';
}

/**
 * Insights für Duel-Trend:
 * - Summe A vs B und prozentualer Abstand
 * - Peak-Tag (A)
 * - größter Anstieg (A)
 */
function insightDuelTrend({ labels, aValues, bValues, qaText, qbText, metricLabel, days }) {
  const sumA = aValues.reduce((acc, v) => acc + toNum(v), 0);
  const sumB = bValues.reduce((acc, v) => acc + toNum(v), 0);

  // Abstand in % (bezogen auf B)
  const pct = sumB === 0 ? null : ((sumA - sumB) / sumB) * 100;

  const peakA = findPeak(labels, aValues);
  const incA = findMaxIncrease(labels, aValues);

  const leadText =
    pct == null
      ? `${qaText} liegt im Zeitraum der letzten ${days} Tage vor ${qbText} (B hatte kaum/keine Werte).`
      : (sumA >= sumB
          ? `${qaText} erzielt in den letzten ${days} Tagen rund ${fmtPct(pct)} mehr ${metricLabel} als ${qbText}.`
          : `${qaText} erzielt in den letzten ${days} Tagen rund ${fmtPct(-pct)} weniger ${metricLabel} als ${qbText}.`);

  const peakText = peakA.label
    ? `Peak bei ${qaText}: ${fmt(peakA.value)} am ${peakA.label}.`
    : '';

  const incText = (incA.label && isFinite(incA.delta))
    ? `Stärkster Tagesanstieg bei ${qaText}: +${fmt(incA.delta)} am ${incA.label}.`
    : '';

  return [leadText, peakText, incText].filter(Boolean).join(' ');
}

/**
 * Insights für Deep-Trend:
 * - Peak-Tag (Views)
 * - größter Anstieg (Views)
 * - Verhältnis Likes/Views (grob) über den Zeitraum
 */
function insightDeepTrend({ labels, views, likes, qaText, days }) {
  const peak = findPeak(labels, views);
  const inc = findMaxIncrease(labels, views);

  const sumViews = views.reduce((a, v) => a + toNum(v), 0);
  const sumLikes = likes.reduce((a, v) => a + toNum(v), 0);
  const ratio = sumViews === 0 ? null : (sumLikes / sumViews) * 100;

  const peakText = peak.label
    ? `Peak bei Views: ${fmt(peak.value)} am ${peak.label}.`
    : '';

  const incText = (inc.label && isFinite(inc.delta))
    ? `Stärkster Tagesanstieg: +${fmt(inc.delta)} Views am ${inc.label}.`
    : '';

  const ratioText = ratio == null
    ? ''
    : `Likes-Rate über ${days} Tage: ca. ${ratio.toFixed(2)}%.`;

  const lead = `Deep-Dive zu „${qaText}“ (letzte ${days} Tage).`;

  return [lead, peakText, incText, ratioText].filter(Boolean).join(' ');
}

// =========================================================================
// 6) Tabelle: Sortierung + Rendern + Badges + Header-Indikatoren
// =========================================================================

/**
 * Sortiert Zeilen je nach sortState.
 */
function sortRows(rows) {
	const {
		key,
		dir
	} = sortState;
	const factor = dir === 'asc' ? 1 : -1;
	const sorted = [...rows];

	sorted.sort((a, b) => {
		if (key === 'views') return (Number(a.view_count || 0) - Number(b.view_count || 0)) * factor;
		if (key === 'likes') return (Number(a.like_count || 0) - Number(b.like_count || 0)) * factor;
		if (key === 'comments') return (Number(a.comment_count || 0) - Number(b.comment_count || 0)) * factor;
		if (key === 'date') return String(a.published_at || '').localeCompare(String(b.published_at || '')) * factor;
		if (key === 'title') return String(a.title || '').toLowerCase().localeCompare(String(b.title || '').toLowerCase()) * factor;
		if (key === 'lang') return String(a.language || '').toLowerCase().localeCompare(String(b.language || '').toLowerCase()) * factor;

		// Fallback: Views
		return (Number(a.view_count || 0) - Number(b.view_count || 0)) * factor;
	});

	return sorted;
}

/**
 * Markiert im Tabellenkopf die aktuell sortierte Spalte (CSS übernimmt Pfeile/Icons).
 */
function updateSortIndicators() {
	const headers = document.querySelectorAll('th[data-sort]');
	headers.forEach((th) => {
		th.classList.remove('sorted-asc', 'sorted-desc');
		if (th.dataset.sort === sortState.key) {
			th.classList.add(sortState.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
		}
	});
}

/**
 * Rendert Tabelle:
 * - sortiert Daten
 * - erstellt Badges "Top 1, Top 2, ..."
 * - speichert data-* fürs Modal
 */
function renderTable(rows) {
	if (!tbody) return;

	// wir merken uns die aktuellen Zeilen, damit wir bei Sortierung nicht neu fetchen müssen
	currentRows = rows.slice();

	// sortiert anzeigen
	const sorted = sortRows(currentRows);

	tbody.innerHTML = '';

	sorted.forEach((row, idx) => {
		const tr = document.createElement('tr');
		const rank = idx + 1;

		// Badge: immer "Top X" passend zur aktuellen Sortierung
		let badgeLabel = `Top ${rank}`;
		let badgeClass = 'badge bg-secondary-subtle text-secondary-emphasis';
		if (rank === 1) badgeClass = 'badge bg-danger';
		else if (rank <= 3) badgeClass = 'badge bg-warning';
		else if (rank <= 10) badgeClass = 'badge bg-success';

		// Daten fürs Modal speichern
		tr.dataset.videoId = row.video_id;
		tr.dataset.title = row.title;
		tr.dataset.views = row.view_count ?? '';
		tr.dataset.likes = row.like_count ?? '';
		tr.dataset.comments = row.comment_count ?? '';
		tr.dataset.publishedAt = row.published_at || '';
		tr.dataset.language = row.language || '';

		const youtubeUrl = row.video_id ? `https://www.youtube.com/watch?v=${row.video_id}` : '#';

		tr.innerHTML = `
	  <td><span class="${badgeClass}">${badgeLabel}</span></td>
	  <td><a href="${youtubeUrl}" class="text-decoration-none">${row.title}</a></td>
	  <td>${row.view_count == null ? '–' : Number(row.view_count).toLocaleString('de-DE')}</td>
	  <td>${row.like_count == null ? '–' : Number(row.like_count).toLocaleString('de-DE')}</td>
	  <td>${row.comment_count == null ? '–' : Number(row.comment_count).toLocaleString('de-DE')}</td>
	  <td>${row.published_at ? row.published_at.replace('T', ' ').substring(0, 16) : ''}</td>
	  <td>${row.language || '–'}</td>
	`;

		tbody.appendChild(tr);
	});

	// Nur einmal einen Klick-Listener auf das tbody hängen (Event-Delegation)
	if (!tbody.dataset.bound) {
		tbody.addEventListener('click', (ev) => {
			const tr = ev.target.closest('tr[data-video-id]');
			if (!tr) return;
			ev.preventDefault();
			openVideoModalFromRow(tr);
		});
		tbody.dataset.bound = '1';
	}

	updateSortIndicators();
}

/**
 * Klickbare Sortierung im Tabellenkopf:
 * - Klick auf gleiche Spalte: Richtung wechseln
 * - Klick auf neue Spalte: Standardrichtung setzen
 */
function initTableSorting() {
	const headers = document.querySelectorAll('th[data-sort]');
	headers.forEach((th) => {
		th.addEventListener('click', () => {
			const key = th.dataset.sort;
			if (!key) return;

			if (sortState.key === key) {
				sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
			} else {
				sortState.key = key;
				sortState.dir = (key === 'title' || key === 'lang' || key === 'date') ? 'asc' : 'desc';
			}

			// Tabelle neu rendern (Sortierung wirkt sofort)
			renderTable(currentRows);
		});
	});
}

// =========================================================================
// 7) Daten laden: Suchbegriffe (queries.php)
// =========================================================================

/**
 * Lädt Suchbegriffe aus queries.php und füllt die Dropdowns.
 */
async function loadQueries() {
	const res = await fetch('queries.php');
	const queries = await res.json();

	qaEl.innerHTML = '';
	qbEl.innerHTML = '';

	queries.forEach((q) => {
		const optA = document.createElement('option');
		optA.value = q.id;
		optA.textContent = q.term;
		qaEl.appendChild(optA);

		const optB = document.createElement('option');
		optB.value = q.id;
		optB.textContent = q.term;
		qbEl.appendChild(optB);
	});

	if (qaEl.options.length > 0) qaEl.selectedIndex = 0;
	if (qbEl.options.length > 1) qbEl.selectedIndex = 1;
	else if (qbEl.options.length > 0) qbEl.selectedIndex = 0;

	if (tblTerm && qaEl.options.length > 0) {
		tblTerm.textContent = qaEl.options[qaEl.selectedIndex].text;
	}
}

// =========================================================================
// 8) Hauptfunktion: refresh()
// =========================================================================

/**
 * refresh() macht:
 * 1) UI-Controls passend ein-/ausblenden
 * 2) Chartdaten holen (Trend oder Top)
 * 3) Tabelle holen (Trend: alle; Top: nur Top-10)
 * 4) Alles rendern
 */
async function refresh() {
  if (!qaEl || qaEl.value === '') return;

  // Wichtig: zuerst UI-Zustand setzen, damit danach korrekt gelesen wird
  updateControlVisibility();

  // Zustand nach möglichen Auto-Anpassungen erneut lesen
  const duel = modeEl?.value === 'duel';
  const viewMode = viewModeEl?.value || 'trend';

  const days = daysEl.value;
  const qa = qaEl.value;
  const qb = qbEl.value;
  const metric = metricEl.value;

  const qaText = qaEl.options[qaEl.selectedIndex].text;
  const qbText = qbEl.options[qbEl.selectedIndex]
    ? qbEl.options[qbEl.selectedIndex].text
    : '';

  // Titel anpassen
  updateChartTitle(viewMode, duel, metric, qaText, qbText, days);

  let rows = [];

  // ==================== Trend / Zeitverlauf ====================
  if (viewMode === 'trend') {
    let seriesData;

    // -------- Duel: zwei Begriffe + eine Metrik --------
    if (duel) {
      const url =
        `series_compare.php?query_id_a=${encodeURIComponent(qa)}` +
        `&query_id_b=${encodeURIComponent(qb)}` +
        `&metric=${encodeURIComponent(metric)}` +
        `&days=${encodeURIComponent(days)}`;

      const res = await fetch(url);
      const js = await res.json();

      // Einheitliche X-Achse
      const labels = Array.from(
        new Set([...js.a.map(r => r.d), ...js.b.map(r => r.d)])
      ).sort();

      const mapA = {};
      js.a.forEach(r => { mapA[r.d] = Number(r.val) || 0; });

      const mapB = {};
      js.b.forEach(r => { mapB[r.d] = Number(r.val) || 0; });

      seriesData = {
        labels,
        datasets: [
          {
            label: qaText,
            data: labels.map(d => mapA[d] || 0),
            tension: 0.3
          },
          {
            label: qbText,
            data: labels.map(d => mapB[d] || 0),
            tension: 0.3
          }
        ]
      };

      // INSIGHT: Duel-Trend
      const metricLabels = {
        view_count: 'Views',
        like_count: 'Likes',
        comment_count: 'Kommentare'
      };

      const insight = insightDuelTrend({
        labels,
        aValues: seriesData.datasets[0].data,
        bValues: seriesData.datasets[1].data,
        qaText,
        qbText,
        metricLabel: metricLabels[metric] || 'Views',
        days
      });

      setInsight(insight);
    }

    // -------- Deep-Dive: ein Begriff, drei Metriken --------
    else {
      const url =
        `series_deep.php?query_id=${encodeURIComponent(qa)}` +
        `&days=${encodeURIComponent(days)}`;

      const res = await fetch(url);
      const js = await res.json();

      seriesData = {
        labels: js.map(r => r.d),
        datasets: [
          {
            label: 'Views',
            data: js.map(r => Number(r.views) || 0),
            tension: 0.3
          },
          {
            label: 'Likes',
            data: js.map(r => Number(r.likes) || 0),
            tension: 0.3
          },
          {
            label: 'Kommentare',
            data: js.map(r => Number(r.comments) || 0),
            tension: 0.3
          }
        ]
      };

      // INSIGHT: Deep-Dive
      const insight = insightDeepTrend({
        labels: seriesData.labels,
        views: seriesData.datasets[0].data,
        likes: seriesData.datasets[1].data,
        qaText,
        days
      });

      setInsight(insight);
    }

    buildChart(seriesData);

    // Tabelle: alle Videos zu Begriff A im Zeitraum
    const tableUrl =
      `table.php?query_id=${encodeURIComponent(qa)}` +
      `&days=${encodeURIComponent(days)}`;
    const tableRes = await fetch(tableUrl);
    rows = await tableRes.json();
  }

  // ==================== Top-Videos ====================
  else {
    const tableUrl =
      `table.php?query_id=${encodeURIComponent(qa)}` +
      `&days=${encodeURIComponent(days)}`;

    const tableRes = await fetch(tableUrl);
    const allRows = await tableRes.json();

    const top = allRows.slice(0, 10);

    const labels = top.map(r =>
      r.title && r.title.length > 48
        ? r.title.slice(0, 45) + '…'
        : (r.title || '')
    );

    const data = top.map(r => Number(r.view_count || 0));

    buildTopChart({
      labels,
      datasets: [{
        label: 'Views (Top 10)',
        data,
        tension: 0.3
      }]
    });

    // INSIGHT: Top-Videos
    setInsight(
      `Top-10-Videos zu „${qaText}“ im Zeitraum der letzten ${days} Tage. ` +
      `Ranking und Balkendiagramm basieren ausschließlich auf Views.`
    );

    rows = top;
  }

  // Tabellenüberschrift
  if (tblTerm) tblTerm.textContent = qaText;

  // Tabelle rendern
  renderTable(rows);
}

// =========================================================================
// 9) Event-Handling (UI reagieren lassen)
// =========================================================================

/**
 * Bindet Event-Listener an UI-Controls.
 * WICHTIG: mode + viewMode rufen erst updateControlVisibility() auf.
 */
function bindEvents() {
	if (modeEl) modeEl.addEventListener('change', () => {
		updateControlVisibility();
		refresh();
	});
	if (viewModeEl) viewModeEl.addEventListener('change', () => {
		updateControlVisibility();
		refresh();
	});

	if (daysEl) daysEl.addEventListener('change', refresh);
	if (metricEl) metricEl.addEventListener('change', refresh);
	if (qaEl) qaEl.addEventListener('change', refresh);
	if (qbEl) qbEl.addEventListener('change', refresh);
	if (reloadBtn) reloadBtn.addEventListener('click', refresh);
}

// =========================================================================
// 10) Initialisierung beim Laden der Seite
// =========================================================================

window.addEventListener('load', async () => {
	initThemeToggle();
	initHelpSystem();
	initVideoModal();

	// Begriffe laden und Dropdowns befüllen
	await loadQueries();

	// Events registrieren
	bindEvents();

	// Controls passend ein-/ausblenden (z.B. beim ersten Laden)
	updateControlVisibility();

	// Sortierung aktivieren
	initTableSorting();

	// Erste Daten laden
	await refresh();

	// Bei Resize nicht permanent refreshen, sondern „debounced“
	let resizeTimeout;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(refresh, 300);
	});
});

// Popover schließen, wenn außerhalb geklickt wird
document.addEventListener('click', (ev) => {
  if (!activeHelpPopover) return;

  const popoverEl = document.querySelector('.popover');
  const triggerEl = ev.target.closest('.ykm-help-btn');

  // Klick auf das aktive Info-Icon → nicht schließen (Bootstrap regelt Toggle)
  if (triggerEl) return;

  // Klick innerhalb des Popovers → nicht schließen
  if (popoverEl && popoverEl.contains(ev.target)) return;

  // sonst: schließen
  activeHelpPopover.hide();
  activeHelpPopover = null;
});
