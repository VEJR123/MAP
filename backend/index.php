<?php
// backend/index.php

// 1. DŮLEŽITÉ: CORS Hlavičky (Bez tohoto to Frontend zablokuje)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Pokud se prohlížeč jen ptá (Preflight request), ukončíme to hned
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Nastavení výpisu chyb (pro ladění)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$uri = $_SERVER['REQUEST_URI'];

// Odstranění query stringu (např. ?id=1) pro potřeby routování
if (false !== $pos = strpos($uri, '?')) {
    $uri = substr($uri, 0, $pos);
}
$uri = rawurldecode($uri);

// 3. Routování (Směrování)
// Pokud adresa začíná na /api/swimmers, pošli to do správného skriptu
if (preg_match('/^\/api\/swimmers(\/.*)?$/', $uri)) {
    // POZOR: Cesta musí vést do složky public/api
    require __DIR__ . '/public/api/swimmers.php';
    exit;
}

// Hlavní stránka (jen pro kontrolu, že Railway běží)
if ($uri === '/' || $uri === '/index.php') {
    echo json_encode(['message' => 'Backend Swimming App běží! 🚀']);
    exit;
}

// 4. Fallback (Pokud nic nenajde)
http_response_code(404);
echo json_encode(['error' => 'Not Found', 'uri' => $uri]);
?>