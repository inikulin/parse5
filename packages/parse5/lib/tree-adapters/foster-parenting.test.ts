import { describe, it, expect } from 'vitest';
import { html, type TreeAdapter } from 'parse5';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';

describe.each(Object.entries(treeAdapters) as [string, TreeAdapter][])('%s', (name, adapter) => {
    it.each([
        ['elements', false],
        ['text', true],
    ])('does not scan preceding siblings when fostering %s', (_label, text) => {
        const parent = adapter.createDocumentFragment();
        for (let i = 0; i < 1000; i++) adapter.appendChild(parent, adapter.createCommentNode(''));
        const table = adapter.createElement('table', html.NS.HTML, []);
        adapter.appendChild(parent, table);
        let reads = 0;
        const children = new Proxy(adapter.getChildNodes(parent), {
            get(target, key, receiver): unknown {
                if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
                return Reflect.get(target, key, receiver);
            },
        });
        Object.assign(parent as object, name === 'default' ? { childNodes: children } : { children });
        if (text) adapter.insertTextBefore(parent, 'x', table);
        else adapter.insertBefore(parent, adapter.createElement('b', html.NS.HTML, []), table);
        expect(reads).toBeLessThan(10);
        expect(children).toHaveLength(1002);
        expect(children[1001]).toBe(table);
        expect(adapter.getParentNode(children[1000])).toBe(parent);
    });

    // A reference near the front must not require scanning following siblings.
    it('coalesces fostered text without scanning following siblings', () => {
        const parent = adapter.createDocumentFragment();
        adapter.insertText(parent, 'left');
        const table = adapter.createElement('table', html.NS.HTML, []);
        adapter.appendChild(parent, table);
        for (let i = 0; i < 1000; i++) adapter.appendChild(parent, adapter.createElement('div', html.NS.HTML, []));
        let reads = 0;
        const children = new Proxy(adapter.getChildNodes(parent), {
            get(target, key, receiver): unknown {
                if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
                return Reflect.get(target, key, receiver);
            },
        });
        Object.assign(parent as object, name === 'default' ? { childNodes: children } : { children });
        adapter.insertTextBefore(parent, 'X', table);
        expect(reads).toBeLessThan(10);
        expect(children).toHaveLength(1002);
        const first = children[0];
        expect(adapter.isTextNode(first) && adapter.getTextNodeContent(first)).toBe('leftX');
    });
});
