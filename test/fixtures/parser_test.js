'use strict';

const assert = require('assert');
const path = require('path');
const parse5 = require('../../lib');
const Parser = require('../../lib/parser');
const testUtils = require('../test_utils');

function getFullTestName(test) {
    return [
        'Parser(',
        test.dirName,
        ') - ',
        test.idx,
        '.',
        test.setName,
        ' - `',
        test.input,
        '` (line ',
        test.lineNum,
        ')'
    ].join('');
}

function assertFragmentParsing(input, fragmentContext, expected, opts) {
    const fragment = parse5.parseFragment(fragmentContext, input, opts);
    const actual = testUtils.serializeToTestDataFormat(fragment, opts.treeAdapter);
    const msg = testUtils.prettyPrintParserAssertionArgs(actual, expected);

    assert.strictEqual(actual, expected, msg);
}

function assertStreamingParsing(input, expected, opts) {
    const result = testUtils.parseChunked(input, opts);
    const actual = testUtils.serializeToTestDataFormat(result.document, opts.treeAdapter);
    let msg = testUtils.prettyPrintParserAssertionArgs(actual, expected, result.chunks);

    msg = 'STREAMING: ' + msg;

    assert.strictEqual(actual, expected, msg);
}

function assertParsing(input, expected, opts) {
    const document = parse5.parse(input, opts);
    const actual = testUtils.serializeToTestDataFormat(document, opts.treeAdapter);
    const msg = testUtils.prettyPrintParserAssertionArgs(actual, expected);

    assert.strictEqual(actual, expected, msg);
}

function assertErrors(actual, expected) {
    assert.deepEqual(actual.sort(), expected.sort());
}

testUtils.generateTestsForEachTreeAdapter(module.exports, (_test, treeAdapter) => {
    //Here we go..
    testUtils
        .loadTreeConstructionTestData(
            [
                path.join(__dirname, '../data/html5lib-tests/tree-construction'),
                path.join(__dirname, '../data/tree_construction_regression')
            ],
            treeAdapter
        )
        .forEach(test => {
            _test[getFullTestName(test)] = function() {
                let errs = [];

                const opts = {
                    scriptingEnabled: test.scriptingEnabled,
                    treeAdapter: treeAdapter,

                    onParseError: function(err) {
                        let errStr = '(' + err.startLine + ':' + err.startCol;

                        // NOTE: use ranges for token errors
                        if (err.startLine !== err.endLine || err.startCol !== err.endCol) {
                            errStr += '-' + err.endLine + ':' + err.endCol;
                        }

                        errStr += ') ' + err.code;

                        errs.push(errStr);
                    }
                };

                if (test.fragmentContext) {
                    assertFragmentParsing(test.input, test.fragmentContext, test.expected, opts);
                    assertErrors(errs, test.expectedErrors);
                } else {
                    assertStreamingParsing(test.input, test.expected, opts);
                    assertErrors(errs, test.expectedErrors);

                    errs = [];
                    assertParsing(test.input, test.expected, opts);
                    assertErrors(errs, test.expectedErrors);
                }
            };
        });
});

exports['Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)'] = function() {
    const html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>';
    const document = parse5.parse(html, { treeAdapter: parse5.treeAdapters.htmlparser2 });

    assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
};

const origParseFragment = Parser.prototype.parseFragment;

exports['Regression - Incorrect arguments fallback for the parser.parseFragment (GH-82, GH-83)'] = {
    beforeEach: function() {
        Parser.prototype.parseFragment = function(html, fragmentContext) {
            return {
                html: html,
                fragmentContext: fragmentContext,
                options: this.options
            };
        };
    },

    afterEach: function() {
        Parser.prototype.parseFragment = origParseFragment;
    },

    test: function() {
        const fragmentContext = parse5.treeAdapters.default.createElement('div');
        const html = '<script></script>';
        const opts = { locationInfo: true };

        let args = parse5.parseFragment(fragmentContext, html, opts);

        assert.strictEqual(args.fragmentContext, fragmentContext);
        assert.strictEqual(args.html, html);
        assert(args.options.locationInfo);

        args = parse5.parseFragment(html, opts);

        assert(!args.fragmentContext);
        assert.strictEqual(args.html, html);
        assert(args.options.locationInfo);

        args = parse5.parseFragment(html);

        assert(!args.fragmentContext);
        assert.strictEqual(args.html, html);
        assert(!args.options.locationInfo);
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
            treeAdapter: parse5.treeAdapters.htmlparser2
        });

        assert.strictEqual(parse5.treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0]).length, 1);
    }
};

exports['Regression - Fix empty stream parsing with ParserStream (GH-196)'] = function(done) {
    const parser = new parse5.ParserStream().once('finish', () => {
        assert(parser.document.childNodes.length > 0);
        done();
    });

    parser.end();
};
