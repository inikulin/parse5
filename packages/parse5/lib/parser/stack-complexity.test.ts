import { it, expect } from 'vitest';
import { Parser } from './index.js';

function countOpenStackReads(html: string): number {
    const parser = new Parser();
    let reads = 0;
    const handler = {
        get(target: unknown[], key: string | symbol): unknown {
            if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
            return Reflect.get(target, key);
        },
    };
    parser.openElements.items = new Proxy(parser.openElements.items, handler);
    parser.openElements.tagIDs = new Proxy(parser.openElements.tagIDs, handler);
    parser.tokenizer.write(html, true);
    return reads;
}

const n = 1024;

it.each([
    ['after select', '<span>'.repeat(256) + '<select></select>'.repeat(n)],
    ['in select', `${'<span>'.repeat(256)}<select>${'<template></template>'.repeat(n)}`],
])('reads one open-stack entry per element passed when resetting the insertion mode %s', (_name, html) => {
    // Each token resets the mode past 256 `span`s; it reads only their tags, as no `span` selects a mode.
    expect(countOpenStackReads(html)).toBeLessThan(384 * n);
});
