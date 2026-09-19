# Delevry DZ — منصة التوصيل

نسخة Foundation أولى للمنصة: لوحة تحكم RTL، طرود، عملاء، تجار، تتبع عام، QR، مالية، مصاريف، شركاء وتقارير.

## التشغيل
1. Node.js 24.
2. انسخ \`.env.example\` إلى \`.env\`.
3. ضع \`DATABASE_URL\` و\`APP_URL\` و\`AUTH_SECRET\`.
4. \`npm install\`
5. \`npm run db:generate\`
6. \`npm run db:migrate -- --name foundation_v1\`
7. \`npm run db:seed\`
8. \`npm run dev\`

الدخول الأول: \`admin@delevry.dz\` وكلمة المرور المحددة في \`DEMO_ADMIN_PASSWORD\`.

## QR والتتبع
كل طرد يملك مرجعاً ورقماً تسلسلياً. الـQR يقود إلى \`/tracking?ref=<reference>\` ولا يحمل بيانات شخصية.

## ملاحظة هندسية
هذه Foundation فعلية قابلة للبناء، لكن لا نعتبر العمليات التجارية والمالية Production Ready قبل تشغيل الاختبارات، ربط كل الكتابات بالمحركات المركزية، وتطبيق الصلاحيات والتدقيق والمعاملات المالية الكاملة.