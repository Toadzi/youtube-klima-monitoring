<!doctype html>
<html lang="de">

<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>YouTube Klima Monitoring</title>

	<!-- Bootstrap CSS -->
	<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
	<link rel="stylesheet" href="assets/css/styles.css" />

	<link rel="apple-touch-icon" sizes="180x180" href="/youtube-klima-monitoring/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/youtube-klima-monitoring/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/youtube-klima-monitoring/favicon-16x16.png">
	<link rel="manifest" href="/youtube-klima-monitoring/site.webmanifest">

</head>

<body>
	<nav class="navbar ykm-navbar">
		<div class="container d-flex align-items-center">
			<a href="index.php" class="navbar-brand d-flex align-items-center mb-0">
				<img src="assets/img/logo-header.png" alt="YouTube Klima Monitoring" class="navbar-logo" />
			</a>
			<button id="themeToggle" class="btn btn-sm btn-outline-light ms-auto" type="button">
				Dark Mode
			</button>
		</div>
	</nav>

	<main class="container py-4">
		<header class="text-center mb-4">
			<h1 class="mb-1">YouTube &amp; Klimathemen</h1>
			<p class="text-muted mb-0">Datenjournalistische Analyse von YouTube-Suchbegriffen</p>
		</header>

		<!-- Control panel -->
		<section class="card p-3 mb-4 shadow-sm">
			<div class="row g-3 align-items-end">
				<div class="col-12 col-md-3">
					<label for="mode" class="form-label">Modus</label>
					<select id="mode" class="form-select">
						<option value="duel" selected>Duel: 2 Begriffe, 1 Metrik</option>
						<option value="deep">Deep-Dive: 1 Begriff, 3 Metriken</option>
					</select>
				</div>
				<div class="col-12 col-md-3">
					<label for="viewMode" class="form-label">Ansicht</label>
					<select id="viewMode" class="form-select">
						<option value="trend" selected>Zeitverlauf</option>
						<option value="top">Top-Videos</option>
					</select>
				</div>
				<div class="col-6 col-md-2">
					<label for="days" class="form-label">Zeitraum</label>
					<select id="days" class="form-select">
						<option value="7">7 Tage</option>
						<option value="14">14 Tage</option>
						<option value="30" selected>30 Tage</option>
					</select>
				</div>
				<div class="col-6 col-md-2" id="metricWrap">
					<label for="metric" class="form-label">Metrik</label>
					<select id="metric" class="form-select">
						<option value="view_count" selected>Views</option>
						<option value="like_count">Likes</option>
						<option value="comment_count">Kommentare</option>
					</select>
				</div>
				<div class="col-12 col-md-2">
					<label for="qa" class="form-label">Begriff A</label>
					<select id="qa" class="form-select"></select>
				</div>
				<div class="col-12 col-md-2" id="qbWrap">
					<label for="qb" class="form-label">Begriff B</label>
					<select id="qb" class="form-select"></select>
				</div>
				<div class="col-12 col-md-1 d-grid">
					<button id="reload" class="btn btn-primary">Anzeigen</button>
				</div>
			</div>
		</section>

		<!-- Chart section -->
		<section class="card mb-4 shadow-sm">
			<div class="card-body">

				<h5 class="card-title mb-0" id="chartTitle">Zeitverlauf</h5>
				<p class="text-muted small mb-3" id="chartSubtitle">letzte 30 Tage</p>
				
				<div id="insightBox" class="ykm-insight mt-2 mb-3" role="note" aria-live="polite">
					<div class="ykm-insight-title">Kurz-Insight</div>
  					<div id="insightText" class="ykm-insight-text">–</div>
				</div>

				<div class="chart-box">
					<canvas id="chart"></canvas>
				</div>
			</div>
		</section>

		<!-- Table section -->
		<section class="card shadow-sm">
			<div class="card-body">
				<h5 class="card-title">Videos (Begriff: <span id="tblTerm">–</span>)</h5>
				<div class="table-responsive">
					<table class="table table-striped align-middle mb-0">
						<thead class="table-light">
							<tr>
								<th data-sort="rank">Rang</th>
								<th data-sort="title">Titel</th>
								<th data-sort="views">Views</th>
								<th data-sort="likes">Likes</th>
								<th data-sort="comments">Kommentare</th>
								<th data-sort="date">Datum</th>
								<th data-sort="lang">Sprache</th>
							</tr>
						</thead>
						<tbody id="tbody">
							<!-- Dynamisch gefüllt -->
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Video Detail Modal -->
		<div class="modal fade" id="videoModal" tabindex="-1" aria-hidden="true">
			<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title" id="videoModalLabel">Video-Details</h5>
						<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
					</div>
					<div class="modal-body">
						<div class="ratio ratio-16x9 mb-3">
							<iframe id="videoModalFrame" src="" title="YouTube Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
						</div>
						<dl class="row mb-0 small">
							<dt class="col-4">Suchbegriff</dt>
							<dd class="col-8 text-end" id="videoModalTerm"></dd>
							<dt class="col-4">Veröffentlicht am</dt>
							<dd class="col-8 text-end" id="videoModalDate"></dd>
							<dt class="col-4">Sprache</dt>
							<dd class="col-8 text-end" id="videoModalLang"></dd>
							<dt class="col-4">Views</dt>
							<dd class="col-8 text-end" id="videoModalViews"></dd>
							<dt class="col-4">Likes</dt>
							<dd class="col-8 text-end" id="videoModalLikes"></dd>
							<dt class="col-4">Kommentare</dt>
							<dd class="col-8 text-end" id="videoModalComments"></dd>
						</dl>
					</div>
					<div class="modal-footer">
						<a id="videoModalYoutubeLink" href="#" target="_blank" rel="noopener" class="btn btn-primary">Auf YouTube öffnen</a>
					</div>
				</div>
			</div>
		</div>

	</main>

	<!-- Application Script -->

	<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
	<script src="assets/js/app.js"></script>
</body>

</html>
