var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    Parser = require('../../index').Parser,
    TestUtils = require('../test_utils');
;

TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function getFullTestName(test) {
        return ['Parser(' + test.dirName + ') - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    //Here we go..
    TestUtils.loadTreeConstructionTestData([
        path.join(__dirname, '../data/tree_construction'),
        path.join(__dirname, '../data/tree_construction_regression'),
        path.join(__dirname, '../data/tree_construction_options')
    ], treeAdapter).forEach(function (test) {
        _test[getFullTestName(test)] = function () {
            var parser = new Parser(treeAdapter, {
                    decodeHtmlEntities: !test.disableEntitiesDecoding
                }),
                result = test.fragmentContext ?
                         parser.parseFragment(test.input, test.fragmentContext) :
                         parser.parse(test.input),
                actual = TestUtils.serializeToTestDataFormat(result, treeAdapter),
                msg = TestUtils.prettyPrintParserAssertionArgs(actual, test.expected);

            assert.strictEqual(actual, test.expected, msg);
        };
    });
});

