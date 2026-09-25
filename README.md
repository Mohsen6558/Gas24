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
| `src/<استان>/` | صفحهٔ معرفی هر استان (مسیرها نسبی‌اند؛ هم در `gas24.ir/ardabil/` و هم به‌عنوان ریشهٔ ساب‌دامین کار می‌کنند) |
| `src/api/` | درگاه API: `index.php` و پیکربندی `config.php` |
| `android/` | اپ اندروید (Kotlin + WebView) |
| `nginx/00-security.conf` | هدرهای امنیتی و مسدودسازی فایل‌های حساس |
| `api.conf` | مسیریابی `/api/index.php/...` به PHP |
| `tools/` | ابزارهای بررسی و نگهداری (پایین‌تر) |
| `sources/arta/` | سورس سایت آرتا (بیرون از ریشهٔ وب‌سرور) |

> سورس صفحات استانی در این مخزن نیست؛ فقط خروجی build آن‌ها هست.

## ویرایش اپ گازیوم و انتشار روی my

1. کد را در `apps/gazyom` تغییر دهید (اجرای محلی: `cd apps/gazyom && npm ci && npm run dev`).
2. انتشار: `tools/deploy_my.sh` — build می‌گیرد و خروجی را در `src/my` می‌گذارد، revisionهای Service Worker را به‌روز و کل سایت را بررسی می‌کند. بعد commit و push کنید.
   - `state.json`، `app/state.json` و `.well-known/` در `src/my` جدا نگه داشته می‌شوند و build آن‌ها را عوض نمی‌کند.
   - فایل‌های قدیمی `assets` نگه داشته می‌شوند تا تب‌های باز خراب نشوند؛ برای پاک کردنشان `tools/deploy_my.sh --prune`.
   - کلید Gemini عمداً در build گذاشته نمی‌شود (باندل عمومی است).
3. اسکریپت‌های گفتینو و یکتانت و آیکون‌ها حالا داخل سورس (`app/index.html`، `index.html`، `public/icons`) هستند؛ ویرایش دستی `src/my` لازم نیست.

## اجرا

```bash
docker compose up -d
```

سایت روی پورت `8042` بالا می‌آید و پشت پراکسی اصلی (TLS) قرار می‌گیرد. کانتینر `healthcheck` و `restart: unless-stopped` دارد.

## درگاه API (`src/api`)

اپ درخواست‌ها را به `https://<استان>.gas24.ir/api/index.php/ws-optimize/<اکشن>` می‌فرستد و درگاه آن را به سرور همان استان می‌رساند.

- **فقط اکشن‌های مجاز** (لیست `actions` در `config.php`) عبور می‌کنند؛ هر مسیر دیگری 404 می‌گیرد.
- **CORS** فقط برای `gas24.ir` و ساب‌دامین‌هایش باز است.
- **محدودیت نرخ** روی `send-otp`، `check-otp` و کپچا (بر اساس شماره موبایل و IP).
- **گواهی TLS سرور استان بررسی می‌شود.** قبل از استقرار داخل کانتینر اجرا کنید:

  ```bash
  docker compose exec my-app php /opt/gas24-tools/check-upstreams.php
  ```

  اگر برای استانی «TLS نامعتبر» آمد، گواهی آن سرور را درست کنید یا موقتاً `'verify_tls' => false` را برای همان استان در `config.php` بگذارید.
- **لاگ‌ها** فقط متادیتا دارند (استان، اکشن، وضعیت، زمان، IP). برای عیب‌یابی موقت `GAS24_DEBUG=1` بدنه‌ها را با پوشاندن فیلدهای حساس لاگ می‌کند.

### افزودن یا فعال کردن استان

1. آدرس سرور استان را در `src/api/config.php` زیر `provinces` بگذارید (اگر دامنه باید به IP خاصی برود، به `extra_hosts` در `docker-compose.yml` هم اضافه کنید).
2. استان را به `state.json` مربوطه (`src/state.json` و `src/my/state.json`) اضافه کنید.
3. `python3 tools/check_site.py` را اجرا کنید.

استان‌هایی که در لیست اپ هستند ولی `upstream` ندارند (فعلاً **آذربایجان شرقی، قزوین، قم، آذربایجان غربی**) پیام «سامانهٔ استان … هنوز متصل نشده است» می‌گیرند.

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
| `python3 tools/fix_subapp_paths.py` | نسبی کردن مسیرهای یک build جدید استانی |
| `node tools/render_icons.js` | ساخت آیکون‌های PNG وب و اندروید از `src/pwa-icon.svg` |

همهٔ این بررسی‌ها و ساخت APK در `.github/workflows/ci.yml` روی هر push اجرا می‌شوند.
