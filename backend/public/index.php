<?php

// backend/public/index.php - Simple router V2

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

$uri = $_SERVER['REQUEST_URI'];

// Remove query string from URI
if (false !== $pos = strpos($uri, '?')) {
    $uri = substr($uri, 0, $pos);
}
$uri = rawurldecode($uri);

// Route requests for /api/swimmers... to the swimmers.php script
if (preg_match('/^\/api\/swimmers(\/.*)?$/', $uri)) {
    require __DIR__ . '/api/swimmers.php';
    exit;
}

// Fallback for any other requests
http_response_code(404);
echo json_encode(['error' => 'Not Found']);
