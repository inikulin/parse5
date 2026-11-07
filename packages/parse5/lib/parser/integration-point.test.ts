import { it, expect } from 'vitest';
import { parse, parseFragment, Parser, html, defaultTreeAdapter, type TreeAdapter } from 'parse5';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';

it.each(Object.entries(treeAdapters) as [string, TreeAdapter][])(
    'only reads integration-point attributes for MathML annotation-xml (%s)',
    (_name, adapter) => {
        let reads = 0;
        const treeAdapter: TreeAdapter = {
            ...adapter,
            getAttrList(element) {
                reads++;
                return adapter.getAttrList(element);
            },
        };
        parse('<svg a="1"><a></a><desc><b></b></desc></svg><math><mi><b></b></mi></math>', { treeAdapter });
        expect(reads).toBe(0);

        const element = adapter.createElement('annotation-xml', html.NS.MATHML, []);
        const encoded = adapter.createElement('annotation-xml', html.NS.MATHML, [
            { name: 'encoding', value: 'text/html' },
        ]);
        const parser = new Parser({ treeAdapter });
        expect(parser._isIntegrationPoint(html.TAG_ID.ANNOTATION_XML, element)).toBe(false);
        expect(parser._isIntegrationPoint(html.TAG_ID.ANNOTATION_XML, encoded)).toBe(true);
        expect(parser._isIntegrationPoint(html.TAG_ID.ANNOTATION_XML, encoded, html.NS.MATHML)).toBe(false);
        expect(reads).toBe(2);
    },
);

const encodedContext = defaultTreeAdapter.createElement('annotation-xml', html.NS.MATHML, [
    { name: 'encoding', value: 'text/html' },
]);

it.each([
    ['children of an HTML integration point', '<math><annotation-xml encoding=text/html>', '<i></i>', null],
    ['children of a plain annotation-xml', '<math><annotation-xml>', '<x></x>', null],
    ['p end tags', '<math><annotation-xml encoding=text/html>', '</p>', null],
    ['children of the fragment context', '', '<i></i>', encodedContext],
])('reads the attributes of an annotation-xml element once: %s', (_name, start, repeated, context) => {
    let reads = 0;
    const treeAdapter: TreeAdapter = {
        ...defaultTreeAdapter,
        getAttrList(element) {
            reads++;
            return defaultTreeAdapter.getAttrList(element);
        },
    };
    const input = start + repeated.repeat(8);

    if (context) parseFragment(context, input, { treeAdapter });
    else parse(input, { treeAdapter });

    expect(reads).toBe(1);
});

it.each(Object.entries(treeAdapters) as [string, TreeAdapter][])(
    'keeps the decision with the element across stack edits (%s)',
    (_name, adapter) => {
        let reads = 0;
        const treeAdapter: TreeAdapter = {
            ...adapter,
            getAttrList(element) {
                reads++;
                return adapter.getAttrList(element);
            },
        };
        const parser = new Parser({ treeAdapter });
        const stack = parser.openElements;
        const root = adapter.createElement('html', html.NS.HTML, []);
        const encoded = adapter.createElement('annotation-xml', html.NS.MATHML, [
            { name: 'encoding', value: 'text/html' },
        ]);
        const plain = adapter.createElement(
            'annotation-xml',
            html.NS.MATHML,
            Array.from({ length: 64 }, (_, i) => ({ name: `a${i}`, value: 'v' })),
        );
        stack.push(root, html.TAG_ID.HTML);
        stack.push(encoded, html.TAG_ID.ANNOTATION_XML);
        expect(parser.tokenizer.inForeignNode).toBe(false);
        stack.push(plain, html.TAG_ID.ANNOTATION_XML);
        expect(parser.tokenizer.inForeignNode).toBe(true);
        stack.pop();
        expect(parser.tokenizer.inForeignNode).toBe(false);
        stack.replace(encoded, plain);
        expect(parser._isIntegrationPoint(html.TAG_ID.ANNOTATION_XML, stack.current)).toBe(false);
        stack.push(encoded, html.TAG_ID.ANNOTATION_XML);
        stack.shortenToLength(2);
        expect(parser.tokenizer.inForeignNode).toBe(true);
        stack.push(encoded, html.TAG_ID.ANNOTATION_XML);
        stack.popAllUpToHtmlElement();
        stack.push(plain, html.TAG_ID.ANNOTATION_XML);
        expect(parser.tokenizer.inForeignNode).toBe(true);
        // Each element is read on its first check and again on the first check after it was popped.
        expect(reads).toBe(5);
    },
);

it('decides a fragment context afresh for each parser', () => {
    const context = defaultTreeAdapter.createElement('annotation-xml', html.NS.MATHML, []);
    expect(Parser.getFragmentParser(context).tokenizer.inForeignNode).toBe(true);
    defaultTreeAdapter.adoptAttributes(context, [{ name: 'encoding', value: 'text/html' }]);
    expect(Parser.getFragmentParser(context).tokenizer.inForeignNode).toBe(false);
});
