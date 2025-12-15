<?php
// backend/public/api/swimmers.php
// Basic REST endpoints for swimmers and their times.

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../../error.log');

// Ensure UTF-8 everywhere so diakritika (čárky, háčky) are preserved
ini_set('default_charset', 'UTF-8');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // adjust for production
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    // Load PDO connection (returns $pdo from src/db.php)
    $pdo = require __DIR__ . '/../../src/db.php';

    $method = $_SERVER['REQUEST_METHOD'];
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($uri, '/'));

    // expecting /api/swimmers or /api/swimmers/{id} or /api/swimmers/{id}/times/{timeId}
    if (!isset($parts[1]) || $parts[1] !== 'swimmers') {
        http_response_code(404);
        echo json_encode(['error' => 'Not found'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Helper to read input
    function getInput() {
        $body = file_get_contents('php://input');
        return $body ? json_decode($body, true) : [];
    }

    // Helper to convert array keys to camelCase
    function toCamelCase($data) {
        if (!is_array($data)) {
            return $data;
        }

        // If it's a list of items (numeric keys), apply recursively
        if (isset($data[0]) && is_array($data[0])) {
            return array_map('toCamelCase', $data);
        }

        // If it's an associative array (the item itself)
        $camelCaseArray = [];
        foreach ($data as $key => $value) {
            $newKey = lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
            if (is_array($value)) {
                // Recursively convert nested arrays
                $value = toCamelCase($value);
            }
            $camelCaseArray[$newKey] = $value;
        }
        return $camelCaseArray;
    }

    // Helper to convert array keys to snake_case
    function toSnakeCase($data) {
        if (!is_array($data)) {
            return $data;
        }

        $snakeCaseArray = [];
        foreach ($data as $key => $value) {
            $newKey = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key));
            if (is_array($value)) {
                $value = toSnakeCase($value);
            }
            $snakeCaseArray[$newKey] = $value;
        }
        return $snakeCaseArray;
    }

    function processSwimmerRow($row) {
        // Check if year of birth is in COL 6.
        // A year is considered valid if it's a number-like string and falls within a reasonable range.
        $year = is_numeric($row['COL 6']) ? (int)$row['COL 6'] : 0;
    
        if ($year >= 1920 && $year <= 2030) {
            // Data seems correct
            return [
                'id' => (int)$row['COL 1'],
                'first_name' => $row['COL 2'],
                'last_name' => $row['COL 3'],
                'new_last_name' => $row['COL 4'],
                'gender' => strtoupper(trim($row['COL 5'])),
                'year_of_birth' => $year,
            ];
        }
    
        // If not in COL 6, check if it's shifted and in COL 5.
        $shiftedYear = is_numeric($row['COL 5']) ? (int)$row['COL 5'] : 0;
        if ($shiftedYear >= 1920 && $shiftedYear <= 2030) {
            // Data is shifted.
            return [
                'id' => (int)$row['COL 1'],
                'first_name' => $row['COL 2'],
                'last_name' => $row['COL 3'],
                'new_last_name' => null, 
                'gender' => strtoupper(trim($row['COL 4'])),
                'year_of_birth' => $shiftedYear,
            ];
        }
        
        // If neither contains a valid year, return the original mapping but with a null year.
        return [
            'id' => (int)$row['COL 1'],
            'first_name' => $row['COL 2'],
            'last_name' => $row['COL 3'],
            'new_last_name' => $row['COL 4'],
            'gender' => strtoupper(trim($row['COL 5'])),
            'year_of_birth' => null,
        ];
    }

    // GET /api/swimmers
    if ($method === 'GET' && count($parts) === 2) {
        $since = isset($_GET['since']) ? (int)$_GET['since'] : null;
        
        $sql = '
            SELECT DISTINCT o.`COL 1`, o.`COL 2`, o.`COL 3`, o.`COL 4`, o.`COL 5`, o.`COL 6`
            FROM oddil o
            JOIN vysledky v ON o.`COL 1` = v.`COL 9`
            WHERE v.`COL 6` >= 2018
        ';

        if ($since) {
            // We apply the 'since' filter on the most likely column for the year
            $sql .= ' AND (o.`COL 6` >= :since OR o.`COL 5` >= :since)';
        }

        $stmt = $pdo->prepare($sql);

        if ($since) {
            $stmt->bindParam(':since', $since, PDO::PARAM_INT);
        }
        
        $stmt->execute();
        $rawSwimmers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $swimmers = array_map('processSwimmerRow', $rawSwimmers);

        echo json_encode(toCamelCase($swimmers), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // GET /api/swimmers/{id}
    if ($method === 'GET' && count($parts) === 3) {
        $rawId = $parts[2];
        $rawSwimmer = null;

        // If caller passed a numeric id, lookup directly. Otherwise treat as name and search oddil by name.
        if (ctype_digit($rawId)) {
            $stmt = $pdo->prepare('SELECT `COL 1`, `COL 2`, `COL 3`, `COL 4`, `COL 5`, `COL 6` FROM oddil WHERE `COL 1` = ?');
            $stmt->execute([$rawId]);
            $rawSwimmer = $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $nameQuery = urldecode($rawId);
            $q = '%' . $nameQuery . '%';
            $stmt = $pdo->prepare('SELECT `COL 1`, `COL 2`, `COL 3`, `COL 4`, `COL 5`, `COL 6` FROM oddil WHERE CONCAT(`COL 2`," ",`COL 3`) LIKE :q OR CONCAT(`COL 2`," ",`COL 4`) LIKE :q OR `COL 2` LIKE :q OR `COL 3` LIKE :q LIMIT 1');
            $stmt->bindParam(':q', $q);
            $stmt->execute();
            $rawSwimmer = $stmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$rawSwimmer) { http_response_code(404); echo json_encode(['error'=>'Not found'], JSON_UNESCAPED_UNICODE); exit; }

        $swimmer = processSwimmerRow($rawSwimmer);

        // Use the swimmer id (from oddil) to fetch results from vysledky
        $swimmerId = $swimmer['id'];

        // Try to load personal results from `vysledky` and compute fastest (min) time per discipline.
        // In vysledky table, swimmer ID is stored in COL 9
        try {
            $poolSize = isset($_GET['poolSize']) ? (int)$_GET['poolSize'] : 50;
            
            $sql = 'SELECT * FROM vysledky WHERE `COL 9` = :swimmerId AND `COL 6` >= 2018';
            $params = [':swimmerId' => $swimmerId];

            if ($poolSize) {
                $sql .= ' AND `COL 4` = :poolSize';
                $params[':poolSize'] = $poolSize;
            }

            $stmt2 = $pdo->prepare($sql);
            $stmt2->execute($params);

            $rawTimes = $stmt2->fetchAll();
            
            // Debug: log what we found
            error_log("Found " . count($rawTimes) . " rows in vysledky for swimmer ID: " . $swimmerId);
            if (count($rawTimes) > 0) {
                error_log("First row sample: " . json_encode($rawTimes[0], JSON_UNESCAPED_UNICODE));
            }

            // Normalization helper: lowercase, transliterate, strip non-alphanum for comparison
            $norm = function($s) {
                if ($s === null) return '';
                $s = mb_strtolower((string)$s, 'UTF-8');
                $s = preg_replace('/\s+/', ' ', $s);
                // transliterate accents if possible
                $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
                if ($t !== false) $s = $t;
                // keep only letters+numbers
                $s = preg_replace('/[^a-z0-9]/', '', $s);
                return $s;
            };

            // Candidate column names for event and time fields
            $eventCols = ['event','disciplina','discipline','udalost','nazev','nazev_zavodu'];
            $timeCols = ['personal_best_ms','personalbestms','cas_ms','time_ms','time','cas','vysledny_cas_ms'];
            $expectedCols = ['expected_time_ms','ocekavany_cas_ms','expectedms'];

            $bestPerEvent = [];

            foreach ($rawTimes as $r) {
                // Debug: log the row structure
                error_log("Processing row: " . json_encode(array_keys($r), JSON_UNESCAPED_UNICODE));
                
                // find event name in row - try named columns first, then COL 8 (disciplines are in COL 8)
                $eventName = null;
                foreach ($eventCols as $c) {
                    if (array_key_exists($c, $r) && $r[$c] !== null && $r[$c] !== '') { $eventName = $r[$c]; break; }
                }
                // Disciplines are in COL 8
                if (!$eventName && array_key_exists('COL 8', $r)) {
                    $val = $r['COL 8'];
                    if (is_string($val) && strlen(trim($val)) > 0) {
                        $eventName = trim($val);
                        error_log("Found event name in COL 8: {$eventName}");
                    }
                }
                // Fallback: try to find any string value that looks like an event
                if (!$eventName) {
                    foreach ($r as $k => $val) {
                        if (is_string($val) && strlen(trim($val)) > 0 && preg_match('/[0-9]+m|znak|prsa|motyl|volny|poloh/i', $val)) {
                            $eventName = trim($val);
                            error_log("Found event name in {$k}: {$eventName}");
                            break;
                        }
                    }
                }
                if (!$eventName) {
                    error_log("Skipping row - no event name found. Row keys: " . implode(', ', array_keys($r)));
                    continue;
                }

                // find numeric time columns - try named columns first, then COL 2 (times are in COL 2)
                $pb = null; $exp = null;
                foreach ($timeCols as $c) {
                    if (array_key_exists($c, $r) && is_numeric($r[$c])) { $pb = (int)$r[$c]; break; }
                }
                // Times are in COL 2: format is seconds with last 2 digits as centiseconds
                // Example: 12345 = 123.45 seconds = 123450 ms
                if ($pb === null && array_key_exists('COL 2', $r)) {
                    $val = $r['COL 2'];
                    if (is_numeric($val) && $val > 0) {
                        // Parse as integer: last 2 digits are centiseconds
                        $valInt = (int)$val;
                        // Extract seconds (all digits except last 2) and centiseconds (last 2 digits)
                        $centiseconds = $valInt % 100;
                        $seconds = ($valInt - $centiseconds) / 100;
                        // Convert to milliseconds
                        $pb = ($seconds * 1000) + ($centiseconds * 10);
                        error_log("Parsed time from COL 2: {$valInt} -> {$seconds}.{$centiseconds}s -> {$pb}ms");
                    }
                }
                
                foreach ($expectedCols as $c) {
                    if (array_key_exists($c, $r) && is_numeric($r[$c])) { $exp = (int)$r[$c]; break; }
                }

                $key = $norm($eventName);
                if (!isset($bestPerEvent[$key]) || ($pb !== null && $pb < ($bestPerEvent[$key]['personalBestMs'] ?? PHP_INT_MAX))) {
                    $bestPerEvent[$key] = [
                        'event' => $eventName,
                        'personalBestMs' => $pb,
                        'expectedTimeMs' => $exp,
                    ];
                }
            }

            // If we have any bests, convert to indexed array
            $times = [];
            foreach ($bestPerEvent as $b) {
                $times[] = $b;
            }

            // Debug: log parsed times
            error_log("Parsed " . count($times) . " best times for swimmer ID: " . $swimmerId);
            if (count($times) > 0) {
                error_log("Sample parsed time: " . json_encode($times[0], JSON_UNESCAPED_UNICODE));
            }

            // If no rows or no parsed times, return empty array
            $swimmer['times'] = $times;
        } catch (PDOException $e) {
            // Table might not exist or other DB error; return empty times but keep swimmer data
            $swimmer['times'] = [];
        }
        echo json_encode(toCamelCase($swimmer), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // PATCH /api/swimmers/{id}/times/{timeId}
    if ($method === 'PATCH' && count($parts) === 5 && $parts[3] === 'times') {
        http_response_code(501); // Not Implemented
        echo json_encode(['error' => 'Time management is not available. Table "vysledky" is missing.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // DELETE /api/swimmers/{id}/times/{timeId}
    if ($method === 'DELETE' && count($parts) === 5 && $parts[3] === 'times') {
        http_response_code(501); // Not Implemented
        echo json_encode(['error' => 'Time management is not available. Table "vysledky" is missing.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // POST /api/swimmers/{id}/times
    if ($method === 'POST' && count($parts) === 4 && $parts[3] === 'times') { // Corrected routing
        http_response_code(501); // Not Implemented
        echo json_encode(['error' => 'Time management is not available. Table "vysledky" is missing.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode(['error' => 'Bad request'], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    error_log('FATAL ERROR: ' . $e->getMessage());
    error_log($e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}