import { it, expect } from 'vitest';
import { Parser } from 'parse5';

it.each([
    ['EOF', false],
    ['end tags', true],
])('uses linear work on the template-mode stack (%s)', (_label, close) => {
    const parser = new Parser();
    let reads = 0;
    parser.tmplInsertionModeStack = new Proxy(parser.tmplInsertionModeStack, {
        get(target, key, receiver): unknown {
            if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
            return Reflect.get(target, key, receiver);
        },
    });
    parser.tokenizer.write('<template>'.repeat(128) + (close ? '</template>'.repeat(128) : ''), true);
    expect(reads).toBeLessThan(1024);
    expect(parser.tmplInsertionModeStack).toHaveLength(0);
});
