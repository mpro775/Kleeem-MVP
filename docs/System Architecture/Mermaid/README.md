# Mermaid Diagrams — Kleem (Main Index)
**آخر تحديث:** 2025-08-16

تم تحديث هذه الصفحة لتتوافق مع **التقسيم الجديد** للمخططات: بدل ملف واحد مزدحم لمخطط الحاويات أو مكونات الـ API، أصبح لدينا **عدة مناظر (Views)** منظَّمة تقلّل التداخلات وتوضّح الطبقات.

---

## ما الجديد؟
- 🔄 **استبدال** مخطط الحاويات الفردي بــ 3 نسخ: كامل، داخلي فقط، وتنفيذي خفيف.
- 🧩 **تقسيم** مخطط مكونات الـ Backend API إلى مشاهد متعددة (Adapters→Application، Application→Infrastructure، Persistence)، إضافة إلى نسخة “Stacked” صفوفًا متراصّة.
- 🧱 **فصل** مخطط النشر إلى مخططين: بنية كاملة (stack) وعرض عمليات/أوبس (ops).
- 🎯 الهدف: تقليل تقاطع الأسهم وتزاحم العناصر في Mermaid مع الحفاظ على الدقّة.

---

## الملفات الحالية (Mermaid)
> ضع أيًا من هذه الملفات داخل كتلة \`\`\`mermaid\`\`\` في Markdown أو اعرضها عبر Mermaid Live/VSCode.

### 1) Context (عام)
- `context_diagram.mmd` ← **بدون تغيير** (نفس ملف السياق السابق).

### 2) Containers (بديل للنسخة القديمة `container_diagram.mmd`)
- `./container-full.mmd` — **كامل**: الأشخاص بالأعلى، Kleem بالوسط، الأنظمة الخارجية بالأسفل.
- `./container-internal.mmd` — **داخلي فقط**: بدون الأنظمة الخارجية (للمناقشات التقنية).
- `./container-exec-lite.mmd` — **تنفيذي خفيف**: تبسيط للعرض القيادي.

### 3) Backend API Components (بديل للنسخة القديمة `api_components_diagram.mmd`)
- `./backend-api-components.mmd` — **التجميعة الكاملة** بنمط Clean Architecture (Adapters / Application / Infrastructure / Persistence).
- **مشاهد مقسّمة لتقليل التداخل**:
  - `./backend-api-components-view1-adapters-app.mmd` — Adapters → Application
  - `./backend-api-components-view2-app-infra.mmd` — Application → Infrastructure
  - `./backend-api-components-view3-persistence.mmd` — Persistence
  - `./backend-api-components-stacked.mmd` — Stacked Lanes (كل طبقة في صف مستقل)

### 4) Infrastructure / Deployment (بديل للنسخة القديمة `deployment_diagram.mmd`)
- `../diagrams/infra-stack.mmd` — **البنية الكاملة** (Edge → Apps → Services → Data → Storage → Observability + شبكات frontnet/backnet).
- `../diagrams/infra-ops.mmd` — **عرض الأوبس** (Proxy/SSO/WAF/Backups/Observability).

> (اختياري) إذا لديك مخطط لـ n8n: أبقِ `n8n_components_diagram.mmd`، أو قسّمه لاحقًا إن لزم.

---

## لماذا عدة مناظر (Views)؟
Mermaid في المخططات الكبيرة قد ينتج **تقاطعات** مزعجة. الحل الأفضل:
- تقسيم المخطط الكبير إلى **مشاهد مركّزة** (اثنتان من الطبقات فقط بكل مرة).
- نسخة **Stacked** تجعل كل Boundary في **صف مستقل** فيقلّ التزاحم.

---

## أمثلة إدراج سريعة

### مثال — Container (Full)

```mermaid
%%{init: {"C4": {"theme": "base"}} }%%
%% انسخ محتوى ../diagrams/container-full.mmd هنا كما هو %%
```

### مثال — Backend API (View 1)

```mermaid
%%{init: {"C4": {"theme": "base"}} }%%
%% انسخ محتوى ../diagrams/backend-api-components-view1-adapters-app.mmd هنا %%
```

### مثال — Infrastructure (Stack)

```mermaid
%%{init: {"C4": {"theme": "base"}} }%%
%% انسخ محتوى ../diagrams/infra-stack.mmd هنا %%
```

> تذكير: في GitHub/GitLab/VSCode يمكنك لصق المحتوى مباشرة بين \`\`\`mermaid\`\`\` بدون الحاجة لروابط خارجية.

---

## خريطة استبدال الملفات (Old → New)

| الملف القديم | البديل الحالي |
|---|---|
| `container_diagram.mmd` | `../diagrams/container-full.mmd`, `container-internal.mmd`, `container-exec-lite.mmd` |
| `api_components_diagram.mmd` | `backend-api-components.mmd` + (views: `view1-adapters-app.mmd`, `view2-app-infra.mmd`, `view3-persistence.mmd`, `stacked.mmd`) |
| `deployment_diagram.mmd` | `infra-stack.mmd`, `infra-ops.mmd` |

> الملفات القديمة تعتبر **مؤرشفة/محذوفة** في هذا التوثيق لصالح التقسيم الجديد.

---

## نصائح منع التداخل في Mermaid
- استخدم في C4: `UpdateLayoutConfig($c4BoundaryInRow="1")` لجعل كل Boundary في صف منفصل.  
- جرّب `($c4ShapeInRow="2" أو "3")` لتوزيع الأشكال وزيادة المسافات.  
- اختصر نصوص الحواف (العلاقات) — انقل البروتوكول إلى Legend إن لزم.  
- اعتمد واجهات تجميع (Facades) مثل `VectorService` و`EventBus` بدل وصل كل خدمة بكل تبعية مباشرة.

---

## تحويل إلى صور (Export)
- **Mermaid Live Editor**: للصق المحتوى وتصديره PNG/SVG/PDF.
- **Mermaid CLI**: عبر `mmdc -i input.mmd -o output.svg`.
- في GitLab: يمكن تنزيل SVG مباشرة من العرض.

---

## صيانة وتحديث
1) عدّل ملف `.mmd` المطلوب.  
2) اختبره في Mermaid Live.  
3) حدِّث هذا المستند إذا غيّرت أسماء الملفات أو بنية المشاهد.  

> ملاحظة: احتفظنا بـ `context_diagram.mmd` كما هو. أي تغييرات عليه نضيفها لاحقًا ضمن نفس السياسة (ممكن أيضًا إنشاء سياق **Exec** خفيف).