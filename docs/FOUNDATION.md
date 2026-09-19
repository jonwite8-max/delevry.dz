# Foundation v0.2

## الوحدات
Auth / Users / Permissions / Shipments / Tracking / Customers / Merchants / CRM / Finance / Cash Ledger / Expenses / Partners / Audit / Reports.

## المعمارية
Presentation → API/Route → Application → Domain → Infrastructure → PostgreSQL.

الـRoute لا يحتوي Business Logic. عمليات الدخول وإنشاء الطرد وتغيير حالته تمر عبر Application Services، بينما قواعد الصلاحيات وانتقالات الحالات مملوكة لمحركات Domain مركزية.

## الطرد
reference + serialNumber + QR + operational status + financial status + status history.

## QR
الرابط العام فقط؛ لا توجد بيانات شخصية داخل QR.

## المصدر الواحد
لا يجوز إنشاء قاعدة أعمال بديلة داخل صفحة أو Component أو API Route. أي قاعدة مشتركة يجب أن تعيش في Domain/Application Engine وتُستخدم من جميع نقاط الاستدعاء.

## النشر
Next.js standalone + Node.js 24 + PostgreSQL محلي + Nginx. الإصدار اليدوي يكون ZIP نظيفاً بدون .env أو node_modules أو .next.

## بوابة الجودة
قبل كل release:
- lint
- typecheck
- unit tests
- production build
- تشغيل HTTP محلي
- اختبار HTTPS عبر Nginx
- التحقق من migrations وعدم استخدام db push في الإنتاج

## المرحلة التالية
Operations: صفحة تفاصيل الطرد، التتبع المرتبط بقاعدة البيانات، QR/labels، العملاء والتجار، ثم محركات Finance/Cash/Debt/Payments وAudit/Reports بنفس قاعدة المصدر الواحد.
