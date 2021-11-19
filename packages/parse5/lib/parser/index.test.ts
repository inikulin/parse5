import * as assert from 'node:assert';
import * as parse5 from '../index.js';
import { Parser } from './index.js';
import { generateParsingTests } from '../../../../test/utils/generate-parsing-tests.js';
import { treeAdapters } from '../../../../test/utils/common.js';
import { NAMESPACES as NS } from '../common/html.js';

const origParseFragment = Parser.prototype.parseFragment;

generateParsingTests('parser', 'Parser', { skipFragments: false }, (test, opts) => ({
    node: test.fragmentContext
        ? parse5.parseFragment(test.fragmentContext, test.input, opts)
        : parse5.parse(test.input, opts),
}));

describe('parser', () => {
    it('Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)', () => {
        const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
        const document: any = parse5.parse(html, { treeAdapter: treeAdapters.htmlparser2 });

        assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
    });

    describe('Regression - Incorrect arguments fallback for the parser.parseFragment (GH-82, GH-83)', () => {
        beforeEach(() => {
            Parser.prototype.parseFragment = function (html, fragmentContext) {
                return {
                    html,
                    fragmentContext,
                    options: this.options,
                };
            };
        });

        afterEach(() => {
            Parser.prototype.parseFragment = origParseFragment;
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
            assert.ok(!args.options.sourceCodeLocationInfo);
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
            }) as any;

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
});
