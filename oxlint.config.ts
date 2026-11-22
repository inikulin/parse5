import { defineConfig } from 'oxlint';

/**
 * Rules turned off (each group says why they do not fit this code).
 *
 * @param rules The names of the rules.
 * @returns The rules, each turned off.
 */
const off = (...rules: string[]): Record<string, 'off'> => Object.fromEntries(rules.map((rule) => [rule, 'off']));

export default defineConfig({
    plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'import', 'jsdoc', 'node', 'promise', 'vitest'],
    // Every rule, except those turned off below.
    categories: {
        correctness: 'error',
        suspicious: 'error',
        pedantic: 'error',
        perf: 'error',
        style: 'error',
        restriction: 'error',
    },
    options: { typeAware: true, reportUnusedDisableDirectives: 'error' },
    env: { node: true, es2022: true },
    ignorePatterns: ['test/data/', 'packages/*/dist/', 'test/dist/', 'docs/build/', 'coverage/'],
    rules: {
        eqeqeq: ['error', 'smart'],
        'no-undef': 'error',
        'no-useless-assignment': 'error',
        'one-var': ['error', 'never'],
        'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
        'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
        'prefer-destructuring': ['error', { object: true, array: false }],
        'capitalized-comments': [
            'error',
            'always',
            // (Lines continuing a comment continue its sentence.)
            { ignorePattern: 'oxfmt-ignore', ignoreConsecutiveComments: true },
        ],
        yoda: ['error', 'never'],
        curly: ['error', 'multi-line'],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'unicorn/numeric-separators-style': ['error', { hexadecimal: { onlyIfContainsSeparator: true } }],
        'typescript/explicit-function-return-type': ['error', { allowExpressions: true }],
        'typescript/no-non-null-assertion': 'warn',
        'typescript/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
        'typescript/switch-exhaustiveness-check': ['error', { considerDefaultExhaustiveForUnions: true }],
        // Keep implicit public members pending the repository's accessibility convention.
        ...off('typescript/explicit-member-accessibility'),
        // Existing state machines use compact branches, numeric states, sparse switches and indexed loops.
        ...off(
            'complexity',
            'max-depth',
            'default-case',
            'typescript/prefer-enum-initializers',
            'typescript/no-unsafe-enum-comparison',
            'typescript/no-unsafe-enum-assignment',
            'oxc/no-const-enum',
            'typescript/prefer-for-of',
            'no-multi-assign',
            'no-param-reassign',
        ),
        // Preserve parser truthiness checks, sentinel comparisons and legacy string operations.
        ...off(
            'typescript/strict-boolean-expressions',
            'typescript/prefer-nullish-coalescing',
            'no-eq-null',
            'unicorn/prefer-string-slice',
            'unicorn/prefer-string-replace-all',
            'unicorn/prefer-at',
            'eslint/prefer-object-has-own',
            'typescript/prefer-string-starts-ends-with',
        ),
        // Keep existing API names and implementation styles without rewriting the parser.
        ...off(
            'no-underscore-dangle',
            'class-methods-use-this',
            'typescript/parameter-properties',
            'typescript/prefer-readonly',
            'typescript/non-nullable-type-assertion-style',
            'typescript/no-unnecessary-type-assertion',
            'typescript/consistent-generic-constructors',
            'unicorn/prefer-single-call',
            'unicorn/consistent-function-scoping',
            'unicorn/no-array-sort',
            'func-names',
            'no-implicit-coercion',
            'no-shadow',
        ),
        // Preserve current documentation and module layout.
        ...off(
            'jsdoc/require-param',
            'jsdoc/require-returns',
            'jsdoc/empty-tags',
            'no-warning-comments',
            'import/no-namespace',
            'import/first',
            'import/max-dependencies',
            'require-unicode-regexp',
            'prefer-named-capture-group',
        ),
        // Node streams expose callback APIs.
        ...off('promise/prefer-await-to-callbacks'),
        // The parser uses numeric constants, bit flags and short local names.
        ...off('no-magic-numbers', 'no-bitwise', 'id-length'),
        // Text is encoded in UTF-16 code units.
        ...off('unicorn/prefer-code-point'),
        // The parser and tree adapters use null and undefined as distinct sentinel values.
        ...off('unicorn/no-null', 'no-undefined', 'unicorn/no-useless-undefined'),
        // Modern syntax and the runtime's features are fine.
        ...off(
            'oxc/no-async-await',
            'oxc/no-optional-chaining',
            'oxc/no-rest-spread-properties',
            'no-plusplus',
            'no-continue',
            'no-ternary',
            'no-nested-ternary',
            'unicorn/no-nested-ternary',
            'unicorn/no-array-reduce',
            'no-await-in-loop',
            'promise/avoid-new',
            'promise/prefer-await-to-then',
            'node/no-top-level-await',
            'node/no-sync',
            'import/no-nodejs-modules',
            'unicorn/import-style',
        ),
        // Async functions without `await` return their values and errors as promises.
        ...off('require-await', 'typescript/require-await'),
        // Sizes, and orders that do not follow the code's structure.
        ...off(
            'max-params',
            'max-statements',
            'max-lines',
            'max-lines-per-function',
            'max-classes-per-file',
            'unicorn/max-nested-calls',
            'sort-keys',
            'no-use-before-define',
            'no-inline-comments',
            'init-declarations',
        ),
        // Keep the existing import and export layout.
        ...off(
            'sort-imports',
            'import/consistent-type-specifier-style',
            'import/no-named-export',
            'import/no-default-export',
            'import/prefer-default-export',
            'import/group-exports',
            'import/exports-last',
            'import/no-relative-parent-imports',
        ),
        // Keep the existing spelling of hex literals.
        ...off('unicorn/number-literal-case'),
        // TypeScript has the types (and infers them for readonly values and assertions).
        ...off(
            'jsdoc/require-param-type',
            'jsdoc/require-returns-type',
            'jsdoc/require-yields-type',
            'jsdoc/require-throws-type',
            'typescript/prefer-readonly-parameter-types',
            'typescript/no-unsafe-type-assertion',
            'typescript/promise-function-async',
        ),
        // Method signatures, mapped types, `{}` and type aliases are chosen for how they check and infer.
        ...off(
            'typescript/method-signature-style',
            'typescript/consistent-indexed-object-style',
            'typescript/consistent-type-definitions',
            'typescript/ban-types',
        ),
        // Functions converting values declare the types they convert.
        ...off('unicorn/prefer-native-coercion-functions'),
        // Data-driven tests share helpers and use explicit boolean expectations.
        ...off(
            'vitest/prefer-expect-assertions',
            'vitest/require-test-timeout',
            'vitest/no-conditional-in-test',
            'vitest/no-importing-vitest-globals',
            'vitest/require-hook',
            'vitest/max-expects',
            'vitest/prefer-describe-function-title',
            'vitest/prefer-to-be-truthy',
            'vitest/prefer-to-be-falsy',
            'vitest/consistent-test-it',
            'vitest/prefer-lowercase-title',
            'vitest/require-top-level-describe',
            'vitest/prefer-each',
            'vitest/prefer-strict-equal',
            'vitest/require-mock-type-parameters',
            'vitest/prefer-to-have-length',
            'vitest/padding-around-test-blocks',
            'vitest/no-hooks',
        ),
    },
    overrides: [
        {
            // Keep compact dispatch branches in these state machines to preserve the emitted code.
            files: ['packages/parse5/lib/parser/open-element-stack.ts', 'packages/parse5/lib/tokenizer/index.ts'],
            rules: off('curly'),
        },
        {
            // Some parser switches select a subset of tags or tokens and ignore the rest.
            files: ['packages/parse5/lib/parser/index.ts'],
            rules: off('typescript/switch-exhaustiveness-check'),
        },
        {
            // Keep the separate type import in the emitted test utility declarations.
            files: ['test/utils/generate-tokenization-tests.ts'],
            rules: off('no-duplicate-imports', 'import/no-duplicates'),
        },
        {
            // The Promise adapter intentionally ignores the stream listener's cleanup function.
            files: ['test/utils/common.ts'],
            rules: off('no-promise-executor-return'),
        },
        {
            files: ['bench/**/*.js'],
            rules: off('no-console'),
        },
        {
            // The smoke script reports failures, calls receiver-free checks and ignores listener return values.
            files: ['scripts/smoke-test.js'],
            rules: off(
                'no-console',
                'unicorn/no-process-exit',
                'typescript/unbound-method',
                'typescript/strict-void-return',
            ),
        },
        {
            files: ['bench/perf/index.js'],
            // The benchmark compares implementations through dynamic JavaScript adapters.
            rules: off(
                'typescript/no-unsafe-argument',
                'typescript/no-unsafe-assignment',
                'typescript/no-unsafe-call',
                'typescript/no-unsafe-member-access',
                'typescript/no-unsafe-return',
            ),
        },
        {
            // The stream classes merge interfaces to describe their event overloads.
            files: [
                'packages/parse5-html-rewriting-stream/lib/index.ts',
                'packages/parse5-parser-stream/lib/index.ts',
                'packages/parse5-sax-parser/lib/index.ts',
            ],
            rules: off('typescript/no-unsafe-declaration-merging', 'typescript/explicit-module-boundary-types'),
        },
        {
            // Preserve legacy substr semantics in the HTML parser and SAX feedback simulator.
            files: [
                'packages/parse5/lib/parser/index.ts',
                'packages/parse5-sax-parser/lib/parser-feedback-simulator.ts',
            ],
            rules: off('typescript/no-deprecated'),
        },
        {
            // Fixture helpers register data-driven assertions that Oxlint cannot trace.
            files: ['**/*.test.ts', '**/test/**/*.ts', 'test/**/*.ts'],
            rules: off(
                'typescript/explicit-function-return-type',
                'typescript/explicit-module-boundary-types',
                'typescript/no-non-null-assertion',
                'typescript/strict-void-return',
                'vitest/expect-expect',
                'vitest/valid-title',
            ),
        },
    ],
});
