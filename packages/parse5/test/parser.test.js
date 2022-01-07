import assert from 'node:assert';
import * as parse5 from '../lib/index.js';
import { Parser } from '../lib/parser/index.js';
import { generateParsingTests } from '../../../test/utils/generate-parsing-tests.js';
import { treeAdapters } from '../../../test/utils/common.js';

const origParseFragment = Parser.prototype.parseFragment;

generateParsingTests('parser', 'Parser', { skipFragments: false }, (test, opts) => ({
    node: test.fragmentContext
        ? parse5.parseFragment(test.fragmentContext, test.input, opts)
        : parse5.parse(test.input, opts),
}));

suite('parser', () => {
    test('Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)', () => {
        const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
        const document = parse5.parse(html, { treeAdapter: treeAdapters.htmlparser2 });

        assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
    });

    suite('Regression - Incorrect arguments fallback for the parser.parseFragment (GH-82, GH-83)', () => {
        setup(() => {
            Parser.prototype.parseFragment = function (html, fragmentContext) {
                return {
                    html,
                    fragmentContext,
                    options: this.options,
                };
            };
        });

        teardown(() => {
            Parser.prototype.parseFragment = origParseFragment;
        });

        test('parses correctly', () => {
            const fragmentContext = treeAdapters.default.createElement('div');
            const html = '<script></script>';
            const opts = { sourceCodeLocationInfo: true };

            let args = parse5.parseFragment(fragmentContext, html, opts);

            assert.strictEqual(args.fragmentContext, fragmentContext);
            assert.strictEqual(args.html, html);
            assert(args.options.sourceCodeLocationInfo);

            args = parse5.parseFragment(html, opts);

            assert(!args.fragmentContext);
            assert.strictEqual(args.html, html);
            assert(args.options.sourceCodeLocationInfo);

            args = parse5.parseFragment(html);

            assert(!args.fragmentContext);
            assert.strictEqual(args.html, html);
            assert(!args.options.sourceCodeLocationInfo);
        });
    });

    suite("Regression - Don't inherit from Object when creating collections (GH-119)", () => {
        setup(() => {
            /*eslint-disable no-extend-native*/
            Object.prototype.heyYo = 123;
            /*eslint-enable no-extend-native*/
        });

        teardown(() => {
            delete Object.prototype.heyYo;
        });

        test('parses correctly', () => {
            const fragment = parse5.parseFragment('<div id="123">', {
                treeAdapter: treeAdapters.htmlparser2,
            });

            assert.strictEqual(treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0]).length, 1);
        });
    });

    test('Regression - DOCTYPE empty fields (GH-236)', () => {
        const document = parse5.parse('<!DOCTYPE>');
        const doctype = document.childNodes[0];

        assert.strictEqual(doctype.name, '');
        assert.strictEqual(doctype.publicId, '');
        assert.strictEqual(doctype.systemId, '');
    });
});
