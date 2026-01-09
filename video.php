<?php
require_once __DIR__ . '/config.php';

$videoId = isset($_GET['video_id']) ? trim($_GET['video_id']) : '';

if ($videoId === '') {
    http_response_code(400);
    echo 'Fehlender Parameter: video_id';
    exit;
}

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $pdo->prepare('
        SELECT v.video_id, v.title, v.published_at, v.language,
               v.view_count, v.like_count, v.comment_count,
               q.term AS query_term
        FROM videos v
        JOIN queries q ON q.id = v.query_id
        WHERE v.video_id = :vid
        ORDER BY v.fetched_at DESC
        LIMIT 1
    ');
    $stmt->execute([':vid' => $videoId]);
    $video = $stmt->fetch();

    if (!$video) {
        http_response_code(404);
        echo 'Video nicht gefunden.';
        exit;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo 'Datenbankfehler.';
    exit;
}

function h(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= h($video['title']) ?> – YouTube Klima Monitoring</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/styles.css" />
</head>
<body>
    <nav class="navbar ykm-navbar">
    <div class="container d-flex align-items-center">
      <a href="index.php" class="navbar-brand d-flex align-items-center mb-0">
        <img src="assets/img/logo.svg" alt="YouTube Klima Monitoring" class="navbar-logo" />
        <span class="ms-2">
          <strong>YouTube</strong><br />Klima Monitoring
        </span>
      </a>
      <button id="themeToggle" class="btn btn-sm btn-outline-light ms-auto" type="button">
        Dark Mode
      </button>
    </div>
  </nav>

  <main class="container py-4">
    <a href="index.php" class="btn btn-sm btn-outline-light mb-3">&larr; Zurück zur Übersicht</a>

    <div class="row g-4">
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm">
          <div class="card-body">
            <h1 class="h4 mb-3"><?= h($video['title']) ?></h1>
            <div class="ratio ratio-16x9 mb-3">
              <iframe
                src="https://www.youtube.com/embed/<?= h($video['video_id']) ?>"
                title="<?= h($video['title']) ?>"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            </div>
            <p class="mb-1"><strong>Suchbegriff:</strong> <?= h($video['query_term']) ?></p>
            <p class="mb-1"><strong>Veröffentlicht am:</strong> <?= h($video['published_at']) ?></p>
            <p class="mb-1"><strong>Sprache:</strong> <?= h($video['language'] ?? '–') ?></p>
            <p class="mb-0">
              <a href="https://www.youtube.com/watch?v=<?= h($video['video_id']) ?>" target="_blank" rel="noopener" class="btn btn-sm btn-primary mt-3">
                Auf YouTube öffnen
              </a>
            </p>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Kennzahlen</h2>
            <dl class="row mb-0">
              <dt class="col-6">Views</dt>
              <dd class="col-6 text-end"><?= number_format((int)$video['view_count'], 0, ',', '.') ?></dd>

              <dt class="col-6">Likes</dt>
              <dd class="col-6 text-end">
                <?= $video['like_count'] !== null ? number_format((int)$video['like_count'], 0, ',', '.') : '–' ?>
              </dd>

              <dt class="col-6">Kommentare</dt>
              <dd class="col-6 text-end">
                <?= $video['comment_count'] !== null ? number_format((int)$video['comment_count'], 0, ',', '.') : '–' ?>
              </dd>
            </dl>
          </div>
        </div>

        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-muted mb-3">Meta</h2>
            <p class="small text-muted mb-0">
              Letzter Stand laut Monitoring-Datenbank.<br>
              Werte können gegenüber der Live-Anzeige auf YouTube leicht abweichen.
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>

  <script>
  const THEME_KEY = 'ykm-theme';
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
  window.addEventListener('DOMContentLoaded', initThemeToggle);
  </script>
</body>
</html>

