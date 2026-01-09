<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// Query-Parameter verarbeiten
$queryId = isset($_GET['query_id']) ? (int) $_GET['query_id'] : 0;
$days    = isset($_GET['days']) && in_array((int) $_GET['days'], [7, 14, 30]) ? (int) $_GET['days'] : 30;

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Für jeden Videoeintrag den aktuellsten Snap innerhalb des Zeitfensters auswählen
    $sql = "
        SELECT v.video_id, v.title, v.published_at, v.language,
               s.view_count, s.like_count, s.comment_count
        FROM videos v
        JOIN video_stats_daily s ON s.video_id = v.video_id
        WHERE v.query_id = :qid
          AND s.stat_date = (
              SELECT MAX(stat_date)
              FROM video_stats_daily s2
              WHERE s2.video_id = v.video_id
                AND s2.stat_date >= CURDATE() - INTERVAL :d DAY
          )
        ORDER BY s.view_count DESC
        LIMIT 200
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':qid', $queryId, PDO::PARAM_INT);
    $stmt->bindValue(':d', $days, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();
    echo json_encode($rows);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Datenbankfehler']);
}