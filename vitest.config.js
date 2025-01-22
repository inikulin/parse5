/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import path from 'node:path';
import { readdirSync } from 'node:fs';

const alias = [
    { find: /^(parse5[^/]*)\/dist\/(.*?)(?:\.js)?$/, replacement: path.resolve('./packages/$1/lib/$2') },
    { find: /^(parse5[^/]*)$/, replacement: path.resolve('./packages/$1/lib/index.ts') },
    { find: /parse5-test-utils\/(.*?)/, replacement: path.resolve('./test/$1') },
];
const packages = readdirSync('./packages');

export default defineConfig({
    test: {
        include: ['**/*.test.ts'],
        workspace: packages.map((name) => ({
            test: {
                name,
                root: `packages/${name}`,
                alias,
            },
        })),
        coverage: {
            clean: true,
            include: ['packages'],
            exclude: ['**/dist/**'],
        },
    },
});
