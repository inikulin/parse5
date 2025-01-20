/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        include: ['**/*.test.ts'],
        workspace: ['packages/*'],
        coverage: {
            clean: true,
            exclude: ['./packages/*/dist', './scripts', './bench', './*.config.js'],
        },
    },
});
