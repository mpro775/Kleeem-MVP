// tools/extract-db-meta.ts
import {
  Project,
  SyntaxKind,
  PropertyAssignment,
  CallExpression,
} from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
project.addSourceFilesAtPaths('src/**/*.ts');

const JSON_INDENT_SPACES = 2;

type Field = {
  name: string;
  type: string;
  required?: boolean;
  index?: boolean;
  unique?: boolean;
  ref?: string;
};
type Model = { name: string; file: string; fields: Field[]; indexes: string[] };

const models: Model[] = [];

for (const sf of project.getSourceFiles()) {
  if (!sf.getFilePath().includes('/schemas/')) continue;

  // ابحث عن ملفات تحتوي على SchemaFactory.createForClass أو تعريفات @Schema
  const hasSchemaDecorator = sf
    .getDescendantsOfKind(SyntaxKind.Decorator)
    .some((decorator) => {
      const text = decorator.getText();
      return text.includes('@Schema');
    });

  const hasSchemaFactory = sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .some((call) => {
      const text = call.getText();
      return text.includes('SchemaFactory.createForClass');
    });

  if (!hasSchemaDecorator && !hasSchemaFactory) continue;

  const file = sf.getFilePath();

  // اسم الموديل (افتراض: export const/ class XYZSchema أو ModelName)
  const guessName = path.basename(file).replace('.schema.ts', '');
  const modelName = guessName.charAt(0).toUpperCase() + guessName.slice(1);

  const fields: Field[] = [];

  // ابحث عن class مع @Schema decorator
  const classes = sf.getDescendantsOfKind(SyntaxKind.ClassDeclaration);
  classes.forEach((cls) => {
    const decorators = cls.getDecorators();
    const hasSchemaDecorator = decorators.some((d) =>
      d.getText().includes('@Schema'),
    );

    if (hasSchemaDecorator) {
      // استخراج الحقول من الـ class
      const properties = cls.getProperties();
      properties.forEach((prop) => {
        const name = prop.getName();
        const decorators = prop.getDecorators();

        // ابحث عن @Prop decorator
        const propDecorator = decorators.find((d) =>
          d.getText().startsWith('@Prop'),
        );
        if (propDecorator) {
          let type = 'Mixed';
          let required = false;
          let unique = false;
          let index = false;
          let ref: string | undefined = undefined;

          // استخراج معلومات من @Prop decorator
          const decoratorText = propDecorator.getText();

          // استخراج النوع من TypeScript
          const typeNode = prop.getType();
          const typeText = typeNode.getText();
          if (typeText.includes('string')) type = 'String';
          else if (typeText.includes('number')) type = 'Number';
          else if (typeText.includes('boolean')) type = 'Boolean';
          else if (typeText.includes('Date')) type = 'Date';
          else if (typeText.includes('ObjectId')) type = 'ObjectId';
          else if (typeText.includes('Array')) type = 'Array';

          // استخراج خصائص من decorator
          required = decoratorText.includes('required: true');
          unique = decoratorText.includes('unique: true');
          index = decoratorText.includes('index: true');

          // استخراج ref
          const refMatch = /ref:\s*['"`](\w+)['"`]/.exec(decoratorText);
          if (refMatch) ref = refMatch[1];

          fields.push({ name, type, required, index, unique, ref });
        }
      });
    }
  });

  // ابحث عن تعريفات index() في نفس الملف
  const indexes: string[] = [];
  sf.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(
    (call: CallExpression) => {
      const callee = call.getExpression().getText();
      if (callee.endsWith('.index') || callee.includes('Schema.index')) {
        indexes.push(call.getText());
      }
    },
  );

  if (fields.length > 0) {
    models.push({ name: modelName, file, fields, indexes });
  }
}

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync(
  'artifacts/db-meta.json',
  JSON.stringify(
    { generatedAt: new Date().toISOString(), models },
    null,
    JSON_INDENT_SPACES,
  ),
);

// توليد Mermaid ERD مبسط
const erdLines: string[] = ['erDiagram'];
for (const m of models) {
  erdLines.push(`${m.name} {`);
  m.fields.forEach((f) =>
    erdLines.push(`  ${f.type} ${f.name} ${f.required ? 'PK?' : ''}`),
  );
  erdLines.push('}');
  // علاقات عبر ref
  m.fields
    .filter((f) => f.ref)
    .forEach((f) => {
      erdLines.push(`${m.name} }o--|| ${f.ref} : "${f.name}"`);
    });
}
fs.writeFileSync('artifacts/erd.mmd', erdLines.join('\n'));
// eslint-disable-next-line no-console
console.log('✅ Wrote artifacts/db-meta.json and artifacts/erd.mmd');
