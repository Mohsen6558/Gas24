<?php
// ========================================================================
// پیکربندی درگاه API گاز۲۴
// این فایل فقط از طریق index.php بارگذاری می‌شود.
// ========================================================================
if (!defined('GAS24_GATEWAY')) {
    http_response_code(404);
    exit();
}

return [
    // --------------------------------------------------------------------
    // استان‌ها: کلید = ساب‌دامین (مثلاً ardabil.gas24.ir)
    //   name       نام فارسی برای پیام‌های خطا
    //   upstream   آدرس سرور استان؛ null یعنی استان در لیست اپ هست ولی هنوز وصل نشده
    //   verify_tls (اختیاری) پیش‌فرض true. فقط به‌طور موقت و برای سروری که گواهی
    //              معتبر ندارد false شود؛ tools/check-upstreams.php را ببینید.
    // هر استانی که در state.json هست باید اینجا هم باشد (CI بررسی می‌کند).
    // --------------------------------------------------------------------
    'provinces' => [
        // شبکه داخلی و بدون TLS. نام es.nigc-ar.ir در docker-compose به 192.168.4.10 پین شده؛
        // اگر آن نسخه HTTPS همین سرویس است، این آدرس را با آن جایگزین کنید.
        'ardabil'    => ['name' => 'اردبیل',            'upstream' => 'http://192.168.4.14:8003'],
        // کاندید: https://moshtarak.nigc-eazar.ir (در extra_hosts پین شده) — پس از تأیید تنظیم شود.
        'eazar'      => ['name' => 'آذربایجان شرقی',    'upstream' => null],
        'fars'       => ['name' => 'فارس',              'upstream' => 'https://dpd.farsgas.ir'],
        'hamadan'    => ['name' => 'همدان',             'upstream' => 'https://nigc-hm.artadata.ir'],
        'ilam'       => ['name' => 'ایلام',             'upstream' => 'https://ilam.artadata.ir'],
        'isfahan'    => ['name' => 'اصفهان',            'upstream' => 'https://esfahan.gas.ir'],
        'kerman'     => ['name' => 'کرمان',             'upstream' => 'https://es.nigc-kerman.ir'],
        'khuzestan'  => ['name' => 'خوزستان',           'upstream' => 'https://portal.nigc-khgc.ir'],
        'mazandaran' => ['name' => 'مازندران',          'upstream' => 'https://mazandaran.gas.ir'],
        'nkhorasan'  => ['name' => 'خراسان شمالی',      'upstream' => 'https://es.nigc-nkgc.ir'],
        'qazvin'     => ['name' => 'قزوین',             'upstream' => null],
        'qom'        => ['name' => 'قم',                'upstream' => null],
        'sb'         => ['name' => 'سیستان و بلوچستان', 'upstream' => 'https://e.nigc-sbgc.ir'],
        'skhorasan'  => ['name' => 'خراسان جنوبی',      'upstream' => 'https://southkhorasan.artadata.ir'],
        'wazar'      => ['name' => 'آذربایجان غربی',    'upstream' => null],
        'testapi'    => ['name' => 'تست',               'upstream' => 'https://pishkhan.artadata.ir'],
    ],

    // ساب‌دامین‌های قدیمی/جایگزین => کلید استان
    'aliases' => [
        'esfahan' => 'isfahan',
    ],

    // --------------------------------------------------------------------
    // اکشن‌های مجاز. هر مسیری غیر از این‌ها 404 می‌گیرد.
    // --------------------------------------------------------------------
    'action_prefix' => '/ws-optimize/',
    'actions' => [
        'chart', 'check-otp', 'claim-message-token', 'generate-captcha', 'get-faq',
        'get-messages', 'get-profile', 'hint', 'keyno-list', 'leaderboard', 'luky-wheel',
        'my-rewards', 'redeem-reward', 'reward', 'search', 'send-otp', 'submit-declaration',
        'submit-hint', 'submit-karkard', 'submit-keyno', 'token-history', 'validate-captcha',
    ],
    'methods' => ['GET', 'POST'],

    // --------------------------------------------------------------------
    // CORS: فقط این Originها پاسخ CORS می‌گیرند (gas24.ir و همه ساب‌دامین‌هایش).
    // --------------------------------------------------------------------
    'allowed_origin_patterns' => [
        '#^https?://([a-z0-9-]+\.)*gas24\.ir$#',
    ],

    // --------------------------------------------------------------------
    // محدودیت نرخ: [تعداد مجاز, پنجره به ثانیه]
    // محدودیت IP عمداً بازتر است چون کاربران موبایل پشت NAT اپراتور IP مشترک دارند.
    // --------------------------------------------------------------------
    'rate_limits' => [
        'send-otp'         => ['per_mobile' => [5, 900],  'per_ip' => [30, 600]],
        'check-otp'        => ['per_mobile' => [10, 900], 'per_ip' => [60, 600]],
        'validate-captcha' => ['per_ip' => [60, 600]],
        'generate-captcha' => ['per_ip' => [120, 600]],
    ],

    'connect_timeout' => 5,
    'timeout'         => 15,
];
