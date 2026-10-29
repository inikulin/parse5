import { it, expect } from 'vitest';
import { Parser, parse, html, type TreeAdapter, type TreeAdapterTypeMap } from 'parse5';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';

const adapters = Object.entries(treeAdapters) as unknown as [string, TreeAdapter][];
const n = 512;

/** Counts the index reads and writes on a node's array of children, whose name differs between the adapters. */
function countIndexAccess(parent: TreeAdapterTypeMap['parentNode'], counts: { reads: number; writes: number }): void {
    const node = parent as unknown as Record<string, unknown[]>;
    const key = 'childNodes' in node ? 'childNodes' : 'children';
    const isIndex = (property: string | symbol): boolean => typeof property === 'string' && /^\d+$/.test(property);

    node[key] = new Proxy(node[key], {
        get(target, property, receiver): unknown {
            if (isIndex(property)) counts.reads++;

            return Reflect.get(target, property, receiver);
        },
        set(target, property, value): boolean {
            if (isIndex(property)) counts.writes++;

            return Reflect.set(target, property, value);
        },
    });
}

it.each(adapters)('detaches the last child and any other child (%s)', (_name, treeAdapter) => {
    const parent = treeAdapter.createElement('div', html.NS.HTML, []);
    const children = ['a', 'b', 'c'].map((tagName) => treeAdapter.createElement(tagName, html.NS.HTML, []));

    for (const child of children) treeAdapter.appendChild(parent, child);

    treeAdapter.detachNode(children[2]);
    expect(treeAdapter.getChildNodes(parent)).toEqual([children[0], children[1]]);
    treeAdapter.detachNode(children[0]);
    expect(treeAdapter.getChildNodes(parent)).toEqual([children[1]]);
    expect(children.map((child) => treeAdapter.getParentNode(child))).toEqual([null, parent, null]);

    const remaining: unknown = children[1];

    if (typeof remaining === 'object' && remaining !== null && 'prev' in remaining && 'next' in remaining) {
        expect([remaining.prev, remaining.next]).toEqual([null, null]);
    }
});

it.each(adapters)('moves a fragment out of its root without shifting the children (%s)', (_name, treeAdapter) => {
    const counts = { reads: 0, writes: 0 };
    const parser = Parser.getFragmentParser(null, { treeAdapter });

    parser.tokenizer.write('<a></a>'.repeat(n), true);
    countIndexAccess(treeAdapter.getFirstChild(parser.document) as TreeAdapterTypeMap['parentNode'], counts);
    const fragment = parser.getFragment();

    // One copy, one last-child check and one removal per child; a search from the front would read n²/2 entries.
    expect(treeAdapter.getChildNodes(fragment)).toHaveLength(n);
    expect(counts.reads).toBeLessThan(8 * n);
    expect(counts.writes).toBe(0);
});

it.each(adapters)("moves the furthest block's children without shifting them (%s)", (_name, treeAdapter) => {
    const counts = { reads: 0, writes: 0 };
    const adapter: TreeAdapter = {
        ...treeAdapter,
        createElement(tagName, namespaceURI, attrs): TreeAdapterTypeMap['element'] {
            const element = treeAdapter.createElement(tagName, namespaceURI, attrs);

            if (tagName === 'div') countIndexAccess(element, counts);

            return element;
        },
    };
    const document = parse(`<a><div>${'<span></span>'.repeat(n)}</a>`, { treeAdapter: adapter });
    const body = adapter.getChildNodes(adapter.getChildNodes(document)[0] as TreeAdapterTypeMap['parentNode'])[1];
    const div = adapter.getChildNodes(body as TreeAdapterTypeMap['parentNode'])[1] as TreeAdapterTypeMap['parentNode'];
    const newAnchor = adapter.getChildNodes(div)[0] as TreeAdapterTypeMap['parentNode'];

    // The spans are appended to the div while parsing; the adoption agency moves them into the new <a>, which it then
    // appends to the div.
    expect(adapter.getChildNodes(newAnchor)).toHaveLength(n);
    expect(counts.reads).toBeLessThan(8 * n);
    expect(counts.writes).toBe(n + 1);
});
