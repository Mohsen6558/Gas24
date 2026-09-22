<?php
// ========================================================================
// درگاه API گاز۲۴: درخواست را بر اساس ساب‌دامین به سرور استان می‌فرستد.
// پیکربندی (استان‌ها، اکشن‌های مجاز، CORS، محدودیت نرخ) در config.php است.
// ========================================================================
define('GAS24_GATEWAY', true);
$config = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// پاسخ خطا در قالبی که اپ می‌فهمد (msg/message و success/Status)
function respondError(int $status, string $message, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(
        ['success' => false, 'Status' => false, 'message' => $message, 'msg' => $message] + $extra,
        JSON_UNESCAPED_UNICODE
    );
    exit();
}

// ثبت لاگ در stderr داکر. بدنه و توکن فقط در حالت GAS24_DEBUG و با پوشاندن فیلدهای حساس.
function dockerLog(string $message, array $data = []): void
{
    $log = '[GAS24-GATEWAY] ' . $message;
    if ($data) {
        $log .= ' ' . json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    file_put_contents('php://stderr', $log . PHP_EOL);
}

function redact($value)
{
    if (!is_array($value)) {
        return $value;
    }
    foreach ($value as $key => $item) {
        if (is_string($key) && preg_match('/token|otp|captcha|code|pass|mob|phone|national|card|auth/i', $key)) {
            $value[$key] = '***';
        } else {
            $value[$key] = redact($item);
        }
    }
    return $value;
}

function debugBody(string $raw)
{
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? redact($decoded) : '[' . strlen($raw) . ' bytes]';
}

function isPrivateIp(string $ip): bool
{
    return filter_var($ip, FILTER_VALIDATE_IP) !== false
        && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
}

// IP واقعی کاربر. هدرهای X-Forwarded-For/X-Real-IP فقط وقتی پذیرفته می‌شوند
// که درخواست از پراکسی داخلی (IP خصوصی) آمده باشد.
function clientIp(): string
{
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!isPrivateIp($remote)) {
        return $remote;
    }
    $forwarded = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
    $last = end($forwarded);
    if ($last !== false && filter_var($last, FILTER_VALIDATE_IP)) {
        return $last;
    }
    $realIp = trim($_SERVER['HTTP_X_REAL_IP'] ?? '');
    return filter_var($realIp, FILTER_VALIDATE_IP) ? $realIp : $remote;
}

// شمارنده پنجره ثابت روی فایل. اگر ذخیره‌سازی در دسترس نباشد درخواست رد نمی‌شود.
// خروجی: 0 یعنی مجاز، در غیر این صورت چند ثانیه تا باز شدن پنجره.
function rateLimitRetryAfter(string $bucket, int $limit, int $window): int
{
    $dir = sys_get_temp_dir() . '/gas24-ratelimit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return 0;
    }
    if (mt_rand(1, 200) === 1) {
        foreach (glob($dir . '/*') ?: [] as $old) {
            if (@filemtime($old) < time() - 86400) {
                @unlink($old);
            }
        }
    }
    $handle = @fopen($dir . '/' . sha1($bucket), 'c+');
    if (!$handle) {
        return 0;
    }
    flock($handle, LOCK_EX);
    $now = time();
    [$start, $count] = array_map('intval', explode(' ', trim(stream_get_contents($handle)) ?: '0 0') + [0, 0]);
    if ($now - $start >= $window) {
        $start = $now;
        $count = 0;
    }
    $count++;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, $start . ' ' . $count);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $count > $limit ? max(1, $start + $window - $now) : 0;
}

// ========================================================================
// ۱. CORS
// ========================================================================
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originAllowed = false;
foreach ($config['allowed_origin_patterns'] as $pattern) {
    if ($origin !== '' && preg_match($pattern, $origin)) {
        $originAllowed = true;
        break;
    }
}
header('Vary: Origin');
if ($originAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: ' . implode(', ', $config['methods']) . ', OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
    header('Access-Control-Max-Age: 600');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code($originAllowed ? 204 : 403);
    exit();
}
if ($origin !== '' && !$originAllowed) {
    respondError(403, 'دسترسی از این دامنه مجاز نیست.');
}
if (!in_array($method, $config['methods'], true)) {
    header('Allow: ' . implode(', ', $config['methods']) . ', OPTIONS');
    respondError(405, 'متد درخواست مجاز نیست.');
}

// ========================================================================
// ۲. تشخیص استان از ساب‌دامین
// ========================================================================
$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$domainParts = explode('.', $host);
$subdomain = count($domainParts) >= 3 ? $domainParts[0] : '';
$subdomain = $config['aliases'][$subdomain] ?? $subdomain;

if ($subdomain === '' || $subdomain === 'www') {
    respondError(400, 'نام استان در ساب‌دامین مشخص نشده است.');
}
if (!isset($config['provinces'][$subdomain])) {
    respondError(404, 'استان درخواست‌شده در سامانه تعریف نشده است.');
}
$province = $config['provinces'][$subdomain];
if (empty($province['upstream'])) {
    respondError(503, "سامانه استان {$province['name']} هنوز به گاز۲۴ متصل نشده است.");
}

// ========================================================================
// ۳. اعتبارسنجی اکشن (فقط اکشن‌های مجاز)
// ========================================================================
$endpointPath = $_SERVER['PATH_INFO'] ?? '';
if ($endpointPath === '') {
    // وقتی PATH_INFO ست نشده (مثلاً پیکربندی متفاوت وب‌سرور)
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
    if (preg_match('#^/api(?:/index\.php)?(/.*)$#', $uriPath, $m)) {
        $endpointPath = $m[1];
    }
}

$prefix = $config['action_prefix'];
$action = strncmp($endpointPath, $prefix, strlen($prefix)) === 0 ? substr($endpointPath, strlen($prefix)) : '';
if (!in_array($action, $config['actions'], true)) {
    respondError(404, 'اکشن درخواست‌شده معتبر نیست.');
}

$targetUrl = rtrim($province['upstream'], '/') . '/index.php' . $prefix . $action;
if (!empty($_SERVER['QUERY_STRING'])) {
    $targetUrl .= '?' . $_SERVER['QUERY_STRING'];
}

// ========================================================================
// ۴. محدودیت نرخ
// ========================================================================
$rawBody = $method === 'POST' ? file_get_contents('php://input') : '';
$ip = clientIp();
$limits = $config['rate_limits'][$action] ?? [];
$retryAfter = 0;
if (isset($limits['per_ip'])) {
    $retryAfter = max($retryAfter, rateLimitRetryAfter("ip|$action|$ip", ...$limits['per_ip']));
}
if (isset($limits['per_mobile'])) {
    $mobile = json_decode($rawBody, true)['mobNo'] ?? '';
    $mobile = is_scalar($mobile) ? preg_replace('/\D+/', '', (string) $mobile) : '';
    if ($mobile !== '') {
        $retryAfter = max($retryAfter, rateLimitRetryAfter("mobile|$action|$mobile", ...$limits['per_mobile']));
    }
}
if ($retryAfter > 0) {
    header('Retry-After: ' . $retryAfter);
    dockerLog('RATE LIMITED', ['province' => $subdomain, 'action' => $action, 'ip' => $ip]);
    respondError(429, 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره تلاش کنید.');
}

// ========================================================================
// ۵. هدرهای ارسالی (فقط Authorization و Content-Type از کلاینت)
// ========================================================================
$forwardHeaders = ['X-Forwarded-For: ' . $ip];
$authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
if ($authorization !== '') {
    $forwardHeaders[] = 'Authorization: ' . $authorization;
}
$forwardHeaders[] = 'Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'application/json');

$debug = getenv('GAS24_DEBUG') === '1';
if ($debug) {
    dockerLog('REQUEST', ['province' => $subdomain, 'action' => $action, 'body' => debugBody($rawBody)]);
}

// ========================================================================
// ۶. ارسال به سرور استان
// ========================================================================
$upstreamContentType = '';
$verifyTls = $province['verify_tls'] ?? true;
$ch = curl_init($targetUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => $forwardHeaders,
    CURLOPT_CONNECTTIMEOUT => $config['connect_timeout'],
    CURLOPT_TIMEOUT        => $config['timeout'],
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => $verifyTls,
    CURLOPT_SSL_VERIFYHOST => $verifyTls ? 2 : 0,
    CURLOPT_HEADERFUNCTION => function ($curl, $line) use (&$upstreamContentType) {
        if (stripos($line, 'Content-Type:') === 0) {
            $upstreamContentType = trim(substr($line, 13));
        }
        return strlen($line);
    },
]);
if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $rawBody);
} else {
    curl_setopt($ch, CURLOPT_HTTPGET, true);
}

$startedAt = microtime(true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);
$logContext = [
    'province' => $subdomain,
    'action'   => $action,
    'method'   => $method,
    'ip'       => $ip,
    'ms'       => (int) round((microtime(true) - $startedAt) * 1000),
];

// ========================================================================
// ۷. بازگرداندن نتیجه
// ========================================================================
if ($response === false || $httpCode === 0) {
    // جزئیات خطا (آدرس و IP داخلی) فقط در لاگ می‌ماند و به کاربر داده نمی‌شود.
    dockerLog('UPSTREAM ERROR', $logContext + ['error' => $curlError]);
    respondError(502, "ارتباط با سرور استان {$province['name']} برقرار نشد. لطفاً دوباره تلاش کنید.");
}

dockerLog('OK', $logContext + ['status' => $httpCode]);
if ($debug) {
    dockerLog('RESPONSE', ['action' => $action, 'body' => debugBody($response)]);
}

if ($upstreamContentType !== '' && preg_match('#^(application/json|text/)#i', $upstreamContentType)) {
    header('Content-Type: ' . $upstreamContentType);
}
http_response_code($httpCode);
echo $response;
