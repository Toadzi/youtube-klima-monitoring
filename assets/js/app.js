// Maximum device pixel ratio (HiDPI cap)
const DPR_CAP = Math.min(window.devicePixelRatio || 1, 2);
const MAX_CANVAS_PX = 4096;

let chart = null;
let videoModal = null;
let currentRows = [];
let sortState = {
	key: 'views',
	dir: 'desc'
};
const THEME_KEY = 'ykm-theme';

// DOM elements
const modeEl = document.getElementById('mode');
const viewModeEl = document.getElementById('viewMode');
const daysEl = document.getElementById('days');
const metricEl = document.getElementById('metric');
const qaEl = document.getElementById('qa');
const qbEl = document.getElementById('qb');
const qbWrap = document.getElementById('qbWrap');
const metricWrap = document.getElementById('metricWrap');
const reloadBtn = document.getElementById('reload');
const tblTerm = document.getElementById('tblTerm');
const tbody = document.getElementById('tbody');
const chartTitleEl = document.getElementById('chartTitle');
const chartSubtitleEl = document.getElementById('chartSubtitle');

// THEME HANDLING
function applyTheme(theme) {
	const root = document.documentElement;
	if (theme === 'dark') {
		root.classList.add('dark-theme');
	} else {
		root.classList.remove('dark-theme');
	}
}

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

// MODAL HANDLING
function initVideoModal() {
	const el = document.getElementById('videoModal');
	if (!el || !window.bootstrap) return;
	videoModal = new bootstrap.Modal(el);
}

function openVideoModalFromRow(tr) {
	if (!videoModal) {
		initVideoModal();
	}
	if (!videoModal) return;

	const id = tr.dataset.videoId;
	if (!id) return;

	const title = tr.dataset.title || '';
	const views = tr.dataset.views ? Number(tr.dataset.views).toLocaleString('de-DE') : '–';
	const likes = tr.dataset.likes ? Number(tr.dataset.likes).toLocaleString('de-DE') : '–';
	const comments = tr.dataset.comments ? Number(tr.dataset.comments).toLocaleString('de-DE') : '–';
	const publishedAt = tr.dataset.publishedAt ? tr.dataset.publishedAt.replace('T', ' ').substring(0, 16) : '';
	const lang = tr.dataset.language || '–';
	const term = qaEl && qaEl.options[qaEl.selectedIndex] ? qaEl.options[qaEl.selectedIndex].text : '';

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
	if (linkEl) linkEl.href = `https://www.youtube.com/watch?v=${id}`;
	if (frameEl) frameEl.src = `https://www.youtube.com/embed/${id}`;

	videoModal.show();
}

// CHART HELPERS
function destroyChart() {
	const canvas = document.getElementById('chart');
	if (!canvas) return;
	const existing = Chart.getChart ? Chart.getChart(canvas) : null;
	if (existing) existing.destroy();
	chart = null;
}

function buildChart(data) {
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
	const palette = data.datasets.length === 2 ? duelPalette :
		data.datasets.length === 3 ? deepPalette : duelPalette;

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

// CHART TITLE
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

// TABLE SORTING & RENDERING
function sortRows(rows) {
	const {
		key,
		dir
	} = sortState;
	const factor = dir === 'asc' ? 1 : -1;
	const sorted = [...rows];

	sorted.sort((a, b) => {
		if (key === 'views') {
			const av = Number(a.view_count || 0);
			const bv = Number(b.view_count || 0);
			return (av - bv) * factor;
		}
		if (key === 'likes') {
			const av = Number(a.like_count || 0);
			const bv = Number(b.like_count || 0);
			return (av - bv) * factor;
		}
		if (key === 'comments') {
			const av = Number(a.comment_count || 0);
			const bv = Number(b.comment_count || 0);
			return (av - bv) * factor;
		}
		if (key === 'date') {
			const ad = a.published_at || '';
			const bd = b.published_at || '';
			return ad.localeCompare(bd) * factor;
		}
		if (key === 'title') {
			const at = (a.title || '').toLowerCase();
			const bt = (b.title || '').toLowerCase();
			return at.localeCompare(bt) * factor;
		}
		if (key === 'lang') {
			const al = (a.language || '').toLowerCase();
			const bl = (b.language || '').toLowerCase();
			return al.localeCompare(bl) * factor;
		}
		// default: sort by views
		const av = Number(a.view_count || 0);
		const bv = Number(b.view_count || 0);
		return (av - bv) * factor;
	});

	return sorted;
}

function renderTable(rows) {
	if (!tbody) return;
	currentRows = rows.slice();
	const sorted = sortRows(currentRows);

	tbody.innerHTML = '';
	sorted.forEach((row, idx) => {
		const tr = document.createElement('tr');
		const rank = idx + 1;

		// Rang-Badge: immer "Top {Rang}", Farbe nach Range
		let badgeLabel = `Top ${rank}`;
		let badgeClass = 'badge bg-secondary-subtle text-secondary-emphasis';
		if (rank === 1) {
			badgeClass = 'badge bg-danger';
		} else if (rank <= 3) {
			badgeClass = 'badge bg-warning';
		} else if (rank <= 10) {
			badgeClass = 'badge bg-success';
		}

		tr.dataset.videoId = row.video_id;
		tr.dataset.title = row.title;
		tr.dataset.views = row.view_count ?? '';
		tr.dataset.likes = row.like_count ?? '';
		tr.dataset.comments = row.comment_count ?? '';
		tr.dataset.publishedAt = row.published_at || '';
		tr.dataset.language = row.language || '';

		const youtubeUrl = row.video_id ?
			`https://www.youtube.com/watch?v=${row.video_id}` :
			'#';

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

	if (!tbody.dataset.bound) {
		tbody.addEventListener('click', (ev) => {
			const tr = ev.target.closest('tr[data-video-id]');
			if (!tr) return;
			ev.preventDefault();
			openVideoModalFromRow(tr);
		});
		tbody.dataset.bound = '1';
	}

	// Icons im Header aktualisieren
	updateSortIndicators();
}

function updateSortIndicators() {
	const headers = document.querySelectorAll('th[data-sort]');
	headers.forEach((th) => {
		th.classList.remove('sorted-asc', 'sorted-desc');
		if (th.dataset.sort === sortState.key) {
			th.classList.add(sortState.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
		}
	});
}

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

			renderTable(currentRows);
		});
	});
}

// DATA LOADING
async function loadQueries() {
	const res = await fetch('queries.php');
	const queries = await res.json();

	qaEl.innerHTML = '';
	qbEl.innerHTML = '';

	queries.forEach((q, idx) => {
		const optA = document.createElement('option');
		optA.value = q.id;
		optA.textContent = q.term;
		qaEl.appendChild(optA);

		const optB = document.createElement('option');
		optB.value = q.id;
		optB.textContent = q.term;
		qbEl.appendChild(optB);
	});

	if (qaEl.options.length > 0) {
		qaEl.selectedIndex = 0;
	}
	if (qbEl.options.length > 1) {
		qbEl.selectedIndex = 1;
	} else if (qbEl.options.length > 0) {
		qbEl.selectedIndex = 0;
	}

	if (tblTerm && qaEl.options.length > 0) {
		tblTerm.textContent = qaEl.options[qaEl.selectedIndex].text;
	}
}

// MAIN REFRESH
async function refresh() {
	if (!qaEl || qaEl.value === '') return;

	const duel = modeEl.value === 'duel';
	const viewMode = viewModeEl ? (viewModeEl.value || 'trend') : 'trend';

	if (qbWrap) qbWrap.style.display = duel ? '' : 'none';
	if (metricWrap) metricWrap.style.display = duel ? '' : 'none';

	const days = daysEl.value;
	const qa = qaEl.value;
	const qb = qbEl.value;
	const metric = metricEl.value;

	const qaText = qaEl.options[qaEl.selectedIndex].text;
	const qbText = qbEl.options[qbEl.selectedIndex] ? qbEl.options[qbEl.selectedIndex].text : '';

	updateChartTitle(viewMode, duel, metric, qaText, qbText, days);

	let rows = [];

	if (viewMode === 'trend') {
		let seriesData;
		if (duel) {
			const url = `series_compare.php?query_id_a=${encodeURIComponent(qa)}&query_id_b=${encodeURIComponent(qb)}&metric=${encodeURIComponent(metric)}&days=${encodeURIComponent(days)}`;
			const res = await fetch(url);
			const js = await res.json();

			const labels = Array.from(new Set([...js.a.map(r => r.d), ...js.b.map(r => r.d)])).sort();
			const mapA = {};
			js.a.forEach(r => {
				mapA[r.d] = Number(r.val) || 0;
			});
			const mapB = {};
			js.b.forEach(r => {
				mapB[r.d] = Number(r.val) || 0;
			});

			seriesData = {
				labels,
				datasets: [{
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
		} else {
			const url = `series_deep.php?query_id=${encodeURIComponent(qa)}&days=${encodeURIComponent(days)}`;
			const res = await fetch(url);
			const js = await res.json();

			seriesData = {
				labels: js.map(r => r.d),
				datasets: [{
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
		}
		buildChart(seriesData);

		const tableUrl = `table.php?query_id=${encodeURIComponent(qa)}&days=${encodeURIComponent(days)}`;
		const tableRes = await fetch(tableUrl);
		rows = await tableRes.json();
	} else {
		const tableUrl = `table.php?query_id=${encodeURIComponent(qa)}&days=${encodeURIComponent(days)}`;
		const tableRes = await fetch(tableUrl);
		const allRows = await tableRes.json();

		// Top 10 nach Views für Chart UND Tabelle
		const top = allRows.slice(0, 10);

		const labels = top.map(r =>
			r.title && r.title.length > 48 ? r.title.slice(0, 45) + '…' : (r.title || '')
		);
		const data = top.map(r => Number(r.view_count || 0));
		const datasets = [{
			label: 'Views (Top 10)',
			data,
			tension: 0.3
		}];
		buildTopChart({
			labels,
			datasets
		});

		// Tabelle im Top-Modus nur mit Top 10 befüllen
		rows = top;
	}


	if (tblTerm) {
		tblTerm.textContent = qaText;
	}
	renderTable(rows);
}

// EVENT BINDINGS
function bindEvents() {
	if (modeEl) modeEl.addEventListener('change', refresh);
	if (viewModeEl) viewModeEl.addEventListener('change', refresh);
	if (daysEl) daysEl.addEventListener('change', refresh);
	if (metricEl) metricEl.addEventListener('change', refresh);
	if (qaEl) qaEl.addEventListener('change', refresh);
	if (qbEl) qbEl.addEventListener('change', refresh);
	if (reloadBtn) reloadBtn.addEventListener('click', refresh);
}

// INITIALIZE
window.addEventListener('load', async () => {
	initThemeToggle();
	initVideoModal();
	await loadQueries();
	bindEvents();
	initTableSorting();
	await refresh();

	let resizeTimeout;
	window.addEventListener('resize', () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			refresh();
		}, 300);
	});
});
