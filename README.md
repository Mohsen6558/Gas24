# Gas24

سایت‌ها و درگاه API پویش «گرمای پایدار / گازیوم»، به‌همراه نسخهٔ اندروید (WebView).

## ساختار

| مسیر | توضیح |
|---|---|
| `src/` | ریشهٔ وب‌سرور (`/app` داخل کانتینر). خروجی build اپ‌ها + درگاه API |
| `src/index.html`، `src/assets/` | صفحهٔ اصلی gas24.ir |
| `src/app/` | اپ گازیوم (PWA) — `sw.js` در ریشه آن را کش می‌کند |
| `apps/gazyom/` | **سورس اپ گازیوم** (React + Vite) — خروجی آن در `src/my` منتشر می‌شود |
| `src/my/` | خروجی build اپ برای دامنهٔ `my.gas24.ir` (دستی ویرایش نکنید؛ پایین را ببینید) |
| `apps/landing/` | **سورس لندینگ استان‌ها** (یک سورس برای همه؛ متن، شهرها، آمار و عکس هر استان در `src/provinces.json`) |
| `src/<استان>/` | خروجی لندینگ هر استان (مسیرها نسبی‌اند؛ هم در `gas24.ir/ardabil/` و هم به‌عنوان ریشهٔ ساب‌دامین کار می‌کنند) |
| `src/api/` | درگاه API: `index.php` و پیکربندی `config.php` |
| `android/` | اپ اندروید (Kotlin + WebView) |
| `nginx/00-security.conf` | هدرهای امنیتی و مسدودسازی فایل‌های حساس |
| `api.conf` | مسیریابی `/api/index.php/...` به PHP |
| `tools/` | ابزارهای بررسی و نگهداری (پایین‌تر) |
| `sources/arta/` | سورس سایت آرتا (بیرون از ریشهٔ وب‌سرور) |

## لندینگ استان‌ها

همهٔ صفحه‌های `<استان>.gas24.ir` از یک سورس (`apps/landing`) ساخته می‌شوند. هر استان فقط یک بلوک در `apps/landing/src/provinces.json` دارد: نام، شعار، شهرها، آمار (اختیاری) و عکس بالای صفحه (اختیاری؛ از `https://gas24.ir/media/content/`).

- تغییر ظاهر یا متن مشترک: `apps/landing/src/App.tsx`
- انتشار: `bash tools/deploy_landings.sh` — یک بار build می‌گیرد، در `src/<استان>/` می‌گذارد، sitemap و robots را به‌روز و سایت را بررسی می‌کند. بعد commit و push کنید.
- استان تازه: یک بلوک به `provinces.json` اضافه کنید و همان اسکریپت را اجرا کنید. پراکسی اصلی ساب‌دامین را خودش به پوشه می‌برد؛ فقط DNS و گواهی باید ساب‌دامین را پوشش دهند.

## ویرایش اپ گازیوم و انتشار روی my

1. کد را در `apps/gazyom` تغییر دهید (اجرای محلی: `cd apps/gazyom && npm ci && npm run dev`).
2. انتشار: `tools/deploy_my.sh` — build می‌گیرد و خروجی را در `src/my` می‌گذارد، revisionهای Service Worker را به‌روز و کل سایت را بررسی می‌کند. بعد commit و push کنید.
   - `state.json`، `app/state.json` و `.well-known/` در `src/my` جدا نگه داشته می‌شوند و build آن‌ها را عوض نمی‌کند.
   - فایل‌های قدیمی `assets` نگه داشته می‌شوند تا تب‌های باز خراب نشوند؛ برای پاک کردنشان `tools/deploy_my.sh --prune`.
   - کلید Gemini عمداً در build گذاشته نمی‌شود (باندل عمومی است).
3. اسکریپت‌های گفتینو و یکتانت و آیکون‌ها حالا داخل سورس (`app/index.html`، `index.html`، `public/icons`) هستند؛ ویرایش دستی `src/my` لازم نیست.

### بنر تبلیغاتی اپ (پاپ‌آپ بعد از ورود)

کاربری که وارد شده، با رسیدن به صفحهٔ اصلی اپ یک بنر (عکس) می‌بیند. تنظیمش در `src/my/banner.json` است که جزو build نیست؛ عکس، لینک و زمان‌بندی را همان‌جا عوض کنید، commit و push کنید و روی سرور `git pull` بزنید (کامپایل لازم نیست).

```json
{
  "banners": [
    {
      "id": "autumn-1405",
      "enabled": true,
      "image": "/banners/autumn.jpg",
      "link": "https://my.gas24.ir/app/?tab=rewards",
      "buttonText": "مشاهده جوایز",
      "maxViews": 3,
      "provinces": [],
      "from": "2026-10-01",
      "until": "2026-12-31",
      "alt": "جشنواره پاییزه"
    }
  ]
}
```

| فیلد | معنی |
|---|---|
| `id` | شناسهٔ بنر. **بنر تازه = id تازه**؛ شمارش دفعات نمایش با id عوض می‌شود. |
| `enabled` | `false` یعنی خاموش (بدون پاک کردن تنظیمات). |
| `image` | عکس؛ یا در `src/my/banners/` بگذارید و `/banners/اسم.jpg` بنویسید، یا آدرس کامل `https://...`. |
| `link` | اختیاری. اگر باشد، زدن روی عکس یا دکمه لینک را باز می‌کند (لینک‌های my.gas24.ir در همان اپ، بقیه در صفحهٔ جدید). اگر نباشد، بنر فقط به‌صورت پنجره با دکمهٔ بستن نمایش داده می‌شود. |
| `buttonText` | متن دکمهٔ زیر عکس وقتی لینک هست؛ پیش‌فرض «مشاهده». |
| `maxViews` | حداکثر دفعات نمایش به هر کاربر؛ پیش‌فرض ۳. در هر بار باز کردن اپ حداکثر یک بار نمایش داده می‌شود. |
| `provinces` | فقط برای این استان‌ها (مثلاً `["kerman", "ardabil"]`)؛ خالی یعنی همه. |
| `from` / `until` | اختیاری؛ تاریخ میلادی مثل `2026-12-20` (یا با ساعت: `2026-12-20T18:00:00+03:30`). |
| `alt` | توضیح عکس برای صفحه‌خوان. |

- اگر چند بنر در فهرست باشد، اولین بنری که شرایطش جور است نمایش داده می‌شود.
- دفعات نمایش در همان گوشی/مرورگر و برای هر شمارهٔ موبایل جدا شمرده می‌شود (با «خروج از حساب» پاک نمی‌شود). داخل ایتا یا بله شمارش جدا از مرورگر است.
- عکسی که لود نشود نمایش داده و شمرده نمی‌شود.
- `python3 tools/check_site.py` (و CI) اشتباه‌های این فایل را می‌گیرد: عکس ناموجود، لینک نامعتبر، استان ناشناخته، تاریخ اشتباه، id تکراری.
- نمایش و کلیک در Google Analytics با رویدادهای `promo_banner_view` و `promo_banner_click` ثبت می‌شود.

## اجرا

```bash
docker compose up -d
```

سایت روی پورت `8042` بالا می‌آید و پشت پراکسی اصلی (TLS) قرار می‌گیرد. کانتینر `healthcheck` و `restart: unless-stopped` دارد.

### نمایش داخل وب ایتا (iframe)

برنامک ایتا، `my.gas24.ir` را در iframe باز می‌کند. برای همین:
- پراکسی اصلی برای `my.gas24.ir` به‌جای `X-Frame-Options` هدر `Content-Security-Policy: frame-ancestors 'self' https://eitaa.com https://*.eitaa.com https://eitaa.ir https://*.eitaa.ir https://bale.ai https://*.bale.ai https://ble.ir https://*.ble.ir` می‌فرستد (با `map` روی `$host`)، پس فقط خود سایت، ایتا و بله می‌توانند آن را در iframe باز کنند (پیام‌رسان تازه = دامنه‌اش به همین فهرست)؛ بقیهٔ دامنه‌ها همچنان `X-Frame-Options: SAMEORIGIN` می‌گیرند. کانتینر خودش هیچ‌کدام از این دو هدر را نمی‌فرستد.
- Service Worker صفحهٔ اپ را با همان هدرهای لحظهٔ ذخیره نگه می‌دارد؛ بعد از عوض کردن هدرها، برای دیدن هدر تازه در مرورگر خودتان «Clear site data» بزنید.
- اپ توکن ورود را علاوه بر کوکی در `localStorage` هم نگه می‌دارد، چون مرورگر داخل iframe بین‌سایتی کوکی `SameSite=Lax` را دور می‌ریزد.
- نسخهٔ وب ایتا و بله مثل تلگرام منتظر پیام `web_app_ready` از برنامک می‌مانند و بدون آن بعد از چند ثانیه «Open in new tab» نشان می‌دهند؛ `apps/gazyom/app/index.html` این پیام را اول صفحه (قبل از بارگذاری اپ) می‌فرستد.

## درگاه API (`src/api`)

اپ درخواست‌ها را به `https://<استان>.gas24.ir/api/index.php/ws-optimize/<اکشن>` می‌فرستد و درگاه آن را به سرور همان استان می‌رساند.

- **فقط اکشن‌های مجاز** (لیست `actions` در `config.php`) عبور می‌کنند؛ هر مسیر دیگری 404 می‌گیرد.
- **CORS** فقط برای `gas24.ir` و ساب‌دامین‌هایش باز است.
- **محدودیت نرخ** روی `send-otp`، `check-otp` و کپچا (بر اساس شماره موبایل و IP).
- **بررسی گواهی TLS سرور استان فعلاً خاموش است** (`'verify_tls' => false` در `config.php`، مثل درگاه قبلی). برای روشن کردن، اول ببینید کدام سرورها گواهی معتبر دارند:

  ```bash
  docker compose exec my-app php /opt/gas24-tools/check-upstreams.php
  ```

  بعد `verify_tls` سراسری را `true` کنید و فقط برای استان‌هایی که «TLS نامعتبر» گرفتند `'verify_tls' => false` بگذارید.
- **لاگ‌ها** فقط متادیتا دارند (استان، اکشن، وضعیت، زمان، IP). برای عیب‌یابی موقت `GAS24_DEBUG=1` بدنه‌ها را با پوشاندن فیلدهای حساس لاگ می‌کند.

### افزودن یا فعال کردن استان

1. آدرس سرور استان را در `src/api/config.php` زیر `provinces` بگذارید (اگر دامنه باید به IP خاصی برود، به `extra_hosts` در `docker-compose.yml` هم اضافه کنید).
2. استان را به `state.json` مربوطه (`src/state.json` و `src/my/state.json`) اضافه کنید.
3. `python3 tools/check_site.py` را اجرا کنید.

استان‌هایی که در لیست اپ هستند ولی `upstream` ندارند (فعلاً **قزوین، قم، آذربایجان غربی**) پیام «سامانهٔ استان … هنوز متصل نشده است» می‌گیرند.

## اپ اندروید (`android/`)

اپ، `https://my.gas24.ir/app/` را در WebView باز می‌کند. لینک‌های gas24.ir داخل اپ می‌مانند؛ تلفن، ایمیل، بازار و سایت‌های دیگر در برنامهٔ مربوط باز می‌شوند. صفحهٔ آفلاین، دکمهٔ بازگشت، انتخاب فایل، کیبورد و لینک‌های `https://my.gas24.ir/...` (App Links) پشتیبانی می‌شوند.

- **دریافت APK:** هر push در GitHub Actions (workflow «CI»، job «Android APK») فایل‌های APK را به‌عنوان artifact با نام `gas24-apk` می‌سازد.
  - `app-debug.apk`: قابل نصب برای تست، با شناسهٔ `gas.gas24.debug` (کنار نسخهٔ اصلی نصب می‌شود).
  - `app-release.apk`: فقط وقتی کلید امضا تنظیم شده باشد امضا می‌شود؛ در غیر این صورت `app-release-unsigned.apk` است.
- **ساخت محلی:** `cd android && ./gradlew assembleDebug` (نیاز به JDK 17 و Android SDK).
- **آدرس شروع:** `./gradlew assembleRelease -Pgas24.startUrl=https://...`
- **نسخه:** `-Pgas24.versionCode=...` و `-Pgas24.versionName=...` (CI از شمارهٔ اجرای workflow استفاده می‌کند).

### امضای نسخهٔ انتشار

شناسهٔ بسته `gas.gas24` است و `assetlinks.json` روی سایت، اثر انگشت یک کلید موجود را دارد. برای این‌که App Links تأیید شوند و نسخه‌های قبلی به‌روزرسانی شوند، باید **با همان کلید** امضا کنید:

- محلی: `android/keystore.properties.example` را به `keystore.properties` کپی و پر کنید (کامیت نمی‌شود).
- CI: این secretها را در GitHub تعریف کنید: `GAS24_KEYSTORE_BASE64` (خروجی `base64 -w0 key.jks`)، `GAS24_KEYSTORE_PASSWORD`، `GAS24_KEY_ALIAS`، `GAS24_KEY_PASSWORD`.

اگر کلید جدیدی می‌سازید، اثر انگشت SHA-256 آن را (`keytool -list -v -keystore key.jks`) در هر دو فایل `src/.well-known/assetlinks.json` و `src/my/.well-known/assetlinks.json` بگذارید.

### نسخهٔ WebView

اپ وب با Tailwind CSS v4 ساخته شده و به Chromium/WebView نسخهٔ ۱۱۱ به بالا نیاز دارد. اگر WebView گوشی قدیمی‌تر باشد، اپ پیغام به‌روزرسانی نشان می‌دهد.

## ابزارها

| دستور | کار |
|---|---|
| `python3 tools/check_site.py` | JSONها، لینک‌های شکسته، هم‌خوانی استان‌ها با درگاه، به‌روز بودن Service Worker |
| `bash tools/test_gateway.sh` | تست‌های درگاه API با سرور جعلی (بدون نیاز به شبکه) |
| `python3 tools/update_sw_revisions.py` | بعد از هر ویرایش دستی `index.html`، `app/index.html` یا manifest اجرا شود |
| `bash tools/deploy_landings.sh` | ساخت لندینگ از `apps/landing` و انتشار در پوشهٔ همهٔ استان‌ها |
| `python3 tools/fix_subapp_paths.py` | نسبی کردن مسیرهای یک build جدید (برای صفحه‌هایی که سورسشان این‌جا نیست) |
| `python3 tools/generate_sitemap.py` | ساخت `sitemap.xml` و `robots.txt` برای gas24.ir و ساب‌دامین‌های استانی (فهرست استان‌ها از `apps/landing/src/provinces.json`؛ `deploy_landings.sh` خودش اجرایش می‌کند) |
| `node tools/render_icons.js` | ساخت آیکون‌های PNG وب و اندروید از `src/pwa-icon.svg` |

همهٔ این بررسی‌ها و ساخت APK در `.github/workflows/ci.yml` روی هر push اجرا می‌شوند.
