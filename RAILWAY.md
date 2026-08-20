# نشر StoreKit على Railway من GitHub

StoreKit مجهز الآن ليُبنى من `Dockerfile` ويشغّل **الواجهة والـAPI في خدمة واحدة**. لا تحتاج إلى تشغيل Vite أو Express يدويًا، ولا إلى رفع ملفات `dist` إلى GitHub. Railway يقرأ `railway.json` تلقائيًا، يبني الصورة، يشغّل السيرفر، ثم يفحص `/healthz`.

> **مهم لإصلاح Railway build:** صورة البناء والإنتاج تستخدم `node:22-bookworm-slim` بدل Alpine/musl. هذا يضمن توفر Rollup glibc native binary، بينما يتم نسخ `tsconfig.json` و`tsconfig.base.json` مع بنية الـworkspace كاملة. لا تضف Build Command مخصصًا في Railway؛ اترك Builder على `Dockerfile` كما يحدد `railway.json`.

> **المطلوب فعليًا للنشر الأول:** خدمة StoreKit واحدة فقط. عند غياب `DATABASE_URL`، يبدأ `scripts/start-production.sh` PostgreSQL داخل نفس حاوية التطبيق، ثم يشغّل migrations وseed ويخدم الواجهة والـAPI. لذلك لا توجد خطوة مطلوبة لإنشاء PostgreSQL أو ربط Reference Variable.
>
> **مهم جدًا عند وجود خدمات باسم `@workspace/*`:** هذه ليست طريقة نشر StoreKit الصحيحة. إذا ظهرت خدمات `@workspace/mockup-sandbox` أو `@workspace/api-server` أو `@workspace/api-client-react` أو `@workspace/storekit` منفصلة، فالمشروع مضبوط كـmonorepo services أو Nixpacks قديم. احذف الخدمات الفاشلة القديمة، وأنشئ خدمة واحدة من **جذر المستودع** `storekit` فقط. لا تضبط Root Directory على `artifacts/storekit` أو `artifacts/api-server`، ولا تنشئ خدمة لكل package.

## النشر الأول — ضغطة واحدة

افتح [زر Deploy on Railway](https://railway.com/new/github?repo=abdelhamednada631-del/storekit)، اختر المستودع إذا طلب Railway ذلك، ثم اضغط **Deploy**. اترك Root Directory على جذر المستودع، ولا تضف Build Command أو Start Command أو خدمة PostgreSQL يدويًا؛ `railway.json` و`Dockerfile` يضبطان البناء، entrypoint، healthcheck، وrestart policy تلقائيًا. بعد اكتمال البناء سيقوم التطبيق بتهيئة PostgreSQL الداخلي، تشغيل migrations وseed، ثم يصبح المتجر متاحًا من نفس الخدمة.

إذا كانت لديك Project موجودة بالفعل، أوقف أو احذف الخدمات القديمة باسم `@workspace/*` أو أي PostgreSQL منفصل لم تعد تحتاجه، ثم اعمل Redeploy من commit حديث بعد الدمج. الملف `nixpacks.toml` موجود كمسار احتياطي ويشغّل `build:production` فقط إذا تم اختيار Nixpacks، لكنه لا يبرر إنشاء services منفصلة.

يمكنك اختيار PostgreSQL خارجي لاحقًا إذا أردت إدارة قاعدة البيانات خارج الحاوية؛ بمجرد ضبط `DATABASE_URL` سيأخذ التطبيق هذه القيمة ويستخدمها بدل PostgreSQL الداخلي.

> **مسار Railway Template المتقدم:** توضح [وثائق Railway الرسمية للقوالب](https://docs.railway.com/templates/create) أن Template من حساب Railway يستطيع تعريف خدمات متعددة، مصدر GitHub، المتغيرات، Root Directory، Start command، Healthcheck، وVolume. هذا مورد داخل حساب Railway وليس ملفًا يمكن إنشاؤه من GitHub وحده؛ لذلك يظل زر GitHub الحالي هو المسار الفوري الذي لا يحتاج PostgreSQL يدويًا، بينما يمكن إنشاء Template لاحقًا إذا أردت PostgreSQL مُدارًا وVolume مُعرّفًا من البداية.

## المتغيرات الأساسية

يضع Dockerfile قيمًا افتراضية آمنة للتشغيل الأول، لكن يجب تغيير كلمة مرور الإدارة قبل تسليم المتجر للعميل:

| المتغير | الحالة | الغرض |
|---|---|---|
| `DATABASE_URL` | اختياري | إذا غاب، يستخدم التطبيق PostgreSQL الداخلي داخل الحاوية؛ وإذا وُجد، تكون قيمته هي المصدر الأساسي |
| `ADMIN_PASSWORD` | افتراضي قابل للتغيير | دخول `/admin` |
| `ADMIN_SECRET` | اختياري | توقيع جلسات الإدارة؛ يفضّل ضبطه في production |
| `SESSION_SECRET` | اختياري | سر جلسات التطبيق إذا استُخدم |
| `NODE_ENV` | مضبوط في Dockerfile | `production` |
| `PORT` | يحدده Railway | التطبيق يستمع على المنفذ الذي توفره Railway |
| `UPLOAD_DIR` | اختياري | اضبطه إلى `/app/data/uploads` إذا استخدمت Volume واحدًا لحفظ الصور المرفوعة مع قاعدة البيانات |

القيمة الافتراضية للإدارة هي `storekit2024` للتشغيل الأول فقط. غيّرها من **StoreKit Service → Variables** قبل تسليم الرابط للعميل.

## الصور والاعتماد الخارجي

الـfrontend والصور الأساسية داخل صورة التطبيق تحت `artifacts/storekit/public/images`. كما أن بيانات seed تستخدم مسارات محلية مثل `/images/fashion/hero-luxury-mobile.jpg` بدل روابط Picsum الخارجية. لذلك لا يحتاج المتجر إلى CDN صور أو خدمة API خارجية كي يعرض كتالوجه الأساسي.

## استمرارية بيانات الإنتاج

النشر الأول يعمل دون Volume، لكن نظام ملفات Railway للحاوية ليس مخزنًا دائمًا مضمونًا عند إعادة إنشاء الخدمة. لذلك، إذا كان المتجر سيستقبل طلبات حقيقية أو تعديلات من لوحة الإدارة، أضف Volume اختياريًا إلى خدمة StoreKit بمسار mount هو `/app/data`، واضبط المتغير `UPLOAD_DIR=/app/data/uploads`. سيحفظ ذلك PostgreSQL الداخلي في `/app/data/postgres` وملفات الإدارة في `/app/data/uploads` داخل Volume واحد.

هذه الخطوة **ليست شرطًا لنجاح النشر بضغطة واحدة**؛ هي توصية تشغيلية لاستمرارية بيانات متجر production. إذا لم تضف Volume ولم تضبط `DATABASE_URL` خارجيًا، سيظل المتجر يعمل، لكن البيانات المحلية قد تبدأ من جديد بعد إعادة إنشاء الحاوية.

## الدفع وتسجيل العملاء

المتجر يعمل افتراضيًا دون Clerk أو Stripe. التكاملات الحقيقية اختيارية، ولا تمنع تشغيل الكتالوج والسلة والطلبات الداخلية. عند الحاجة إلى حسابات العملاء أو الدفع الحقيقي، أضف مفاتيح Clerk وStripe السرية من Railway Variables، ولا تضعها في GitHub أو داخل `.env`.

## الاختبار بعد النشر

بعد نجاح deployment، افتح:

```text
https://YOUR-RAILWAY-DOMAIN.up.railway.app/
https://YOUR-RAILWAY-DOMAIN.up.railway.app/admin
https://YOUR-RAILWAY-DOMAIN.up.railway.app/healthz
https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/health
```

يجب أن يعيد `/healthz` النص `ok`، وأن يعيد `/api/health` JSON يحتوي على `"ok": true`. إذا ظهر في السجل أن `DATABASE_URL` غير موجود، فهذا طبيعي في النشر one-click؛ يجب أن ترى بدلًا منه رسائل تشغيل PostgreSQL الداخلي ثم `Migrations complete` و`Seed complete`. إذا ظهر في سجل build القديم `@rollup/rollup-linux-x64-musl`، فهذا يعني أن Railway يبني commit قديمًا أو يستخدم إعداد Alpine قديمًا؛ تأكد من أن آخر commit هو إصلاح Dockerfile، ثم نفّذ Redeploy من آخر commit مع تنظيف build cache إن ظهر الخيار.

## التحديثات اللاحقة

كل تحديث يتم بالطريقة التالية:

```bash
git add .
git commit -m "update storefront"
git push origin main
```

Railway سيعيد البناء والنشر تلقائيًا من آخر commit على `main`، وسيعيد تشغيل migrations بشكل idempotent ثم يتخطى seed إذا كانت قاعدة البيانات تحتوي على بيانات محفوظة في Volume أو قاعدة خارجية. بدون Volume أو `DATABASE_URL` خارجي، قد تعود قاعدة البيانات الداخلية إلى حالة seed بعد إعادة إنشاء الحاوية. يجب أن يظهر في build log بناء Dockerfile واحدًا؛ إذا ظهر `@workspace/*` كخدمات منفصلة، فأنت تنشر إعداد Project قديمًا وليس خدمة StoreKit الجديدة.

## ملفات النشر داخل المستودع

- `Dockerfile`: يبني frontend وAPI داخل multi-stage image واحدة.
- `railway.json`: يثبت Dockerfile وstart command وhealthcheck وrestart policy.
- `nixpacks.toml`: fallback يمنع recursive workspace build ويشغّل StoreKit كخدمة واحدة إذا تم اختيار Nixpacks.
- `.dockerignore`: يمنع الأسرار وملفات audit و`node_modules` من دخول build context.
- `artifacts/api-server/src/app.ts`: يوفر `/healthz` و`/api/health` ويخدم SPA fallback.
- `artifacts/api-server/src/startup.ts`: يشغل migrations وseed ويستخدم الصور المحلية.
- `railway-template-research.md`: يسجل نتائج التحقق من Railway Templates ومسار إنشاء قالب متعدد الموارد.

### مراجع Railway

- [Railway Quick Start — GitHub deployment](https://docs.railway.com/quick-start)
- [Railway Config as Code](https://docs.railway.com/config-as-code)
- [Railway Config as Code Reference](https://docs.railway.com/config-as-code/reference)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
