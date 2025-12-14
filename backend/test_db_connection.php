<?php
// backend/test_db_connection.php
// A script to discover the schema of the user's tables.

echo "Attempting to connect to the database...\n";

$envPath = __DIR__ . '/.env';
if (!file_exists($envPath)) {
    die("❌ Error! '.env' file not found in the 'backend' directory.\n");
}

$envLines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$envVars = [];
foreach ($envLines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    if (strpos($line, '=') !== false) {
        list($key, $val) = explode('=', $line, 2);
        $envVars[trim($key)] = trim($val);
    }
}

$DB_HOST = $envVars['DB_HOST'] ?? '127.0.0.1';
$DB_NAME = $envVars['DB_NAME'] ?? 'map';
$DB_USER = $envVars['DB_USER'] ?? 'root';
$DB_PASS = $envVars['DB_PASS'] ?? '';

echo "Connecting with Host: $DB_HOST, Database: $DB_NAME, User: $DB_USER\n\n";

try {
    $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4", $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "✅ Success! Database connection established.\n\n";

    function describeTable($pdo, $tableName) {
        echo "--- Describing table: $tableName ---\n";
        try {
            $stmt = $pdo->query("DESCRIBE `$tableName`");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if ($columns) {
                print_r($columns);
            } else {
                echo "Could not retrieve schema for table '$tableName'.\n";
            }
        } catch (PDOException $e) {
            echo "❌ Error describing table '$tableName': " . $e->getMessage() . "\n";
        }
        echo "\n";
    }

    describeTable($pdo, 'oddil');
    describeTable($pdo, 'vysledky');

} catch (PDOException $e) {
    echo "❌ Error! Database connection failed: " . $e->getMessage() . "\n";
}

