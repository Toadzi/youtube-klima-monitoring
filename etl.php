#!/usr/bin/php
<?php
/**
 * ETL-Skript (Extract–Transform–Load) für das YouTube Klima Monitoring.
 *
 * Dieses Skript ruft für jeden Suchbegriff aus der Tabelle `queries` die
 * aktuellen Videos über die YouTube Data API ab und aktualisiert bzw.
 * speichert die Videometadaten und tagesaktuelle Statistiken in der Datenbank.
 *
 * Hinweis: Zum Ausführen dieses Skripts benötigen Sie einen gültigen
 * YouTube-API-Schlüssel (YT_API_KEY in config.php) und PHP mit aktivierter
 * cURL- oder Datei-URL-Unterstützung.
 */

require_once __DIR__ . '/config.php';

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, "DB-Verbindung fehlgeschlagen: " . $e->getMessage() . "\n");
    exit(1);
}

if (empty(YT_API_KEY) || YT_API_KEY === 'HIER_DEIN_API_KEY') {
    fwrite(STDERR, "Bitte hinterlegen Sie Ihren YT_API_KEY in config.php.\n");
    exit(1);
}

// Alle Suchbegriffe abrufen
$queries = $pdo->query('SELECT id, term FROM queries')->fetchAll();
if (!$queries) {
    fwrite(STDERR, "Keine Suchbegriffe gefunden.\n");
    exit(0);
}

// Helper zum Abrufen von JSON via GET
function fetch_json($url) {
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\n",
            'timeout' => 20,
        ],
    ];
    $context = stream_context_create($opts);
    $content = @file_get_contents($url, false, $context);
    if ($content === false) {
        return null;
    }
    return json_decode($content, true);
}

// Datum für Statistik (Tagesauflösung)
$today = date('Y-m-d');

// Prepared Statements für Insert/Upsert
$insertVideoStmt = $pdo->prepare("INSERT INTO videos (video_id, query_id, channel_id, title, published_at, language) VALUES (:video_id,:query_id,:channel_id,:title,:published_at,:language)
    ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), title = VALUES(title), published_at = VALUES(published_at), language = VALUES(language)");
$insertStatsStmt = $pdo->prepare("INSERT INTO video_stats_daily (video_id, stat_date, view_count, like_count, comment_count) VALUES (:video_id,:stat_date,:view_count,:like_count,:comment_count)
    ON DUPLICATE KEY UPDATE view_count = VALUES(view_count), like_count = VALUES(like_count), comment_count = VALUES(comment_count)");

$totalVideos = 0;

foreach ($queries as $q) {
    $queryId = (int)$q['id'];
    $term    = $q['term'];

    // 1. Suche nach neuen Videos zum Suchbegriff
    $searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=25&type=video&order=date&q=' . urlencode($term) . '&key=' . urlencode(YT_API_KEY);
    $searchResult = fetch_json($searchUrl);
    if (!isset($searchResult['items'])) {
        fwrite(STDERR, "Fehler bei der Suche für '$term'.\n");
        continue;
    }
    // Video-IDs sammeln
    $videoIds = [];
    foreach ($searchResult['items'] as $item) {
        if (isset($item['id']['videoId'])) {
            $videoIds[] = $item['id']['videoId'];
        }
    }
    $videoIds = array_values(array_unique($videoIds));
    if (empty($videoIds)) continue;

    // 2. Details & Statistiken abrufen
    $batchSize = 50;
    for ($i = 0; $i < count($videoIds); $i += $batchSize) {
        $batch = array_slice($videoIds, $i, $batchSize);
        $videosUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=' . implode(',', $batch) . '&key=' . urlencode(YT_API_KEY);
        $videosResult = fetch_json($videosUrl);
        if (!isset($videosResult['items'])) continue;
        foreach ($videosResult['items'] as $v) {
            $vid = $v['id'] ?? null;
            $snippet = $v['snippet'] ?? [];
            $statistics = $v['statistics'] ?? [];
            if (!$vid) continue;
            // Felder extrahieren
            $channelId   = $snippet['channelId'] ?? '';
            $title       = mb_substr($snippet['title'] ?? '', 0, 255);
            $publishedAt = isset($snippet['publishedAt']) ? date('Y-m-d H:i:s', strtotime($snippet['publishedAt'])) : null;
            $language    = $snippet['defaultAudioLanguage'] ?? ($snippet['defaultLanguage'] ?? null);
            $viewCount   = isset($statistics['viewCount'])   ? (int)$statistics['viewCount']   : null;
            $likeCount   = isset($statistics['likeCount'])   ? (int)$statistics['likeCount']   : null;
            $commentCount= isset($statistics['commentCount'])? (int)$statistics['commentCount']: null;

            // In DB eintragen
            $insertVideoStmt->execute([
                ':video_id'    => $vid,
                ':query_id'    => $queryId,
                ':channel_id'  => $channelId,
                ':title'       => $title,
                ':published_at'=> $publishedAt,
                ':language'    => $language,
            ]);
            $insertStatsStmt->execute([
                ':video_id'      => $vid,
                ':stat_date'     => $today,
                ':view_count'    => $viewCount,
                ':like_count'    => $likeCount,
                ':comment_count' => $commentCount,
            ]);
            $totalVideos++;
        }
    }
    fwrite(STDOUT, "Aktualisiert: $term → " . count($videoIds) . " Videos\n");
}

fwrite(STDOUT, "Fertig. Insgesamt aktualisiert: $totalVideos Videos\n");
