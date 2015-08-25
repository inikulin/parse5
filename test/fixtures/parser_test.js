'use strict';

var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    parse5 = require('../../lib'),
    testUtils = require('../test_utils');

function getFullTestName(test) {
    return ['Parser(', test.dirName, ') - ', test.idx, '.', test.setName, ' - ', test.input].join('');
}

testUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, treeAdapter) {
    //Here we go..
    testUtils
        .loadTreeConstructionTestData([
            path.join(__dirname, '../data/tree_construction'),
            path.join(__dirname, '../data/tree_construction_regression'),
            path.join(__dirname, '../data/tree_construction_options')
        ], treeAdapter)
        .forEach(function (test) {
            _test[getFullTestName(test)] = function () {
                var opts = {
                        decodeHtmlEntities: !test.disableEntitiesDecoding,
                        treeAdapter: treeAdapter
                    },
                    actual = null,
                    msg = null;

                if (test.fragmentContext) {
                    var fragment = parse5.parseFragment(test.input, test.fragmentContext, opts);

                    actual = testUtils.serializeToTestDataFormat(fragment, treeAdapter);
                    msg = testUtils.prettyPrintParserAssertionArgs(actual, test.expected);
                }
                else {
                    var result = testUtils.parseChunked(test.input, opts);

                    actual = testUtils.serializeToTestDataFormat(result.document, treeAdapter);
                    msg = testUtils.prettyPrintParserAssertionArgs(actual, test.expected, result.chunks);
                }

                assert.strictEqual(actual, test.expected, msg);
            };
        });
});


exports['Regression - HTML5 Legacy Doctype Misparsed with htmlparser2 tree adapter (GH-45)'] = function () {
    var html = '<!DOCTYPE html SYSTEM "about:legacy-compat"><html><head></head><body>Hi there!</body></html>',
        document = parse5.parse(html, {treeAdapter: parse5.treeAdapters.htmlparser2});

    assert.strictEqual(document.childNodes[0].data, '!DOCTYPE html SYSTEM "about:legacy-compat"');
};

