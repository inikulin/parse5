'use strict';

const assert = require('assert');
const parse5 = require('../lib');
const Parser = require('../lib/parser');
const generateParsingTests = require('../../../test/utils/generate-parsing-tests');
const { treeAdapters } = require('../../../test/utils/common');

generateParsingTests(exports, 'Parser', { skipFragments: false }, (test, opts) => ({
    node: test.fragmentContext
        ? parse5.parseFragment(test.fragmentContext, test.input, opts)
        : parse5.parse(test.input, opts)
}));

exports['Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)'] = function() {
    const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
    const document = parse5.parse(html, { treeAdapter: treeAdapters.htmlparser2 });

    assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
};

const origParseFragment = Parser.prototype.parseFragment;

exports['Regression - Incorrect arguments fallback for the parser.parseFragment (GH-82, GH-83)'] = {
    beforeEach() {
        Parser.prototype.parseFragment = function(html, fragmentContext) {
            return {
                html: html,
                fragmentContext: fragmentContext,
                options: this.options
            };
        };
    },

    afterEach() {
        Parser.prototype.parseFragment = origParseFragment;
    },

    test() {
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
    }
};

exports["Regression - Don't inherit from Object when creating collections (GH-119)"] = {
    beforeEach: function() {
        /*eslint-disable no-extend-native*/
        Object.prototype.heyYo = 123;
        /*eslint-enable no-extend-native*/
    },

    afterEach: function() {
        delete Object.prototype.heyYo;
    },

    test: function() {
        const fragment = parse5.parseFragment('<div id="123">', {
            treeAdapter: treeAdapters.htmlparser2
        });

        assert.strictEqual(treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0]).length, 1);
    }
};

exports['Regression - DOCTYPE empty fields (GH-236)'] = function() {
    const document = parse5.parse('<!DOCTYPE>');
    const doctype = document.childNodes[0];

    assert.strictEqual(doctype.name, '');
    assert.strictEqual(doctype.publicId, '');
    assert.strictEqual(doctype.systemId, '');
};
