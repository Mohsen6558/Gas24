<?php
// بررسی دسترسی و اعتبار گواهی TLS سرورهای استان‌ها.
// داخل کانتینر اجرا کنید تا extra_hosts و شبکه داخلی مثل محیط واقعی باشد:
//   docker compose exec my-app php /opt/gas24-tools/check-upstreams.php
//   docker compose exec my-app php /opt/gas24-tools/check-upstreams.php https://moshtarak.nigc-eazar.ir
// اگر برای استانی «TLS نامعتبر» گزارش شد، یا گواهی آن سرور را درست کنید یا
// به‌طور موقت 'verify_tls' => false را برای همان استان در config.php بگذارید.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit();
}
define('GAS24_GATEWAY', true);
$configPath = getenv('GAS24_CONFIG') ?: '/app/api/config.php';
$config = require $configPath;

$targets = [];
foreach ($config['provinces'] as $key => $province) {
    if (!empty($province['upstream'])) {
        $targets[$key] = $province['upstream'];
    }
}
foreach (array_slice($argv, 1) as $i => $candidate) {
    $targets['candidate-' . ($i + 1)] = $candidate;
}

function probe(string $url, bool $verify): array
{
    $ch = curl_init(rtrim($url, '/') . '/index.php/ws-optimize/get-faq');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => '{}',
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => $verify,
        CURLOPT_SSL_VERIFYHOST => $verify ? 2 : 0,
    ]);
    $ok = curl_exec($ch) !== false;
    $result = [$ok, curl_getinfo($ch, CURLINFO_HTTP_CODE), curl_error($ch)];
    curl_close($ch);
    return $result;
}

$failures = 0;
foreach ($targets as $key => $url) {
    [$ok, $code, $error] = probe($url, true);
    if ($ok) {
        $status = "OK (HTTP $code)";
    } elseif (str_starts_with($url, 'https://') && probe($url, false)[0]) {
        $status = "TLS نامعتبر: $error";
        $failures++;
    } else {
        $status = "در دسترس نیست: $error";
        $failures++;
    }
    printf("%-14s %-42s %s\n", $key, $url, $status);
}
exit($failures > 0 ? 1 : 0);
