// eslint.config.ts (ESM Flat Config)
// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // أساسيات
  {
    ignores: ['eslint.config.*', 'dist/**', 'coverage/**', '*.log'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,

  // قواعد افتراضية (للجميع)
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      // TypeScript أفضل ممارسات
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: false },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // جودة عامة
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 30],

      // لا تُعِق التطوير: اسمح بأي في مناطق معيّنة (سنخفف بالـ overrides)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',

      // أرقام سحرية — قائمة بيضاء واقعية + شجع على الثوابت
      'no-magic-numbers': [
        'warn',
        {
          ignore: [
            -1, 0, 1, 2, 3, 5, 7, 8, 10, 12, 15, 20, 24, 30, 60, 100,
            // أكواد HTTP الشائعة
            200, 201, 204, 301, 302, 304, 307, 308, 400, 401, 403, 404, 409,
            412, 415, 422, 429, 500, 502, 503, 504,
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
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // الـ console: اسمح بالتحذير/الخطأ افتراضيًا
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // تشديد على سورس التطبيق فقط
  {
    files: ['src/**/*.ts'],
    rules: {
      // اجعلها أدق في src
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // حد الأسطر لكل دالة: سقف عملي + تجاهل بعض الحالات الشائعة
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
    languageOptions: { globals: { ...globals.jest } },
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
);
