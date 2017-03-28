'use strict';

var assert = require('assert'),
    path = require('path'),
    parse5 = require('../../lib'),
    Parser = require('../../lib/parser'),
    testUtils = require('../test_utils');

function getFullTestName(test) {
    return ['Parser(', test.dirName, ') - ', test.idx, '.', test.setName, ' - ', test.input].join('');
}

function assertFragmentParsing(input, fragmentContext, expected, opts) {
    var fragment = parse5.parseFragment(fragmentContext, input, opts),
        actual = testUtils.serializeToTestDataFormat(fragment, opts.treeAdapter),
        msg = testUtils.prettyPrintParserAssertionArgs(actual, expected);

    assert.strictEqual(actual, expected, msg);
}

function assertStreamingParsing(input, expected, opts) {
    var result = testUtils.parseChunked(input, opts),
        actual = testUtils.serializeToTestDataFormat(result.document, opts.treeAdapter),
        msg = testUtils.prettyPrintParserAssertionArgs(actual, expected, result.chunks);

    msg = 'STREAMING: ' + msg;

    assert.strictEqual(actual, expected, msg);
}

function assertParsing(input, expected, opts) {
    var document = parse5.parse(input, opts),
        actual = testUtils.serializeToTestDataFormat(document, opts.treeAdapter),
        msg = testUtils.prettyPrintParserAssertionArgs(actual, expected);

    assert.strictEqual(actual, expected, msg);
}

testUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    //Here we go..
    testUtils
        .loadTreeConstructionTestData([
            path.join(__dirname, '../../../html5lib-tests/tree-construction'),
            path.join(__dirname, '../data/tree_construction_regression')
        ], treeAdapter)
        .forEach(function (test) {
            _test[getFullTestName(test)] = function () {
                var errs = [],
                    opts = {
                        treeAdapter: treeAdapter,
                        onParseError: function (err) {
                            var errStr = '(' + err.startLine + ':' + err.startCol +
                                         '-' + err.endLine + ':' + err.encCol + ') ' +
                                         err.code;

                            errs.push(errStr);
                        }
                    };

                if (test.fragmentContext) {
                    assertFragmentParsing(test.input, test.fragmentContext, test.expected, opts);
                    assert.deepEqual(errs, test.expectedErrors);
                }
                else {
                    assertStreamingParsing(test.input, test.expected, opts);
                    assert.deepEqual(errs, test.expectedErrors);

                    errs = [];
                    assertParsing(test.input, test.expected, opts);
                    assert.deepEqual(errs, test.expectedErrors);
                }
            };
        });
});


exports['Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)'] = function () {
    var html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>',
        document = parse5.parse(html, {treeAdapter: parse5.treeAdapters.htmlparser2});

    assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
};

var origParseFragment = Parser.prototype.parseFragment;

exports['Regression - Incorrect arguments fallback for the parser.parseFragment (GH-82, GH-83)'] = {
    beforeEach: function () {
        Parser.prototype.parseFragment = function (html, fragmentContext) {
            return {
                html: html,
                fragmentContext: fragmentContext,
                options: this.options
            };
        };
    },

    afterEach: function () {
        Parser.prototype.parseFragment = origParseFragment;
    },

    test: function () {
        var fragmentContext = parse5.treeAdapters.default.createElement('div'),
            html = '<script></script>',
            opts = {locationInfo: true};

        var args = parse5.parseFragment(fragmentContext, html, opts);

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
    beforeEach: function () {
        /*eslint-disable no-extend-native*/
        Object.prototype.heyYo = 123;
        /*eslint-enable no-extend-native*/
    },

    afterEach: function () {
        delete Object.prototype.heyYo;
    },

    test: function () {
        var fragment = parse5.parseFragment('<div id="123">', {treeAdapter: parse5.treeAdapters.htmlparser2});

        assert.strictEqual(parse5.treeAdapters.htmlparser2.getAttrList(fragment.childNodes[0]).length, 1);
    }
};

exports['Regression - Fix empty stream parsing with ParserStream (GH-196)'] = function (done) {
    var parser = new parse5.ParserStream()
        .once('finish', function () {
            assert(parser.document.childNodes.length > 0);
            done();
        });

    parser.end();
};
