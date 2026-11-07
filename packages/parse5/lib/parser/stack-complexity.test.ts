import { it, expect } from 'vitest';
import { Parser } from './index.js';

/** Reads of the arrays of the stack of open elements while parsing `html`. */
function countOpenStackReads(html: string): number {
    const parser = new Parser();
    const stack = parser.openElements as unknown as Record<string, unknown>;
    let reads = 0;
    const handler = {
        get(target: unknown[], key: string | symbol): unknown {
            if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
            return Reflect.get(target, key);
        },
    };

    for (const [key, value] of Object.entries(stack)) {
        if (Array.isArray(value)) stack[key] = new Proxy(value, handler);
    }

    parser.tokenizer.write(html, true);
    return reads;
}

const n = 1024;
// 4n elements, followed by n tokens that each search the stack for a target that is not open or is behind a boundary.
const deep = (tagName: string): string => `<${tagName}>`.repeat(4 * n);

it.each([
    ['paragraph', deep('span') + '<div>'.repeat(n)],
    ['paragraph behind a button', `<p><button>${deep('span')}${'<div>'.repeat(n)}`],
    ['list item', deep('span') + '<li></li>'.repeat(n)],
    ['list item behind a table cell', `<li><table><tr><td>${deep('div')}${'<li></li>'.repeat(n)}`],
    ['description item', deep('span') + '<dd></dd>'.repeat(n)],
    ['unknown end tag', deep('span') + '</foo>'.repeat(n)],
    ['unknown end tag among unknown elements', deep('x-a') + '</x-b>'.repeat(n)],
    ['end tag behind a table cell', `<x-a><table><tr><td>${deep('x-b')}${'</x-a>'.repeat(n)}`],
    ['foreign end tag', `<svg>${deep('g')}${'</foo>'.repeat(n)}`],
    ['foreign end tag behind an HTML element', `<svg><foo><foreignObject><div><svg>${deep('g')}${'</foo>'.repeat(n)}`],
    ['end tag behind an integration point', `<svg><foreignObject>${deep('span')}${'</foo>'.repeat(n)}`],
    ['select reset behind an integration point', `<svg><foreignObject>${deep('span')}${'<select></select>'.repeat(n)}`],
    ['select reset', deep('span') + '<select></select>'.repeat(n)],
    ['select template reset', `${deep('span')}<select>${'<template></template>'.repeat(n)}`],
    ['table reset', deep('span') + '<table></table>'.repeat(n)],
    ['tables, rows and cells', deep('span') + '<table><tr><td></table>'.repeat(n)],
    ['table end tag in a select', `<table><caption><table><tr><td>${deep('div')}<select>${'</caption>'.repeat(n)}`],
    ['body end tag', deep('div') + '</body>x'.repeat(n)],
    ['adoption agency', `<b>${'<span><div>'.repeat(2 * n)}${'</b>'.repeat(2 * n)}`],
    [
        'adoption agency on alternating formatting elements',
        `<b>${'<span><div>'.repeat(n)}<i>${'<span><div>'.repeat(n)}${'</b></i>'.repeat(n)}`,
    ],
    ['a start tags over a deep a', `<a>${deep('div')}${'<a>'.repeat(n)}`],
    ['reconstruction of closed elements', '<i a=1>'.repeat(4 * n) + '<p><i a=1>x</p>'.repeat(n)],
])('reads the stack of open elements a constant number of times per token: %s', (_name, html) => {
    expect(countOpenStackReads(html)).toBeLessThan(256 * n);
});
