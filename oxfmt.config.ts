import { defineConfig } from 'oxfmt';

export default defineConfig({
    printWidth: 120,
    tabWidth: 4,
    singleQuote: true,
    trailingComma: 'all',
    sortImports: false,
    sortPackageJson: false,
    ignorePatterns: ['packages/*/dist/', 'test/dist/', 'docs/', 'coverage/', 'test/data/html5lib-tests*/'],
});
