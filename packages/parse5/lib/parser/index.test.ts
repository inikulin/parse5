import * as assert from 'node:assert';
import * as parse5 from 'parse5';
import { jest } from '@jest/globals';
import { Parser, ParserOptions } from './index.js';
import type { TreeAdapterTypeMap } from './../tree-adapters/interface.js';
import { generateParsingTests } from 'parse5-test-utils/utils/generate-parsing-tests.js';
import { treeAdapters } from 'parse5-test-utils/utils/common.js';
import { NAMESPACES as NS } from '../common/html.js';
import { isElementNode } from '../tree-adapters/default.js';

const origParseFragment = Parser.parseFragment;

generateParsingTests(
    'parser',
    'Parser',
    {
        expectErrors: [
            //NOTE: Foreign content behaviour was updated in the HTML spec.
            //The old test suite still tests the old behaviour.
            '269.foreign-fragment',
            '270.foreign-fragment',
            '307.foreign-fragment',
            '309.foreign-fragment',
            '316.foreign-fragment',
            '317.foreign-fragment',
        ],
    },
    (test, opts) => ({
        node: test.fragmentContext
            ? parse5.parseFragment(test.fragmentContext, test.input, opts)
            : parse5.parse(test.input, opts),
    })
);

generateParsingTests(
    'parser upstream',
    'Parser',
    {
        withoutErrors: true,
        suitePath: new URL('../../../../test/data/html5lib-tests/tree-construction', import.meta.url),
        expectErrors: ['505.search-element', '506.search-element'],
    },
    (test, opts) => ({
        node: test.fragmentContext
            ? parse5.parseFragment(test.fragmentContext, test.input, opts)
            : parse5.parse(test.input, opts),
    })
);

describe('parser', () => {
    it('Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)', () => {
        const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
        const document = parse5.parse(html, { treeAdapter: treeAdapters.htmlparser2 });

        assert.ok(treeAdapters.htmlparser2.isDocumentTypeNode(document.childNodes[0]));
        assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
    });

    describe('Regression - Incorrect arguments fallback for the parser.parseFragment (GH-82, GH-83)', () => {
        beforeEach(() => {
            Parser.parseFragment = function <T extends TreeAdapterTypeMap>(
                html: string,
                fragmentContext?: T['element'],
                options?: ParserOptions<T>
            ): {
                html: string;
                fragmentContext: T['element'] | null | undefined;
                options: ParserOptions<T> | undefined;
            } {
                return {
                    html,
                    fragmentContext,
                    options,
                };
            };
        });

        afterEach(() => {
            Parser.parseFragment = origParseFragment;
        });

        it('parses correctly', () => {
            const fragmentContext = treeAdapters.default.createElement('div', NS.HTML, []);
            const html = '<script></script>';
            const opts = { sourceCodeLocationInfo: true };

            let args: any = parse5.parseFragment(fragmentContext, html, opts);

            expect(args).toHaveProperty('fragmentContext', fragmentContext);
            expect(args).toHaveProperty('html', html);
            assert.ok(args.options.sourceCodeLocationInfo);

            args = parse5.parseFragment(html, opts);

            assert.ok(!args.fragmentContext);
            expect(args).toHaveProperty('html', html);
            assert.ok(args.options.sourceCodeLocationInfo);

            args = parse5.parseFragment(html);

            assert.ok(!args.fragmentContext);
            expect(args).toHaveProperty('html', html);
            assert.ok(!args.options);
        });
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
            const fragment = parse5.parseFragment('<div id="123">', {
                treeAdapter: treeAdapters.htmlparser2,
            });

            assert.ok(treeAdapters.htmlparser2.isElementNode(fragment.childNodes[0]));
            assert.strictEqual(treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0]).length, 1);
        });
    });

    it('Regression - DOCTYPE empty fields (GH-236)', () => {
        const document = parse5.parse('<!DOCTYPE>');
        const doctype = document.childNodes[0];

        expect(doctype).toHaveProperty('name', '');
        expect(doctype).toHaveProperty('publicId', '');
        expect(doctype).toHaveProperty('systemId', '');
    });

    describe('Tree adapters', () => {
        it('should support onItemPush and onItemPop', () => {
            const onItemPush = jest.fn();
            const onItemPop = jest.fn();
            const document = parse5.parse('<p><p>', {
                treeAdapter: {
                    ...treeAdapters.default,
                    onItemPush,
                    onItemPop,
                },
            });

            const htmlElement = document.childNodes[0];
            assert.ok(isElementNode(htmlElement));
            const bodyElement = htmlElement.childNodes[1];
            assert.ok(isElementNode(bodyElement));
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
