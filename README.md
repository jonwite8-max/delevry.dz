# Delevry DZ — منصة التوصيل

نسخة Production Foundation لمنصة إدارة عمليات التوصيل، تعمل مع PostgreSQL وPrisma 7.

## التشغيل الإنتاجي
- Node.js 24
- PostgreSQL
- لا يوجد اعتماد على GitHub أثناء التشغيل.
- ملف البيئة الإنتاجي يُقرأ من `/var/www/delevry-dz/shared/.env` بواسطة `deployment/start.sh`.
- تشغيل الإنتاج يستخدم `.next/standalone/server.js`.

المتغيرات المطلوبة: `DATABASE_URL` و`AUTH_SECRET` (32 حرفًا على الأقل) و`APP_URL`.

## التطوير
`npm install`
`npm run db:generate`
`npm run typecheck`
`npm run lint`
`npm test`
`npm run build`

## الحساب الأول
يتم إنشاء الحساب الإداري فقط عند تشغيل seed مع تعيين `DEMO_ADMIN_PASSWORD` صراحةً. لا توجد كلمة مرور افتراضية داخل الكود.

## المعمارية
منطق الشحنات والحسابات التشغيلية يجب أن يبقى داخل طبقات Domain/Application، والواجهات تجمع المدخلات وتعرض النتائج فقط. قاعدة البيانات الحالية المستهدفة PostgreSQL.
