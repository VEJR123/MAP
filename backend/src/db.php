<?php
// backend/src/db.php
// Simple PDO helper that reads DB_* env variables. Put real credentials in backend/.env and load them in your shell.

function env($key, $default = null) {
    $v = getenv($key);
    return $v === false ? $default : $v;
}

$DB_HOST = env('DB_HOST', '127.0.0.1');
$DB_NAME = env('DB_NAME', 'map');
$DB_USER = env('DB_USER', 'root');
$DB_PASS = env('DB_PASS', '');

$dsn = "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'DB connection failed', 'message' => $e->getMessage()]);
    exit;
}

return $pdo;
