# 📐 مخططات معمارية Kaleem — C4 Diagrams (Mermaid)

> آخر تحديث: 2025-09-27 18:13
> تم التحديث ليعكس الواقع الحقيقي للمشروع

## 📋 نظرة عامة

يحتوي هذا المجلد على **التوثيق المفصل** لمخططات معمارية Kaleem المبنية على **منهجية C4** باستخدام **Mermaid**:

## 🗂️ **فهرس المخططات**

### 1. **Context Diagram** — السياق العام
**الملف**: [`context.md`](./context.md)
- **الغرض**: نظرة عالية المستوى على النظام والجهات المعنية
- **المحتوى**: المستخدمين، الأنظمة الخارجية، والحدود الرئيسية
- **الاستخدام**: فهم النظام ككل وتأثيره على البيئة المحيطة

### 2. **Container Diagram (Summary)** — الحاويات الرئيسية
**الملف**: [`container.md`](./container.md)
- **الغرض**: المكونات الرئيسية للنظام (containers)
- **المحتوى**: التطبيقات والخدمات الأساسية
- **الاستخدام**: فهم البنية التحتية الأساسية

### 3. **Container Diagram (Full Stack)** — المكدس الكامل
**الملف**: [`container-full.md`](./container-full.md)
- **الغرض**: جميع المكونات المرئية في Docker Compose
- **المحتوى**: جميع الخدمات والتبعيات
- **الاستخدام**: فهم شامل للبنية التحتية

### 4. **API Components Diagram** — مكونات API
**الملف**: [`api-components.md`](./api-components.md)
- **الغرض**: المودولات الرئيسية وآليات الحماية
- **المحتوى**: Controllers، Services، Guards، Interceptors
- **الاستخدام**: فهم معمارية API الداخلية

### 5. **Sequence Diagram** — تسلسل العمليات
**الملف**: [`sequence-wa.md`](./sequence-wa.md)
- **الغرض**: التدفق الديناميكي للرسائل
- **المحتوى**: WA → Evolution → API → Rabbit → Workers → Reply
- **الاستخدام**: فهم كيفية معالجة الرسائل

### 6. **Deployment View** — طريقة النشر
**الملف**: [`deployment.md`](./deployment.md)
- **الغرض**: البيئات والشبكات والمراقبة
- **المحتوى**: Dev/Stage/Prod + DMZ + Observability
- **الاستخدام**: فهم كيفية نشر ومراقبة النظام

## 🎨 **كيفية عرض المخططات**

### استخدام Mermaid CLI
```bash
# تثبيت Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# تحويل ملف واحد إلى SVG
mermaid -i container.md -o container.svg

# تحويل جميع الملفات
for file in *.md; do
  mermaid -i "$file" -o "${file%.md}.svg"
done
```

### عرض في المتصفح
```bash
# تشغيل خادم محلي للعرض
python3 -m http.server 8000
# أو
npx serve .
```

### في VS Code
```json
// settings.json
"mermaid-preview.source": "md"
```

## 🏗️ **معلومات تقنية**

### أدوات الرسم
- **Mermaid**: للرسوم البيانية النصية
- **C4 Model**: منهجية لتوثيق المعمارية
- **PlantUML**: بديل للـ diagrams المعقدة

### مستويات C4 المطبقة
1. **System Context**: النظام في سياقه
2. **Container**: المكونات الرئيسية
3. **Component**: المكونات الداخلية (API فقط)
4. **Code**: لم يُطبق (مستقبلي)

### ألوان وتنسيقات
- **أزرق**: خدمات التطبيق
- **أخضر**: قواعد البيانات والتخزين
- **أصفر**: خدمات خارجية
- **أحمر**: مناطق الأمان/الحماية
- **رمادي**: أدوات المراقبة

## 📚 **مراجع وموارد**

### توثيق C4
- [C4 Model Website](https://c4model.com/)
- [Structurizr](https://structurizr.com/) (أداة رسم C4)

### أدوات Mermaid
- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)

### CI/CD للـ Diagrams
```yaml
# في GitHub Actions
- name: Render Diagrams
  run: |
    for file in docs/**/*.md; do
      if grep -q "```mermaid" "$file"; then
        mermaid -i "$file" -o "${file%.md}.svg"
      fi
    done
```

## 🎯 **الفائدة من هذه المخططات**

### للمهندسين الجدد
- **فهم سريع** للبنية التحتية
- **تتبع التدفقات** المعقدة
- **تحديد النقاط الحرجة** للتطوير

### للمديرين الفنيين
- **تقييم المخاطر** المعمارية
- **تخطيط التوسع** المستقبلي
- **توثيق القرارات** التقنية

### للفريق ككل
- **تواصل موحد** حول المعمارية
- **تسهيل النقاشات** التقنية
- **توثيق التطور** المستمر للنظام

---

*جميع المخططات محدثة لتعكس الواقع الحقيقي لمشروع Kaleem AI*
