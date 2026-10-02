<?php
// ========================================================================
// پنل گزارش گاز۲۴ (صفحه src/report/): مسیر /api/index.php/report
// فقط از index.php بارگذاری می‌شود و از توابع آن (respondError، clientIp، ...) استفاده می‌کند.
//
// مرورگر هیچ‌وقت مستقیم به سامانه دفتر وصل نمی‌شود؛ این فایل با رمز X-Token از سرور هر استان
// گزارش می‌گیرد. رمز ورود صفحه و رمز دفتر در src/api/report.local.php است که در گیت نیست
// (نمونه: report.local.example.php).
//
// اگر دفتر استانی هنوز اکشن ws-optimize/report را ندارد (404)، آمار کلی از export-data
// (حالت summary) گرفته می‌شود و پاسخ mode=basic دارد.
// ========================================================================
if (!defined('GAS24_GATEWAY')) {
    http_response_code(404);
    exit();
}

header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$reportConfig = $config['report'];
$localFile = __DIR__ . '/report.local.php';
$secrets = is_file($localFile) ? require $localFile : [];
// مقدار فایل محلی؛ اگر خالی بود متغیر محیطی هم پذیرفته می‌شود
$secret = function (string $key, string $env) use ($secrets): string {
    $value = (string) ($secrets[$key] ?? '');
    return $value !== '' ? $value : (string) (getenv($env) ?: '');
};
$password = $secret('password', 'GAS24_REPORT_PASSWORD');
$defaultToken = $secret('daftar_token', 'GAS24_DAFTAR_TOKEN');

// درخواست باید از خود صفحه گزارش بیاید: هدر اختصاصی، بدون Origin غریبه
// (مرورگر برای هدر اختصاصی از دامنه دیگر preflight می‌فرستد که اینجا جوابی ندارد).
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (($_SERVER['HTTP_X_GAS24_REPORT'] ?? '') !== '1'
    || ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== $host)) {
    respondError(403, 'دسترسی مجاز نیست.');
}

$https = ($_SERVER['HTTPS'] ?? '') === 'on'
    || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
    || preg_match('/(^|\.)gas24\.ir$/', $host);
ini_set('session.use_strict_mode', '1');
session_name('GAS24REPORT');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/api/index.php/report',
    'secure'   => (bool) $https,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

// نشست با تغییر رمز روی سرور باطل می‌شود
$passwordTag = $password === '' ? '' : hash('sha256', 'gas24-report|' . $password);
$loggedIn = $password !== ''
    && hash_equals($passwordTag, (string) ($_SESSION['tag'] ?? ''))
    && (int) ($_SESSION['at'] ?? 0) > time() - $reportConfig['session_hours'] * 3600;

$op = (string) ($_GET['op'] ?? '');
$body = json_decode(file_get_contents('php://input') ?: '', true);
$body = is_array($body) ? $body : [];

function reportRespond(array $data): void
{
    echo json_encode(['success' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

// ------------------------------------------------------------------------
// ورود و خروج
// ------------------------------------------------------------------------
if ($op === 'session') {
    reportRespond(['loggedIn' => $loggedIn, 'configured' => $password !== '']);
}
if ($op === 'login') {
    if ($method !== 'POST') {
        respondError(405, 'متد درخواست مجاز نیست.');
    }
    if ($password === '') {
        respondError(503, 'رمز پنل گزارش روی سرور تنظیم نشده است (src/api/report.local.php).');
    }
    $ip = clientIp();
    [$limit, $window] = $reportConfig['login_limit'];
    $retryAfter = rateLimitRetryAfter("report-login|$ip", $limit, $window);
    if ($retryAfter > 0) {
        header('Retry-After: ' . $retryAfter);
        dockerLog('REPORT LOGIN LIMITED', ['ip' => $ip]);
        respondError(429, 'تعداد تلاش‌ها زیاد است. چند دقیقه دیگر دوباره امتحان کنید.');
    }
    $given = $body['password'] ?? '';
    if (!is_string($given) || !hash_equals($password, $given)) {
        dockerLog('REPORT LOGIN FAILED', ['ip' => $ip]);
        respondError(401, 'رمز وارد شده درست نیست.');
    }
    session_regenerate_id(true);
    $_SESSION['tag'] = $passwordTag;
    $_SESSION['at'] = time();
    dockerLog('REPORT LOGIN', ['ip' => $ip]);
    reportRespond(['loggedIn' => true]);
}
if ($op === 'logout') {
    $_SESSION = [];
    session_destroy();
    reportRespond(['loggedIn' => false]);
}
if (!$loggedIn) {
    respondError(401, 'برای دیدن گزارش ابتدا وارد شوید.', ['loginRequired' => true]);
}

// ------------------------------------------------------------------------
// ارتباط با دفتر استان‌ها
// ------------------------------------------------------------------------
function reportProvinces(array $config): array
{
    $list = [];
    foreach ($config['provinces'] as $key => $province) {
        $list[] = ['key' => $key, 'name' => $province['name'], 'connected' => !empty($province['upstream'])];
    }
    return $list;
}

// درخواست‌های هم‌زمان به دفتر: $requests = [کلید => [استان, اکشن, پارامترها]]
// خروجی برای هر کلید: ['status' => کد HTTP یا 0, 'data' => آرایه JSON یا null]
// پاسخ موفق برای مدت report.cache_ttl در پوشه موقت کش می‌شود. اگر دفتر استانی اکشن report را
// نداشت (404)، تا یک ساعت دوباره پرسیده نمی‌شود تا صفحه بی‌دلیل منتظر نماند.
function reportFetch(array $requests, array $config, array $secrets, string $defaultToken, bool $refresh): array
{
    $dir = sys_get_temp_dir() . '/gas24-report';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $results = [];
    $multi = curl_multi_init();
    $handles = [];
    foreach ($requests as $key => [$provinceKey, $action, $params]) {
        $province = $config['provinces'][$provinceKey];
        $url = rtrim($province['upstream'], '/') . '/index.php' . $config['action_prefix'] . $action
            . '?' . http_build_query($params);
        $cacheFile = $dir . '/' . sha1($provinceKey . '|' . $url) . '.json';
        $missingFile = $dir . '/missing-' . sha1($provinceKey . '|' . $action);
        if (!$refresh && is_file($missingFile) && filemtime($missingFile) > time() - 3600) {
            $results[$key] = ['status' => 404, 'data' => null, 'cached' => true];
            continue;
        }
        if (!$refresh && is_file($cacheFile) && filemtime($cacheFile) > time() - $config['report']['cache_ttl']) {
            $cached = json_decode((string) file_get_contents($cacheFile), true);
            if (is_array($cached)) {
                $results[$key] = $cached + ['cached' => true];
                continue;
            }
        }
        $token = (string) ($secrets['daftar_tokens'][$provinceKey] ?? $defaultToken);
        $verifyTls = $province['verify_tls'] ?? $config['verify_tls'] ?? true;
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['X-Token: ' . $token, 'Accept: application/json'],
            CURLOPT_CONNECTTIMEOUT => $config['connect_timeout'],
            CURLOPT_TIMEOUT        => $config['report']['timeout'],
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => $verifyTls,
            CURLOPT_SSL_VERIFYHOST => $verifyTls ? 2 : 0,
        ]);
        curl_multi_add_handle($multi, $ch);
        $handles[$key] = [$ch, $cacheFile, $missingFile, $provinceKey, $action];
    }
    do {
        $status = curl_multi_exec($multi, $running);
        if ($running) {
            curl_multi_select($multi, 1.0);
        }
    } while ($running && $status === CURLM_OK);
    foreach ($handles as $key => [$ch, $cacheFile, $missingFile, $provinceKey, $action]) {
        $raw = curl_multi_getcontent($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $ms = (int) round(curl_getinfo($ch, CURLINFO_TOTAL_TIME) * 1000);
        $error = curl_error($ch);
        curl_multi_remove_handle($multi, $ch);
        curl_close($ch);
        $data = json_decode((string) $raw, true);
        $result = ['status' => $code, 'data' => is_array($data) ? $data : null];
        dockerLog('REPORT', ['province' => $provinceKey, 'action' => $action, 'status' => $code, 'ms' => $ms]
            + ($error !== '' ? ['error' => $error] : []));
        if ($code === 200 && is_array($data) && ($data['success'] ?? false) === true) {
            @file_put_contents($cacheFile, json_encode($result, JSON_UNESCAPED_UNICODE), LOCK_EX);
            @unlink($missingFile);
        } elseif ($code === 404) {
            @touch($missingFile);
        }
        $results[$key] = $result + ['cached' => false];
    }
    curl_multi_close($multi);
    return $results;
}

// پیام فارسی برای پاسخ ناموفق دفتر
function reportError(array $result, string $name): string
{
    $message = $result['data']['message'] ?? '';
    switch ($result['status']) {
        case 0:
            return "ارتباط با سرور استان $name برقرار نشد.";
        case 401:
            return "رمز وب‌سرویس دفتر استان $name درست نیست (daftar_token در report.local.php).";
        case 403:
            return "سرور دفتر استان $name به IP سرور گاز۲۴ اجازه نمی‌دهد (OptimizeReportIPs).";
        case 404:
            return "سامانه دفتر استان $name وب‌سرویس گزارش ندارد.";
    }
    return $message !== '' ? "استان $name: $message" : "پاسخ نامعتبر از سرور استان $name (کد {$result['status']}).";
}

// آمار کلی از export-data برای استان‌هایی که هنوز اکشن report را ندارند
const REPORT_BASIC_TARGETS = ['keyno', 'tokens', 'rewards', 'karkard', 'hints', 'declarations'];

function reportBasic(array $provinceKeys, array $config, array $secrets, string $defaultToken, bool $refresh): array
{
    $requests = [];
    foreach ($provinceKeys as $provinceKey) {
        foreach (REPORT_BASIC_TARGETS as $target) {
            $requests["$provinceKey|$target"] = [$provinceKey, 'export-data', ['target' => $target, 'mode' => 'summary']];
        }
    }
    $fetched = reportFetch($requests, $config, $secrets, $defaultToken, $refresh);
    $out = [];
    foreach ($provinceKeys as $provinceKey) {
        $basic = [];
        $failure = null;
        $cached = true;
        foreach (REPORT_BASIC_TARGETS as $target) {
            $result = $fetched["$provinceKey|$target"];
            $cached = $cached && $result['cached'];
            if (($result['data']['success'] ?? false) !== true) {
                $failure = $failure ?? $result;
                continue;
            }
            $basic[$target] = [
                'total' => (int) ($result['data']['total_records'] ?? 0),
                'extra' => array_map('intval', (array) ($result['data']['extra_stats'] ?? [])),
            ];
        }
        $out[$provinceKey] = $basic
            ? ['ok' => true, 'basic' => $basic, 'cached' => $cached]
            : ['ok' => false, 'error' => reportError($failure, $config['provinces'][$provinceKey]['name'])];
    }
    return $out;
}

function reportFilters(): array
{
    $params = [];
    foreach (['from', 'to'] as $name) {
        $value = (string) ($_GET[$name] ?? '');
        if ($value !== '') {
            if (!preg_match('/^1[34]\d{2}-\d{2}-\d{2}$/', $value)) {
                respondError(400, 'تاریخ باید به شکل 1405-07-01 باشد.');
            }
            $params[$name] = $value;
        }
    }
    $cityId = (string) ($_GET['cityId'] ?? '');
    if ($cityId !== '') {
        if (!ctype_digit($cityId) || (int) $cityId > 255) {
            respondError(400, 'کد شهر معتبر نیست.');
        }
        $params['cityId'] = $cityId;
    }
    $interval = (string) ($_GET['interval'] ?? '');
    if (in_array($interval, ['day', 'month'], true)) {
        $params['interval'] = $interval;
    }
    return $params;
}

$refresh = ($_GET['refresh'] ?? '') === '1';

if ($op === 'provinces') {
    reportRespond(['provinces' => reportProvinces($config)]);
}

if ($op === 'report') {
    $provinceKey = (string) ($_GET['province'] ?? '');
    $province = $config['provinces'][$provinceKey] ?? null;
    if ($province === null) {
        respondError(404, 'استان درخواست‌شده در سامانه تعریف نشده است.');
    }
    if (empty($province['upstream'])) {
        respondError(503, "سامانه استان {$province['name']} هنوز به گاز۲۴ متصل نشده است.");
    }
    $params = reportFilters();
    $info = ['province' => ['key' => $provinceKey, 'name' => $province['name']]];
    $full = reportFetch(['full' => [$provinceKey, 'report', $params]], $config, $secrets, $defaultToken, $refresh)['full'];
    if (($full['data']['success'] ?? false) === true) {
        reportRespond($info + ['mode' => 'full', 'cached' => $full['cached'], 'data' => $full['data']]);
    }
    if ($full['status'] !== 404) {
        respondError(502, reportError($full, $province['name']));
    }
    $basic = reportBasic([$provinceKey], $config, $secrets, $defaultToken, $refresh)[$provinceKey];
    if (!$basic['ok']) {
        respondError(502, $basic['error']);
    }
    reportRespond($info + ['mode' => 'basic', 'cached' => $basic['cached'], 'data' => $basic['basic']]);
}

// جزئیات ردیف‌به‌ردیف (ws-optimize/report-detail دفتر): اشتراک‌ها، کارکردها، جوایز داده‌شده و فرم‌های ممیزی.
// export=1 همه ردیف‌ها را (حداکثر REPORT_DETAIL_EXPORT_MAX) برای خروجی CSV یک‌جا برمی‌گرداند.
const REPORT_DETAIL_KINDS = ['subscriptions', 'karkard', 'rewards', 'declarations'];
const REPORT_DETAIL_EXPORT_MAX = 10000;

function reportDetailProvince(array $config): array
{
    $provinceKey = (string) ($_GET['province'] ?? '');
    $province = $config['provinces'][$provinceKey] ?? null;
    if ($province === null) {
        respondError(404, 'استان درخواست‌شده در سامانه تعریف نشده است.');
    }
    if (empty($province['upstream'])) {
        respondError(503, "سامانه استان {$province['name']} هنوز به گاز۲۴ متصل نشده است.");
    }
    return [$provinceKey, $province];
}

function reportDetailError(array $result, string $name): string
{
    if ($result['status'] === 404) {
        return "سامانه دفتر استان $name هنوز جزئیات گزارش (ws-optimize/report-detail) را ندارد؛ دفتر این استان را به‌روز کنید.";
    }
    return reportError($result, $name);
}

if ($op === 'detail') {
    [$provinceKey, $province] = reportDetailProvince($config);
    $kind = (string) ($_GET['kind'] ?? '');
    if (!in_array($kind, REPORT_DETAIL_KINDS, true)) {
        respondError(400, 'نوع جزئیات معتبر نیست.');
    }
    $params = reportFilters();
    unset($params['interval']);
    $params['kind'] = $kind;
    $q = preg_replace('/\D+/', '', strtr((string) ($_GET['q'] ?? ''), ['۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9']));
    if ($q !== '') {
        $params['q'] = substr($q, 0, 15);
    }
    $export = ($_GET['export'] ?? '') === '1';
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $pageSize = $export ? 1000 : 50;
    $rows = [];
    $total = 0;
    $cached = true;
    do {
        $result = reportFetch(['d' => [$provinceKey, 'report-detail', $params + ['page' => $page, 'pageSize' => $pageSize]]],
            $config, $secrets, $defaultToken, $refresh)['d'];
        if (($result['data']['success'] ?? false) !== true) {
            respondError(502, reportDetailError($result, $province['name']));
        }
        $cached = $cached && $result['cached'];
        $total = (int) ($result['data']['total'] ?? 0);
        $rows = array_merge($rows, (array) ($result['data']['rows'] ?? []));
        $page++;
    } while ($export && count($rows) < min($total, REPORT_DETAIL_EXPORT_MAX) && !empty($result['data']['rows']));
    reportRespond([
        'province' => ['key' => $provinceKey, 'name' => $province['name']],
        'kind' => $kind,
        'total' => $total,
        'page' => $export ? 1 : (int) ($result['data']['page'] ?? 1),
        'pageSize' => $export ? count($rows) : $pageSize,
        'truncated' => $export && $total > count($rows),
        'cached' => $cached,
        'rows' => $rows,
    ]);
}

if ($op === 'detail-image') {
    [$provinceKey, $province] = reportDetailProvince($config);
    $id = (string) ($_GET['id'] ?? '');
    if (!ctype_digit($id)) {
        respondError(400, 'شناسه کارکرد معتبر نیست.');
    }
    $result = reportFetch(['i' => [$provinceKey, 'report-detail', ['kind' => 'karkard-image', 'id' => $id]]],
        $config, $secrets, $defaultToken, $refresh)['i'];
    $data = $result['data'] ?? [];
    if (($data['success'] ?? false) !== true) {
        respondError(($data['type'] ?? '') === 'notFound' ? 404 : 502, $data['message'] ?? reportDetailError($result, $province['name']));
    }
    $mime = in_array($data['mime'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true) ? $data['mime'] : 'image/jpeg';
    $binary = base64_decode((string) ($data['image'] ?? ''), true);
    if ($binary === false || $binary === '') {
        respondError(502, 'تصویر این کارکرد خوانده نشد.');
    }
    header('Content-Type: ' . $mime);
    header('Cache-Control: private, max-age=600');
    header('X-Content-Type-Options: nosniff');
    echo $binary;
    exit();
}

if ($op === 'compare') {
    $params = reportFilters();
    unset($params['cityId'], $params['interval']);
    $params['sections'] = 'overview,health';
    $requests = [];
    foreach ($config['provinces'] as $key => $province) {
        if (!empty($province['upstream'])) {
            $requests[$key] = [$key, 'report', $params];
        }
    }
    $full = reportFetch($requests, $config, $secrets, $defaultToken, $refresh);
    $needBasic = array_keys(array_filter($full, function ($result) {
        return $result['status'] === 404;
    }));
    $basic = $needBasic ? reportBasic($needBasic, $config, $secrets, $defaultToken, $refresh) : [];
    $rows = [];
    foreach ($config['provinces'] as $key => $province) {
        $row = ['key' => $key, 'name' => $province['name']];
        if (empty($province['upstream'])) {
            $rows[] = $row + ['mode' => 'none', 'error' => 'هنوز به گاز۲۴ متصل نشده است.'];
        } elseif (($full[$key]['data']['success'] ?? false) === true) {
            $rows[] = $row + ['mode' => 'full', 'overview' => $full[$key]['data']['overview'], 'health' => $full[$key]['data']['health']];
        } elseif (isset($basic[$key]) && $basic[$key]['ok']) {
            $rows[] = $row + ['mode' => 'basic', 'basic' => $basic[$key]['basic']];
        } else {
            $rows[] = $row + ['mode' => 'error', 'error' => $basic[$key]['error'] ?? reportError($full[$key], $province['name'])];
        }
    }
    reportRespond(['rows' => $rows]);
}

respondError(404, 'درخواست گزارش معتبر نیست.');
