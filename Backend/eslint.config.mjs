// eslint.config.ts (ESM Flat Config)
// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // أساسيات
  {
    ignores: ['eslint.config.*', 'dist/**', 'coverage/**', '*.log'],
  },

  // Recommended أساسيات JS
  eslint.configs.recommended,

  // TypeScript: قواعد موصى بها + type-checked
  ...tseslint.configs.recommendedTypeChecked,

  // تعطيل القواعد المتعارضة مع Prettier (بديل recommended preset)
  eslintConfigPrettier,

  // قواعد افتراضية (للجميع)
  {
    languageOptions: {
      parserOptions: {
        // Project Service = Type-aware lint بدون تحديد project يدويًا
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript أفضل ممارسات
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',

      // جودة عامة
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 30],

      // أرقام سحرية — قائمة بيضاء واقعية + شجع على الثوابت
      'no-magic-numbers': [
        'warn',
        {
          ignore: [
            -1, 0, 1, 2, 3, 5, 7, 8, 10, 12, 15, 20, 24, 30, 60, 100,
            200, 201, 204, 301, 302, 304, 307, 308, 400, 401, 403, 404, 409, 412, 415, 422, 429, 500, 502, 503, 504,
          ],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: true,
        },
      ],

      // ترتيب الاستيراد
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // Prettier كقاعدة ليفشل الـ CI عند اختلاف التنسيق
      'prettier/prettier': 'warn',


      // الـ console: اسمح بالتحذير/الخطأ افتراضيًا
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // تشديد على سورس التطبيق فقط
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'max-lines-per-function': [
        'warn',
        {
          max: 90,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
    },
  },

  // تخفيف للملفات الكبيرة/الbootstrap/السكربتات
  {
    files: [
      'src/main.ts',
      'src/**/bootstrap*.ts',
      'src/**/swagger*.ts',
      'scripts/**',
      'migrations/**',
      'tools/**',
    ],
    rules: {
      'max-lines-per-function': 'off',
      'no-console': 'off',
      'no-magic-numbers': 'off',
    },
  },

  // الاختبارات: اسمح بأمور أكثر حرية
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    languageOptions: { globals: { ...globals.jest } }, // أو globals.vitest إن كنت تستخدم Vitest
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-magic-numbers': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // 2.1 سكربتات وأدوات (أخف قواعد)
  {
    files: ['scripts/**/*.{ts,js}', 'tools/**/*.{ts,js}'],
    languageOptions: {
      parserOptions: {
        allowDefaultProject: true, // مهم للـ JS وملفات خارج tsconfig
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      complexity: 'off',
    },
  },

  // 2.2 ملفات JS خالصة — عطّل قواعد TS عليها نهائيًا
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/*': 'off',
    },
  },

  // 2.3 الاختبارات — عطّل قواعد مزعجة ظهرت في اللوج
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.{ts,js}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      complexity: 'off',
    },
  },
);
