# نشر StoreKit على Railway من GitHub

StoreKit مجهز الآن ليُبنى من `Dockerfile` ويشغّل **الواجهة والـAPI في خدمة واحدة**. لا تحتاج إلى تشغيل Vite أو Express يدويًا، ولا إلى رفع ملفات `dist` إلى GitHub. Railway يقرأ `railway.json` تلقائيًا، يبني الصورة، يشغّل السيرفر، ثم يفحص `/healthz`.

> **مهم لإصلاح Railway build:** صورة البناء والإنتاج تستخدم `node:22-bookworm-slim` بدل Alpine/musl. هذا يضمن توفر Rollup glibc native binary، بينما يتم نسخ `tsconfig.json` و`tsconfig.base.json` مع بنية الـworkspace كاملة. لا تضف Build Command مخصصًا في Railway؛ اترك Builder على `Dockerfile` كما يحدد `railway.json`.

> **المطلوب فعليًا:** خدمة StoreKit + خدمة PostgreSQL داخل نفس مشروع Railway. قاعدة البيانات ليست خدمة خارجية يديرها العميل؛ Railway ينشئها داخل المشروع ويوفر `DATABASE_URL` للتطبيق.

## النشر الأول

افتح [Railway](https://railway.com)، اختر **New Project → Deploy from GitHub repo**، ثم اختر مستودع `storekit` واضغط **Deploy Now**. Railway سيكتشف `railway.json` و`Dockerfile` تلقائيًا.

بعد إنشاء المشروع، من لوحة المشروع اختر **New → Database → PostgreSQL**. في خدمة StoreKit أضف متغيرًا واحدًا باسم `DATABASE_URL` وقيمته Reference Variable إلى خدمة PostgreSQL:

```text
${{Postgres.DATABASE_URL}}
```

إذا كان اسم خدمة قاعدة البيانات مختلفًا، اختر `DATABASE_URL` من قائمة Reference Variables بدل كتابة الاسم يدويًا. بعد حفظ المتغير اضغط **Deploy** مرة واحدة. عند أول تشغيل سيقوم التطبيق تلقائيًا بتشغيل migrations ثم seed للمنتجات والمجموعات والإعدادات.

## المتغيرات الأساسية

يضع Dockerfile قيمًا افتراضية آمنة للتشغيل الأول، لكن يجب تغيير كلمة مرور الإدارة قبل تسليم المتجر للعميل:

| المتغير | الحالة | الغرض |
|---|---|---|
| `DATABASE_URL` | **ضروري** | Reference إلى PostgreSQL داخل Railway |
| `ADMIN_PASSWORD` | افتراضي قابل للتغيير | دخول `/admin` |
| `ADMIN_SECRET` | اختياري | توقيع جلسات الإدارة؛ يفضّل ضبطه في production |
| `SESSION_SECRET` | اختياري | سر جلسات التطبيق إذا استُخدم |
| `NODE_ENV` | مضبوط في Dockerfile | `production` |
| `PORT` | يحدده Railway | التطبيق يستمع على المنفذ الذي توفره Railway |

القيمة الافتراضية للإدارة هي `storekit2024` للتشغيل الأول فقط. غيّرها من **StoreKit Service → Variables** قبل تسليم الرابط للعميل.

## الصور والاعتماد الخارجي

الـfrontend والصور الأساسية داخل صورة التطبيق تحت `artifacts/storekit/public/images`. كما أن بيانات seed تستخدم مسارات محلية مثل `/images/fashion/hero-luxury-mobile.jpg` بدل روابط Picsum الخارجية. لذلك لا يحتاج المتجر إلى CDN صور أو خدمة API خارجية كي يعرض كتالوجه الأساسي.

رفع الصور من لوحة الإدارة يستخدم `/app/uploads`. إذا كان العميل سيضيف صورًا من لوحة الإدارة، أضف Volume إلى خدمة StoreKit بمسار mount هو:

```text
/app/uploads
```

بدون Volume سيظل المتجر يعمل، لكن الملفات التي يرفعها العميل قد تختفي عند إعادة إنشاء الخدمة أو نشر إصدار جديد؛ لذلك يُنصح بالـVolume لأي متجر production.

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

يجب أن يعيد `/healthz` النص `ok`، وأن يعيد `/api/health` JSON يحتوي على `"ok": true`. إذا ظهر في سجل build القديم `@rollup/rollup-linux-x64-musl`، فهذا يعني أن Railway يبني commit قديمًا أو يستخدم إعداد Alpine قديمًا؛ تأكد من أن آخر commit هو إصلاح Dockerfile، ثم نفّذ Redeploy من آخر commit مع تنظيف build cache إن ظهر الخيار. أكثر أسباب الفشل شيوعًا بعد ذلك هي عدم ربط `DATABASE_URL` أو نسيان الضغط على Deploy بعد إضافة Reference Variable.

## التحديثات اللاحقة

كل تحديث يتم بالطريقة التالية:

```bash
git add .
git commit -m "update storefront"
git push origin main
```

Railway سيعيد البناء والنشر تلقائيًا من آخر commit على `main`، وسيعيد تشغيل migrations بشكل idempotent ثم يتخطى seed إذا كانت قاعدة البيانات تحتوي على بيانات.

## ملفات النشر داخل المستودع

- `Dockerfile`: يبني frontend وAPI داخل multi-stage image واحدة.
- `railway.json`: يثبت Dockerfile وstart command وhealthcheck وrestart policy.
- `.dockerignore`: يمنع الأسرار وملفات audit و`node_modules` من دخول build context.
- `artifacts/api-server/src/app.ts`: يوفر `/healthz` و`/api/health` ويخدم SPA fallback.
- `artifacts/api-server/src/startup.ts`: يشغل migrations وseed ويستخدم الصور المحلية.

### مراجع Railway

- [Railway Quick Start — GitHub deployment](https://docs.railway.com/quick-start)
- [Railway Config as Code](https://docs.railway.com/config-as-code)
- [Railway Config as Code Reference](https://docs.railway.com/config-as-code/reference)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
