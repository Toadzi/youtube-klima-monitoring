<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
try {
    $pdo = new PDO(DB_DSN, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    // Alle aktiven Suchbegriffe abrufen
    $stmt = $pdo->query('SELECT id, term FROM queries ORDER BY term');
    $queries = $stmt->fetchAll();
    echo json_encode($queries);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Datenbankfehler']);
}