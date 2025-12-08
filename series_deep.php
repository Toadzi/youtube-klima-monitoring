<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$queryId = isset($_GET['query_id']) ? (int) $_GET['query_id'] : 0;
$days    = isset($_GET['days']) && in_array((int) $_GET['days'], [7,14,30]) ? (int) $_GET['days'] : 30;

try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $sql = "
        SELECT s.stat_date AS d,
               SUM(s.view_count)    AS views,
               SUM(s.like_count)    AS likes,
               SUM(s.comment_count) AS comments
        FROM video_stats_daily s
        JOIN videos v ON v.video_id = s.video_id
        WHERE v.query_id = :qid
          AND s.stat_date >= CURDATE() - INTERVAL :d DAY
        GROUP BY s.stat_date
        ORDER BY s.stat_date
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