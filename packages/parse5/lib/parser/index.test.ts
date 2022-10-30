import * as assert from 'node:assert';
import { parseFragment, parse } from 'parse5';
import { jest } from '@jest/globals';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';

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
    })
);

generateParsingTests(
    'parser upstream',
    'Parser',
    {
        withoutErrors: true,
        suitePath: new URL('../../../../test/data/html5lib-tests/tree-construction', import.meta.url),
        expectErrors: ['0.search-element', '1.search-element'],
    },
    (test, opts) => ({
        node: test.fragmentContext ? parseFragment(test.fragmentContext, test.input, opts) : parse(test.input, opts),
    })
);

describe('parser', () => {
    it('Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)', () => {
        const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
        const document = parse(html, { treeAdapter: treeAdapters.htmlparser2 });

        assert.ok(treeAdapters.htmlparser2.isDocumentTypeNode(document.childNodes[0]));
        assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
    });

    describe("Regression - Don't inherit from Object when creating collections (GH-119)", () => {
        beforeEach(() => {
            /*eslint-disable no-extend-native*/
            // @ts-expect-error Adding unknown prototype method
            Object.prototype.heyYo = 123;
            /*eslint-enable no-extend-native*/
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
            assert.strictEqual(treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0]).length, 1);
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
        const onParseError = jest.fn();
        parse('<!doctype html><noscript>foo</noscript\r\n>', { onParseError });

        expect(onParseError).not.toHaveBeenCalled();
    });

    describe('Tree adapters', () => {
        it('should support onItemPush and onItemPop', () => {
            const onItemPush = jest.fn();
            const onItemPop = jest.fn();
            const document = parse('<p><p>', {
                treeAdapter: {
                    ...treeAdapters.default,
                    onItemPush,
                    onItemPop,
                },
            });

            const htmlElement = document.childNodes[0];
            assert.ok(treeAdapters.default.isElementNode(htmlElement));
            const bodyElement = htmlElement.childNodes[1];
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
});
