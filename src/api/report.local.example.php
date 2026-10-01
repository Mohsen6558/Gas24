<?php
// ========================================================================
// نمونه تنظیمات محرمانه پنل گزارش (gas24.ir/report/).
// روی سرور یک کپی با نام report.local.php کنار همین فایل بسازید و مقدارها را پر کنید:
//     cp src/api/report.local.example.php src/api/report.local.php
// report.local.php در .gitignore است و با git pull عوض یا پاک نمی‌شود.
// به جای این فایل می‌شود متغیرهای محیطی GAS24_REPORT_PASSWORD و GAS24_DAFTAR_TOKEN را هم داد.
// ========================================================================
if (!defined('GAS24_GATEWAY')) {
    http_response_code(404);
    exit();
}

return [
    // رمز ثابت ورود به صفحه گزارش؛ هر کسی وارد صفحه شود همین را می‌خواهد
    'password' => '',

    // رمز هدر X-Token وب‌سرویس گزارش دفتر (همان رمز export-data در WsOptimizeController)
    'daftar_token' => '',

    // (اختیاری) رمز اختصاصی استان‌هایی که در params.php دفترشان OptimizeReportToken گذاشته‌اند
    'daftar_tokens' => [
        // 'kerman' => '...',
    ],
];
