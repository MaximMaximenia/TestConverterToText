<?php
/* Прокси для отправки заявок в Telegram.
   Фронтенд шлёт сюда POST с JSON, токен бота и chat_id здесь, на сервере,
   в браузер они никогда не попадают. */

header('Content-Type: application/json; charset=utf-8');

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'method_not_allowed'], 405);
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    respond(['ok' => false, 'error' => 'bad_request'], 400);
}

$name = isset($input['name']) ? trim((string) $input['name']) : '';
$username = isset($input['username']) ? trim((string) $input['username']) : '';
$webinarDate = isset($input['webinarDate']) ? trim((string) $input['webinarDate']) : '';
$honeypot = isset($input['company']) ? trim((string) $input['company']) : '';
$utm = isset($input['utm']) && is_array($input['utm']) ? $input['utm'] : [];

/* честная серверная валидация — фронтенд тоже проверяет, но доверять
   только фронтенду нельзя, запрос можно отправить напрямую мимо формы */
$usernameOk = (bool) preg_match('/^@?[A-Za-z0-9_]{5,32}$/', $username);
$nameOk = $name !== '' && mb_strlen($name) <= 100;

if ($honeypot !== '') {
    /* похоже на бота — делаем вид, что всё хорошо, но в Telegram ничего
       не шлём, чтобы не спамить и не выдавать ботам, что их спалили */
    respond(['ok' => true, 'token' => bin2hex(random_bytes(16))]);
}

if (!$nameOk || !$usernameOk) {
    respond(['ok' => false, 'error' => 'validation_failed'], 422);
}

if ($username[0] !== '@') {
    $username = '@' . $username;
}

$config = require __DIR__ . '/config.php';
$botToken = $config['telegram_bot_token'];
$chatId = $config['telegram_chat_id'];

if (!$botToken || !$chatId || strpos($botToken, 'ВПИШИ') !== false) {
    respond(['ok' => false, 'error' => 'server_not_configured'], 500);
}

$utmLines = '';
$utmKeys = ['utm_source' => 'source', 'utm_medium' => 'medium', 'utm_campaign' => 'campaign', 'utm_content' => 'content', 'utm_term' => 'term'];
$utmHasAny = false;
foreach ($utmKeys as $key => $label) {
    if (!empty($utm[$key])) {
        $utmHasAny = true;
    }
}
if ($utmHasAny) {
    $utmLines = "\n\nUTM-метки:\n";
    foreach ($utmKeys as $key => $label) {
        if (!empty($utm[$key])) {
            $utmLines .= $label . ': ' . $utm[$key] . "\n";
        }
    }
}

$text = "🎯 Новая заявка на вебинар!\n" .
    "Имя: " . $name . "\n" .
    "Telegram: " . $username . "\n" .
    "Дата вебинара: " . ($webinarDate !== '' ? $webinarDate : 'не указана') .
    $utmLines;

$tgUrl = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
$ch = curl_init($tgUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query([
        'chat_id' => $chatId,
        'text' => $text,
    ]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$tgOk = $response !== false && $httpCode >= 200 && $httpCode < 300;
if ($tgOk) {
    $decoded = json_decode($response, true);
    $tgOk = is_array($decoded) && !empty($decoded['ok']);
}

if (!$tgOk) {
    respond(['ok' => false, 'error' => 'telegram_unreachable'], 502);
}

respond(['ok' => true, 'token' => bin2hex(random_bytes(16))]);
