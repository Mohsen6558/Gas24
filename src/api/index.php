<?php
// ========================================================================
// ۱. تنظیمات اولیه و هدرها
// ========================================================================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 🌟 تابع کمکی برای ثبت لاگ در کنسول داکر (بدون کلمه private)
function dockerLog($message, $data = null) 
{
    $log = "[GAS24-GATEWAY] " . $message;
    if ($data !== null) {
        // اگر دیتا رشته است مستقیم چاپ کن، اگر آرایه است JSON کن
        $log .= " | Data: " . (is_string($data) ? $data : json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
    file_put_contents('php://stderr', $log . PHP_EOL);
}

// ========================================================================
// ۲. استخراج استان از HTTP_HOST
// ========================================================================
$host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '';
$domainParts = explode('.', $host);

$subdomain = count($domainParts) >= 3 ? strtolower($domainParts[0]) : '';

if (empty($subdomain) || $subdomain === 'www') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'نام استان در ساب‌دامین مشخص نشده است.'], JSON_UNESCAPED_UNICODE);
    exit();
}

// ========================================================================
// ۳. پیدا کردن سرور مقصد
// ========================================================================
$provincialServers = [
    'kerman'     => 'https://es.nigc-kerman.ir', 
    'esfahan'    => 'https://esfahan.gas.ir',
    'ardabil'    => 'http://192.168.4.14:8003', 
    'mazandaran' => 'https://mazandaran.gas.ir',
    'hamadan' => 'https://nigc-hm.artadata.ir',
    'skhorasan' => 'https://southkhorasan.artadata.ir',
    'nkhorasan' => 'https://es.nigc-nkgc.ir',
    'khuzestan' => 'https://portal.nigc-khgc.ir',
    'fars' => 'https://dpd.farsgas.ir',
    'sb' => 'https://e.nigc-sbgc.ir',
    'ilam' => 'https://ilam.artadata.ir',
    'testapi' => 'https:/pishkhan.artadata.ir',
];

if (!isset($provincialServers[$subdomain])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => "سرور استان '{$subdomain}' یافت نشد."], JSON_UNESCAPED_UNICODE);
    exit();
}

// ========================================================================
// ۴. استخراج مسیر اکشن و ساخت آدرس نهایی
// ========================================================================
$endpointPath = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';

if (empty($endpointPath)) {
    $uri = $_SERVER['REQUEST_URI'];
    if (strpos($uri, '/api/') !== false) {
        $parts = explode('/api/', $uri, 2);
        $endpointPath = '/' . ltrim(str_replace('index.php/', '', $parts[1]), '/');
    }
}

if (empty($endpointPath) || $endpointPath === '/') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'مسیر اکشن مشخص نشده است.'], JSON_UNESCAPED_UNICODE);
    exit();
}

$targetUrl = $provincialServers[$subdomain] . '/index.php' . $endpointPath;

// ========================================================================
// ۵. آماده‌سازی بدنه و هدرها
// ========================================================================
$rawBody = file_get_contents('php://input');
$method = $_SERVER['REQUEST_METHOD'];
$forwardHeaders = [];
$requestHeaders = function_exists('getallheaders') ? getallheaders() : [];

if (empty($requestHeaders)) {
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) == 'HTTP_') {
            $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $requestHeaders[$headerName] = $value;
        }
    }
    if (isset($_SERVER['CONTENT_TYPE'])) {
        $requestHeaders['Content-Type'] = $_SERVER['CONTENT_TYPE'];
    }
}

foreach ($requestHeaders as $key => $value) {
    $lowerKey = strtolower($key);
    if ($lowerKey === 'authorization' || $lowerKey === 'content-type') {
        $forwardHeaders[] = $key . ': ' . $value;
    }
}

if (empty(preg_grep('/^Content-Type:/i', $forwardHeaders))) {
    $forwardHeaders[] = 'Content-Type: application/json';
}

// 🌟 لاگ شماره ۱: ثبت درخواست دریافتی از کلاینت
dockerLog("📥 NEW REQUEST", [
    'Method'  => $method,
    'URI'     => $_SERVER['REQUEST_URI'],
    'Headers' => $forwardHeaders,
    'Body'    => json_decode($rawBody, true) ?: $rawBody // تلاش برای خوانا کردن JSON
]);

// ========================================================================
// ۶. ارسال درخواست با cURL
// ========================================================================
// 🌟 لاگ شماره ۲: ثبت آدرس مقصد
dockerLog("🚀 FORWARDING TO", $targetUrl);

$ch = curl_init($targetUrl);

// استفاده از آرایه برای کانفیگ cURL (تمیزتر و خواناتر)
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $method,
    CURLOPT_POSTFIELDS     => $rawBody,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => $forwardHeaders,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 15,
    
    // 🌟 خاموش کردن حساسیت به گواهینامه SSL
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

// ========================================================================
// ۷. لاگ پاسخ و بازگرداندن نتیجه
// ========================================================================
if ($response === false) {
    // 🌟 لاگ شماره ۳: ثبت خطای cURL
    dockerLog("❌ CURL ERROR", ['HTTP_CODE' => $httpCode, 'ERROR' => $curlError]);
    
    http_response_code(502);
    echo json_encode([
        'success' => false, 
        'message' => "ارتباط با سرور استان {$subdomain} برقرار نشد.", 
        'error' => $curlError
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 🌟 لاگ شماره ۴: ثبت پاسخ موفق از سرور استان
dockerLog("✅ RESPONSE RECEIVED", [
    'HTTP_CODE' => $httpCode,
    'Response'  => json_decode($response, true) ?: $response // تلاش برای نمایش ساختاریافته در کنسول
]);

http_response_code($httpCode);
echo $response;
exit();
?>