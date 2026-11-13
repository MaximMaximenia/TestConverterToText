<?php
/* Прокси для отправки заявок в Telegram.
   Фронтенд шлёт сюда POST с JSON, токен бота и chat_id здесь, на сервере,
   в браузер они никогда не попадают.

   Каждая заявка (и каждая неудачная попытка) пишется в leads.log рядом —
   это запасной канал на случай, если Telegram молчит и об этом никто
   не узнаёт неделю, как уже было один раз. */

header('Content-Type: application/json; charset=utf-8');

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function logLead($entry) {
    $line = date('Y-m-d H:i:s') . ' ' . json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
    @file_put_contents(__DIR__ . '/leads.log', $line, FILE_APPEND | LOCK_EX);
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
$contact = isset($input['username']) ? trim((string) $input['username']) : '';
$webinarDate = isset($input['webinarDate']) ? trim((string) $input['webinarDate']) : '';
$honeypot = isset($input['company']) ? trim((string) $input['company']) : '';
$utm = isset($input['utm']) && is_array($input['utm']) ? $input['utm'] : [];

/* честная серверная валидация — фронтенд тоже проверяет, но доверять
   только фронтенду нельзя, запрос можно отправить напрямую мимо формы. */
$contactOk = (bool) preg_match('/^@?[A-Za-z0-9_]{5,32}$/', $contact);
$nameOk = $name !== '' && mb_strlen($name) <= 100;

if ($honeypot !== '') {
    /* похоже на бота — делаем вид, что всё хорошо, но в Telegram ничего
       не шлём, чтобы не спамить и не выдавать ботам, что их спалили */
    logLead(['status' => 'honeypot', 'name' => $name, 'contact' => $contact]);
    respond(['ok' => true, 'token' => bin2hex(random_bytes(16))]);
}

if (!$nameOk || !$contactOk) {
    logLead(['status' => 'validation_failed', 'name' => $name, 'contact' => $contact]);
    respond(['ok' => false, 'error' => 'validation_failed'], 422);
}

if ($contact[0] !== '@') {
    $contact = '@' . $contact;
}

$config = require __DIR__ . '/config.php';
$botToken = $config['telegram_bot_token'];
$chatId = $config['telegram_chat_id'];
$notifyEmail = isset($config['notify_email']) ? trim((string) $config['notify_email']) : '';

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
    "Telegram: " . $contact . "\n" .
    "Дата вебинара: " . ($webinarDate !== '' ? $webinarDate : 'не указана') .
    $utmLines;

$tgOk = false;
$tgError = '';
if ($botToken && $chatId && strpos($botToken, 'ВПИШИ') === false) {
    $ch = curl_init('https://api.telegram.org/bot' . $botToken . '/sendMessage');
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
        if (!$tgOk) $tgError = 'telegram_api_error: ' . $response;
    } else {
        $tgError = 'curl_error: ' . $curlError . ' http_code: ' . $httpCode;
    }
} else {
    $tgError = 'bot_token_not_configured';
}

/* запасной канал — письмо на почту, независимо от того, дошло ли
   сообщение в Telegram. Так заявка не теряется молча, даже если бот
   сломан, а ошибку никто не заметил вовремя. */
$mailOk = false;
if ($notifyEmail && strpos($notifyEmail, 'ВПИШИ') === false) {
    $subject = ($tgOk ? '' : '[ТЕЛЕГРАМ НЕ ДОШЁЛ] ') . 'Новая заявка на вебинар';
    $body = $text . ($tgOk ? '' : "\n\n(Внимание: в Telegram это сообщение НЕ доставлено: " . $tgError . ")");
    $headers = 'Content-Type: text/plain; charset=UTF-8';
    $mailOk = @mail($notifyEmail, $subject, $body, $headers);
}

logLead([
    'status' => $tgOk ? 'ok' : ($mailOk ? 'telegram_failed_email_ok' : 'failed'),
    'name' => $name,
    'contact' => $contact,
    'utm' => $utm,
    'error' => $tgOk ? null : $tgError,
]);

if (!$tgOk && !$mailOk) {
    /* ни телеграм, ни почта не доставили — честно говорим об ошибке,
       а не делаем вид, что всё хорошо */
    respond(['ok' => false, 'error' => 'server_not_configured'], 500);
}

respond(['ok' => true, 'token' => bin2hex(random_bytes(16))]);
