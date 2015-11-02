'use strict';

var assert = require('assert'),
    path = require('path'),
    parse5 = require('../../lib'),
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
            path.join(__dirname, '../data/tree_construction'),
            path.join(__dirname, '../data/tree_construction_regression')
        ], treeAdapter)
        .forEach(function (test) {
            _test[getFullTestName(test)] = function () {
                var opts = {
                    decodeHtmlEntities: !test.disableEntitiesDecoding,
                    treeAdapter: treeAdapter
                };


                if (test.fragmentContext)
                    assertFragmentParsing(test.input, test.fragmentContext, test.expected, opts);

                else {
                    assertStreamingParsing(test.input, test.expected, opts);
                    assertParsing(test.input, test.expected, opts);
                }
            };
        });
});


exports['Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)'] = function () {
    var html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>',
        document = parse5.parse(html, {treeAdapter: parse5.treeAdapters.htmlparser2});

    assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
};

