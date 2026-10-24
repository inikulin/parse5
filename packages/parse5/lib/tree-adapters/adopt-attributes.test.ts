import { it, expect } from 'vitest';
import { parse, defaultTreeAdapter, html, type DefaultTreeAdapterMap, type TreeAdapter } from 'parse5';

type Element = DefaultTreeAdapterMap['element'];

it('merges repeated <html> attributes without rereading the merged list', () => {
    const n = 512;
    let reads = 0;
    const treeAdapter: TreeAdapter<DefaultTreeAdapterMap> = {
        ...defaultTreeAdapter,
        createElement(tagName, namespaceURI, attrs) {
            const counted = new Proxy(attrs, {
                get(target, key, receiver): unknown {
                    if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
                    return Reflect.get(target, key, receiver);
                },
            });
            return defaultTreeAdapter.createElement(tagName, namespaceURI, tagName === 'html' ? counted : attrs);
        },
    };
    const document = parse(Array.from({ length: n }, (_, i) => `<html a${i}=v>`).join(''), { treeAdapter });
    expect(reads).toBeLessThan(4 * n);
    expect((document.childNodes[0] as Element).attrs).toHaveLength(n);
});

it.each<[string, (element: Element) => void, string]>([
    [
        'an attribute is added to the list',
        (element): void => {
            element.attrs.push({ name: 'c', value: '0' });
        },
        'a=1 b=2 c=0 d=3',
    ],
    [
        'the list is replaced',
        (element): void => {
            element.attrs = [
                { name: 'a', value: '0' },
                { name: 'c', value: '0' },
            ];
        },
        'a=0 c=0 d=3',
    ],
    [
        'an entry becomes a hole',
        (element): void => {
            delete element.attrs[0];
        },
        'b=2 a=3 c=3 d=3',
    ],
    [
        'a merge that repeats a name and a removal',
        (element): void => {
            defaultTreeAdapter.adoptAttributes(element, [
                { name: 'c', value: '1' },
                { name: 'c', value: '2' },
                { name: 'd', value: '1' },
            ]);
            element.attrs.pop();
        },
        'a=1 b=2 c=1 c=2 d=3',
    ],
])('adopts only the attributes the list lacks after %s', (_name, edit, expected) => {
    const element = defaultTreeAdapter.createElement('html', html.NS.HTML, [{ name: 'a', value: '1' }]);
    defaultTreeAdapter.adoptAttributes(element, [{ name: 'b', value: '2' }]);
    edit(element);
    defaultTreeAdapter.adoptAttributes(element, [
        { name: 'a', value: '3' },
        { name: 'c', value: '3' },
        { name: 'd', value: '3' },
    ]);
    // One row leaves a hole in the list, which the merge skips.
    expect(
        element.attrs
            .filter((attr) => attr !== undefined)
            .map(({ name, value }) => `${name}=${value}`)
            .join(' '),
    ).toBe(expected);
});

it('leaves a list alone when it is merged into itself', () => {
    const element = defaultTreeAdapter.createElement('html', html.NS.HTML, [{ name: 'a', value: '1' }]);
    defaultTreeAdapter.adoptAttributes(element, [{ name: 'b', value: '2' }]);
    // A renamed entry is unknown to the cache; merging the list into itself must not append it to itself.
    element.attrs[1].name = 'c';
    defaultTreeAdapter.adoptAttributes(element, element.attrs);
    expect(element.attrs.map(({ name, value }) => `${name}=${value}`).join(' ')).toBe('a=1 c=2');
});
