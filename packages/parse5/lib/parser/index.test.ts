import { it, assert, describe, beforeEach, afterEach } from 'vitest';
import { parseFragment, parse } from 'parse5';
import type { Element, TextNode } from '../tree-adapters/default.js';
import { generateParsingTests } from 'parse5-test-utils/dist/generate-parsing-tests.js';
import { treeAdapters } from 'parse5-test-utils/dist/common.js';
import { type DocumentType } from '../tree-adapters/default.js';
import { spy } from 'tinyspy';
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
        const doctype = document.childNodes[0] as DocumentType;

        assert.ok(Object.prototype.hasOwnProperty.call(doctype, 'name'));
        assert.equal(doctype.name, '');
        assert.ok(Object.prototype.hasOwnProperty.call(doctype, 'publicId'));
        assert.equal(doctype.publicId, '');
        assert.ok(Object.prototype.hasOwnProperty.call(doctype, 'systemId'));
        assert.equal(doctype.systemId, '');
    });

    it('Regression - CRLF inside </noscript> (GH-710)', () => {
        const onParseError = spy();
        parse('<!doctype html><noscript>foo</noscript\r\n>', { onParseError });

        assert.equal(onParseError.called, false);
    });

    describe('Tree adapters', () => {
        it('should support onItemPush and onItemPop', () => {
            const onItemPush = spy();
            const onItemPop = spy();
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
            assert.equal(onItemPush.callCount, 5);
            assert.deepEqual(onItemPush.calls[0], [htmlElement]);
            assert.deepEqual(onItemPush.calls[2], [bodyElement]);
            // The last opened element is the second p
            assert.deepEqual(onItemPush.calls[onItemPush.calls.length - 1], [bodyElement.childNodes[1]]);
            // The second p isn't closed, plus we never pop body and html. Alas, only 2 pop events (head and p).
            assert.equal(onItemPop.callCount, 2);
            // The last pop event should be the first p.
            assert.deepEqual(onItemPop.calls[onItemPop.calls.length - 1], [bodyElement.childNodes[0], bodyElement]);
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

            assert.equal(fragment.childNodes.length, 1);
            const r = fragment.childNodes[0] as Element;
            assert.equal(r.nodeName, 'r');
            assert.equal(r.childNodes.length, 3);
            assert.equal(
                r.childNodes.map((_) => _.nodeName),
                [tagName, 'b', '#text'],
            );

            const target = r.childNodes[0] as Element;
            assert.equal(target.childNodes.length, 1);
            assert.equal(target.childNodes[0].nodeName, '#text');
            assert.equal((target.childNodes[0] as TextNode).value, '<math id="');

            const b = r.childNodes[1] as Element;
            assert.equal(b.childNodes.length, 1);
            assert.equal(b.childNodes[0].nodeName, '#text');
            assert.equal((b.childNodes[0] as TextNode).value, 'should be outside');
        });
    });
});
