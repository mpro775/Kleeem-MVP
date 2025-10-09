// eslint.config.mjs
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jestPlugin from 'eslint-plugin-jest';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

// Ensure TS type-checked rules only run on TS files
const tsTypeChecked = tseslint.configs.recommendedTypeChecked.map((cfg) => ({
  ...cfg,
  files: ['**/*.ts', '**/*.tsx'],
}));

export default tseslint.config(
  // تجاهل مجلدات البناء والتقارير
  {
    ignores: [
      'eslint.config.*',
      'dist/**',
      'coverage/**',
      '*.log',
      'jest*.config.*',
    ],
  },

  // قواعد JS الافتراضية
  js.configs.recommended,

  // قواعد TS مع type-check (محصورة بملفات TS فقط)
  ...tsTypeChecked,

  // إطفاء التعارضات مع Prettier
  eslintConfigPrettier,

  // القاعدة العامة للمشروع
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
      globals: { ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
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

      // ممنوع default exports في NestJS modules/services
      'no-restricted-exports': [
        'error',
        {
          restrictedNamedExports: [],
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],

      'prettier/prettier': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // ملفات src: تشديد بعض القواعد
  {
    files: ['src/**/*.ts'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'max-lines-per-function': [
        'warn',
        { max: 90, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
    },
  },

  // قواعد TS عامة (لكل ملفات TS)
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: false },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },

  // سكربتات وأدوات
  {
    files: [
      'scripts/*.{ts,js}',
      'scripts/**/*.{ts,js}',
      'tools/*.{ts,js}',
      'tools/**/*.{ts,js}',
    ],
    languageOptions: {
      parserOptions: { allowDefaultProject: true }, // بدون type-check ثقيل
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
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

  // سكربتات JS فقط: عطّل Project Service تماماً
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      parserOptions: { allowDefaultProject: true, projectService: false },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: { '@typescript-eslint/*': 'off' },
  },

  // ✅ أوفررايد واحد واضح للاختبارات + بيئة Jest
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    plugins: { jest: jestPlugin, '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...jestPlugin.environments.globals.globals },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-magic-numbers': 'off',
      'no-console': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      complexity: 'off',
    },
  },

  // ملفات إعدادات الجذر (مثل jest*.js): اسمح بدون Project Service
  {
    files: ['*.config.js', '*.config.mjs', 'jest*.js', 'jest-*.js'],
    languageOptions: {
      parserOptions: { allowDefaultProject: true, projectService: false },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: { '@typescript-eslint/*': 'off' },
  },

  // ملفات JS فقط: طفي قواعد TS
  {
    files: ['**/*.js'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: { '@typescript-eslint/*': 'off' },
  },
);
