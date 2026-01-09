<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// Parameter einlesen
$qa    = isset($_GET['query_id_a']) ? (int) $_GET['query_id_a'] : 0;
$qb    = isset($_GET['query_id_b']) ? (int) $_GET['query_id_b'] : 0;
$metric= isset($_GET['metric']) ? $_GET['metric'] : 'view_count';
$days  = isset($_GET['days']) && in_array((int) $_GET['days'], [7,14,30]) ? (int) $_GET['days'] : 30;

// Erlaubte Metriken
$validMetrics = ['view_count', 'like_count', 'comment_count'];
if (!in_array($metric, $validMetrics)) {
    $metric = 'view_count';
}

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $sql = "
        SELECT s.stat_date AS d, SUM(s." . $metric . ") AS val
        FROM video_stats_daily s
        JOIN videos v ON v.video_id = s.video_id
        WHERE v.query_id = :qid
          AND s.stat_date >= CURDATE() - INTERVAL :d DAY
        GROUP BY s.stat_date
        ORDER BY s.stat_date
    ";

    $stmt = $pdo->prepare($sql);
    // Funktion zum Abrufen der Daten für eine Query
    $fetchSeries = function($queryId) use ($stmt, $days) {
        $stmt->bindValue(':qid', $queryId, PDO::PARAM_INT);
        $stmt->bindValue(':d', $days, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    };

    $resultA = $fetchSeries($qa);
    $resultB = $fetchSeries($qb);

    echo json_encode(['a' => $resultA, 'b' => $resultB]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Datenbankfehler']);
}