import eslintjs from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { configs as tseslintConfigs } from 'typescript-eslint';
import globals from 'globals';

const { configs: eslintConfigs } = eslintjs;

const sourceFiles = ['bench/**/*.js', 'scripts/**/*.ts', 'packages/*/lib/**/*.ts'];
const testFiles = ['test/**/*.{ts,js}'];
const ignoreFiles = [
    'test/data/html5lib-tests',
    'test/data/html5lib-tests-fork',
    'packages/*/dist/',
    'test/dist/',
    'docs/build/',
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
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',

            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
    },
    eslintConfigPrettier,
];
