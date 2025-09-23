// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jestPlugin from 'eslint-plugin-jest';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // تجاهل مجلدات البناء والتقارير
  { ignores: ['eslint.config.*', 'dist/**', 'coverage/**', '*.log'] },

  // قواعد JS الافتراضية
  js.configs.recommended,

  // قواعد TS مع type-check
  ...tseslint.configs.recommendedTypeChecked,

  // إطفاء التعارضات مع Prettier
  eslintConfigPrettier,

  // القاعدة العامة للمشروع
  {
    languageOptions: {
      parserOptions: {
        // خلي ESLint يستخدم الـ Project Service (بدون tsconfigRootDir/‏project)
        projectService: true,
      },
      globals: { ...globals.node },
    },
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: false },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',

      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 30],

      'no-magic-numbers': [
        'warn',
        {
          ignore: [
            -1, 0, 1, 2, 3, 5, 7, 8, 10, 12, 15, 20, 24, 30, 60, 100, 200, 201,
            204, 301, 302, 304, 307, 308, 400, 401, 403, 404, 409, 412, 415,
            422, 429, 500, 502, 503, 504,
          ],
          ignoreArrayIndexes: true,
          enforceConst: true,
          detectObjects: true,
        },
      ],

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

      'prettier/prettier': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ملفات src: تشديد بعض القواعد
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'max-lines-per-function': [
        'warn',
        { max: 90, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },

  // سكربتات وأدوات
  {
    files: ['scripts/**/*.{ts,js}', 'tools/**/*.{ts,js}'],
    languageOptions: {
      parserOptions: { allowDefaultProject: true }, // بدون type-check ثقيل
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

  // ✅ أوفررايد واحد واضح للاختبارات + بيئة Jest
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    plugins: { jest: jestPlugin },
    languageOptions: {
      parserOptions: { projectService: true },
      globals: { ...jestPlugin.environments.globals.globals },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-magic-numbers': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      complexity: 'off',
    },
  },

  // ملفات JS فقط: طفي قواعد TS
  {
    files: ['**/*.js'],
    rules: { '@typescript-eslint/*': 'off' },
  },
);
