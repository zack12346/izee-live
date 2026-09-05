# Izée live

منصة RTL عربية لبيع المنتجات الرقمية مبنية على Next.js 16 وSupabase.

## التشغيل

```bash
npm install
npm run dev
```

يوجد ملف `.env.local` محلياً الآن. استبدل قيم `YOUR_*` فيه من Supabase Dashboard > Project Settings > API قبل التشغيل. لا تضع مفتاح `SUPABASE_SERVICE_ROLE_KEY` في المتصفح أو في متغير يبدأ بـ`NEXT_PUBLIC_`، ولا ترفعه إلى Git.

المتغيرات المطلوبة موجودة في `.env.example`: عنوان Supabase ومفتاح anon ومفتاح الخدمة، إضافة إلى `NEXT_PUBLIC_SITE_URL` و`ADMIN_EMAILS`. خيار الدفع التجريبي مخصص للتطوير فقط؛ الدفع الحقيقي يحتاج عقداً ومفاتيحاً من مزود رسمي، ولا تستخدم بيانات وهمية.

## المزايا

- متجر وتصنيفات وصفحات منتجات مع SEO وRTL.
- Supabase Auth للتسجيل وتأكيد البريد واستعادة كلمة المرور.
- سلة مستمرة، كوبونات، طلبات، تحويل يدوي ودفع تجريبي اختياري.
- تنزيلات موقعة من bucket خاص بعد تأكيد الطلب.
- تقييمات ومفضلة وحساب عميل ولوحة إدارة محمية.
- `sitemap.xml` و`robots.txt` وواجهات loading/error/not-found.

## التحقق

```bash
npm run lint
npm run build
```

## تطبيق Migrations على Supabase

بعد إنشاء مشروع Supabase، طبّق migrations بالترتيب: `0001_init.sql` ثم `0002_orders_coupons_security.sql` ثم `0003_grant_zakireggadnot8pro_admin.sql` ثم `0004_harden_download_updates.sql` ثم `0005_subscription_products.sql` ثم `0006_manual_payments_and_inventory.sql` ثم `0007_security_hardening.sql` ثم `0008_threat_monitoring_bans.sql` ثم `0009_lock_security_reporting.sql` ثم `0010_restore_zakireggadnot8pro_admin.sql`.

تضيف `0005_subscription_products.sql` فئات Streaming وAI & Digital Tools وبيانات منتجات الاشتراكات التجريبية، إضافة إلى نوع الاشتراك وبيانات التسليم الفوري للمنتجات. تضيف `0006_manual_payments_and_inventory.sql` الدفع اليدوي ومخزون التسليم، وتعيد `0007_security_hardening.sql` تعريف سياسات RLS النهائية، بينما تضيف `0008_threat_monitoring_bans.sql` مراقبة التهديدات والحظر الآلي بعد ثلاث مخالفات خلال 10 دقائق أو عند اكتشاف payload هجومي واضح، ويقفل `0009_lock_security_reporting.sql` تسجيل الحظر على service role فقط. اضبط `SECURITY_REPORT_SECRET` بقيمة عشوائية طويلة ومتطابقة في بيئة Next.js. لا تضع بيانات حسابات حقيقية في migration أو seed؛ خزّنها من لوحة الإدارة بعد إعداد سياسات الوصول المناسبة.

يمكن تطبيقها بإحدى الطريقتين:

### Supabase Dashboard

1. افتح مشروع Supabase ثم **SQL Editor** واختر **New query**.
2. افتح ملفات migrations بالترتيب وانسخ محتواها إلى المحرر.
3. اضغط **Run** وانتظر نجاح جميع العبارات.
4. من **Table Editor > products > Policies** تحقق من RLS، ومن **Storage > Policies** تحقق أن bucket `product-files` خاص.

### Supabase CLI

إذا كان Supabase CLI مثبتاً ومشروعك مربوطاً:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

يجب أن تكون ملفات `0001_init.sql` و`0002_orders_coupons_security.sql` داخل `supabase/migrations` وبترتيبهما الحالي. لا تشغّل migration نفسها مراراً يدوياً إذا سجّلها CLI، لأن Supabase يتتبعها في جدول migrations.

بعد تغيير `.env.local` أعد تشغيل خادم Next.js حتى تُقرأ القيم الجديدة.
