# لندینگ استان‌ها

یک سورس برای صفحهٔ همهٔ استان‌ها (`<استان>.gas24.ir`). متن‌ها، شهرها، آمار و عکس هر استان در `src/provinces.json` است.

- اجرای محلی: `npm ci && npm run dev` و بعد `http://localhost:3000/?p=kerman`
- انتشار: از ریشهٔ مخزن `bash tools/deploy_landings.sh` — یک بار build می‌گیرد و خروجی را در `src/<استان>/` می‌گذارد.
- استان تازه: یک بلوک به `src/provinces.json` اضافه کنید و `deploy_landings.sh` را اجرا کنید؛ sitemap و robots هم خودکار به‌روز می‌شوند.
