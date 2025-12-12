<?php
// Встановлюємо часовий пояс (важливо для коректного порівняння часу у звіті)
date_default_timezone_set('Europe/Kyiv');

// Назва файлу, де будуть зберігатися логи
$file = 'logs.json';

// Заголовки для правильної роботи з JSON та дозволу запитів
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// =======================================================================
// 1. ОБРОБКА POST-ЗАПИТУ (Збереження події - Спосіб 1)
// =======================================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Отримуємо "сирі" дані з тіла запиту
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true);
    
    // Якщо дані коректні
    if ($input) {
        // --- ФІКСАЦІЯ СЕРВЕРНОГО ЧАСУ ---
        // Використовуємо microtime(true) для отримання часу з мілісекундами
        $t = microtime(true);
        $micro = sprintf("%06d", ($t - floor($t)) * 1000000);
        $d = new DateTime(date('Y-m-d H:i:s.'.$micro, $t));
        
        // Додаємо час до масиву даних. Формат: Y-m-d H:i:s.u (напр. 2023-10-25 14:30:05.123456)
        $input['server_time'] = $d->format("Y-m-d H:i:s.u");

        // --- РОБОТА З ФАЙЛОМ ---
        // Читаємо існуючі дані, щоб не перезаписати, а додати
        $currentData = [];
        if (file_exists($file)) {
            $fileContent = file_get_contents($file);
            $decoded = json_decode($fileContent, true);
            if (is_array($decoded)) {
                $currentData = $decoded;
            }
        }
        
        // Додаємо нову подію в кінець масиву
        $currentData[] = $input;
        
        // Зберігаємо оновлений масив у файл (JSON_PRETTY_PRINT робить файл читабельним)
        // LOCK_EX блокує файл на момент запису, щоб уникнути конфліктів при швидких запитах
        file_put_contents($file, json_encode($currentData, JSON_PRETTY_PRINT), LOCK_EX);
        
        // Відправляємо відповідь клієнту (JS)
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

// =======================================================================
// 2. ОЧИЩЕННЯ ЛОГІВ (Викликається при натисканні Play)
// =======================================================================
if (isset($_GET['action']) && $_GET['action'] === 'clear') {
    // Перезаписуємо файл пустим масивом
    file_put_contents($file, '[]');
    echo json_encode(['status' => 'cleared']);
    exit;
}

// =======================================================================
// 3. ОБРОБКА GET-ЗАПИТУ (Читання логів для звіту)
// =======================================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($file)) {
        // Просто читаємо файл і віддаємо його вміст
        echo file_get_contents($file);
    } else {
        // Якщо файлу ще немає, віддаємо пустий масив
        echo json_encode([]);
    }
    exit;
}
?>