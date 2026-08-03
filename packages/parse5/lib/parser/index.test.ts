import { it, assert, describe, beforeEach, afterEach, vi, expect } from 'vitest';
import { parseFragment, parse } from 'parse5';
import type { Element, TextNode } from '../tree-adapters/default.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';
import type { Htmlparser2TreeAdapterMap } from 'parse5-htmlparser2-tree-adapter';

generateParsingTests(
    'parser',
    'Parser',
    {
        expectErrors: [
            //TODO(GH-448): Foreign content behaviour was updated in the HTML spec.
            //The old test suite still tests the old behaviour.
            '0.foreign-fragment',
            '1.foreign-fragment',
            '38.foreign-fragment',
            '40.foreign-fragment',
            '47.foreign-fragment',
            '48.foreign-fragment',
        ],
    },
    (test, opts) => ({
        node: test.fragmentContext ? parseFragment(test.fragmentContext, test.input, opts) : parse(test.input, opts),
    }),
);

generateParsingTests(
    'parser upstream',
    'Parser',
    {
        withoutErrors: true,
        suitePath: new URL('../../../../test/data/html5lib-tests/tree-construction', import.meta.url),
    },
    (test, opts) => ({
        node: test.fragmentContext ? parseFragment(test.fragmentContext, test.input, opts) : parse(test.input, opts),
    }),
);

describe('parser', () => {
    it('Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)', () => {
        const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
        const document = parse(html, { treeAdapter: treeAdapters.htmlparser2 });

        assert.ok(treeAdapters.htmlparser2.isDocumentTypeNode(document.childNodes[0]));
        assert.strictEqual(
            (document.childNodes[0] as Htmlparser2TreeAdapterMap['documentType']).data,
            '!DOCTYPE html SYSTEM "about:legacy-compat"',
        );
    });

    describe("Regression - Don't inherit from Object when creating collections (GH-119)", () => {
        beforeEach(() => {
            // @ts-expect-error Adding unknown prototype method
            Object.prototype.heyYo = 123;
        });

        afterEach(() => {
            // @ts-expect-error Deleting unknown prototype property
            delete Object.prototype.heyYo;
        });

        it('parses correctly', () => {
            const fragment = parseFragment('<div id="123">', {
                treeAdapter: treeAdapters.htmlparser2,
            });

            assert.ok(treeAdapters.htmlparser2.isElementNode(fragment.childNodes[0]));
            assert.strictEqual(
                treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0] as Htmlparser2TreeAdapterMap['element'])
                    .length,
                1,
            );
        });
    });

    it('Regression - DOCTYPE empty fields (GH-236)', () => {
        const document = parse('<!DOCTYPE>');
        const doctype = document.childNodes[0];

        expect(doctype).toHaveProperty('name', '');
        expect(doctype).toHaveProperty('publicId', '');
        expect(doctype).toHaveProperty('systemId', '');
    });

    it('Regression - CRLF inside </noscript> (GH-710)', () => {
        const onParseError = vi.fn();
        parse('<!doctype html><noscript>foo</noscript\r\n>', { onParseError });

        expect(onParseError).not.toHaveBeenCalled();
    });

    it('Regression - foreign end tag must not close an HTML element with a colliding tag id', () => {
        // `<svg desc>` is a foreign element whose lowercase name collides with the HTML
        // `desc` tag id. The "any other end tag" rule in body requires an HTML element,
        // so `</desc>` must be ignored and the open `<b>` must stay open and collect "y".
        const document = parse('<svg><desc><b>x</desc>y');

        const html = document.childNodes[0] as Element;
        const body = html.childNodes[1] as Element;
        const svg = body.childNodes[0] as Element;
        const desc = svg.childNodes[0] as Element;
        const b = desc.childNodes[0] as Element;

        expect(b.nodeName).toBe('b');
        expect(b.childNodes).toHaveLength(1);
        expect(b.childNodes[0].nodeName).toBe('#text');
        expect((b.childNodes[0] as TextNode).value).toBe('xy');
    });

    describe('Tree adapters', () => {
        it('should support onItemPush and onItemPop', () => {
            const onItemPush = vi.fn();
            const onItemPop = vi.fn();
            const document = parse('<p><p>', {
                treeAdapter: {
                    ...treeAdapters.default,
                    onItemPush,
                    onItemPop,
                },
            });

            const htmlElement = document.childNodes[0];
            assert.ok(treeAdapters.default.isElementNode(htmlElement));
            const bodyElement = (htmlElement as Element).childNodes[1] as Element;
            assert.ok(treeAdapters.default.isElementNode(bodyElement));
            // Expect 5 opened elements; in order: html, head, body, and 2x p
            expect(onItemPush).toHaveBeenCalledTimes(5);
            expect(onItemPush).toHaveBeenNthCalledWith(1, htmlElement);
            expect(onItemPush).toHaveBeenNthCalledWith(3, bodyElement);
            // The last opened element is the second p
            expect(onItemPush).toHaveBeenLastCalledWith(bodyElement.childNodes[1]);
            // The second p isn't closed, plus we never pop body and html. Alas, only 2 pop events (head and p).
            expect(onItemPop).toHaveBeenCalledTimes(2);
            // The last pop event should be the first p.
            expect(onItemPop).toHaveBeenLastCalledWith(bodyElement.childNodes[0], bodyElement);
        });
    });

    describe('rawtext parsing', () => {
        it.each([
            ['iframe'],
            ['noembed'],
            ['noframes'],
            ['noscript'],
            ['script'],
            ['style'],
            ['textarea'],
            ['title'],
            ['xmp'],
        ])('<%s>', (tagName) => {
            const html = `<r><${tagName}><math id="</${tagName}><b>should be outside</b>">`;
            const fragment = parseFragment(html);

            expect(fragment.childNodes.length).toBe(1);
            const r = fragment.childNodes[0] as Element;
            expect(r.nodeName).toBe('r');
            expect(r.childNodes).toHaveLength(3);
            expect(r.childNodes.map((_) => _.nodeName)).toEqual([tagName, 'b', '#text']);

            const target = r.childNodes[0] as Element;
            expect(target.childNodes).toHaveLength(1);
            expect(target.childNodes[0].nodeName).toBe('#text');
            expect((target.childNodes[0] as TextNode).value).toBe('<math id="');

            const b = r.childNodes[1] as Element;
            expect(b.childNodes).toHaveLength(1);
            expect(b.childNodes[0].nodeName).toBe('#text');
            expect((b.childNodes[0] as TextNode).value).toBe('should be outside');
        });
    });
});
