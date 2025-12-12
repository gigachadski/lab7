<?php
date_default_timezone_set('Europe/Kyiv');
$file = 'logs.json';
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);

    if ($input) {
        $t = microtime(true);
        $micro = sprintf("%06d", ($t - floor($t)) * 1000000);
        $d = new DateTime(date('Y-m-d H:i:s.'.$micro, $t));
        $input['server_time'] = $d->format("Y-m-d H:i:s.u");

        $currentData = [];
        if (file_exists($file)) {
            $fileContent = file_get_contents($file);
            $decoded = json_decode($fileContent, true);
            if (is_array($decoded)) {
                $currentData = $decoded;
            }
        }
        
        $currentData[] = $input;
        file_put_contents($file, json_encode($currentData, JSON_PRETTY_PRINT), LOCK_EX);
        
        echo json_encode([
            'status' => 'saved', 
            'id' => $input['id'],
            'server_time' => $input['server_time']
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    }
    exit;
}
if (isset($_GET['action']) && $_GET['action'] === 'clear') {
    file_put_contents($file, '[]');
    echo json_encode(['status' => 'cleared']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo json_encode([]);
    }
    exit;
}

?>
