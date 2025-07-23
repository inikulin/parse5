import eslintjs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { configs as tseslintConfigs } from 'typescript-eslint';
import globals from 'globals';
import eslintUnicorn from 'eslint-plugin-unicorn-x';

const { configs: eslintConfigs } = eslintjs;

const sourceFiles = ['bench/**/*.js', 'scripts/**/*.ts', 'packages/*/lib/**/*.ts'];
const testFiles = ['test/**/*.{ts,js}', '**/*.test.ts'];
const ignoreFiles = [
    'test/data/html5lib-tests',
    'test/data/html5lib-tests-fork',
    'packages/*/dist/',
    'test/dist/',
    'docs/build/',
    'coverage/',
];
const allFiles = [...sourceFiles, ...testFiles];

export default [
    {
        files: allFiles,
    },
    {
        ignores: ignoreFiles,
    },
    {
        languageOptions: {
            globals: {
                ...globals.nodeBuiltin,
                ...globals.es2019,
            },
        },
    },
    eslintConfigs.recommended,
    ...tseslintConfigs.recommended,
    {
        rules: {
            'no-console': 'error',
            curly: ['error', 'all'],
            'prefer-arrow-callback': 'error',
            'one-var': ['error', 'never'],
            'no-var': 'error',
            'prefer-const': 'error',
            'object-shorthand': 'error',
            'prefer-destructuring': [
                'error',
                {
                    object: true,
                    array: false,
                },
            ],
            'prefer-template': 'error',
            'arrow-body-style': ['error', 'as-needed'],
        },
    },
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-declaration-merging': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',

            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    {
        files: testFiles,
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    eslintConfigPrettier,
    eslintUnicorn.configs.recommended,
    {
        rules: {
            'unicorn-x/no-null': 'off',
            'unicorn-x/prevent-abbreviations': 'off',
            'unicorn-x/prefer-string-slice': 'off',
            'unicorn-x/prefer-code-point': 'off',
            'unicorn-x/no-array-push-push': 'off',
            'unicorn-x/no-for-loop': 'off',
            'unicorn-x/consistent-destructuring': 'off',
            'unicorn-x/prefer-string-replace-all': 'off',
            'unicorn-x/prefer-at': 'off',
            'unicorn-x/number-literal-case': 'off',
            'unicorn-x/no-nested-ternary': 'off',
            'unicorn-x/consistent-function-scoping': 'off',
            'unicorn-x/prefer-switch': ['error', { emptyDefaultCase: 'do-nothing-comment' }],
            'unicorn-x/prefer-single-call': 'off',
        },
    },
];
