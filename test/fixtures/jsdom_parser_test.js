var assert = require('assert'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    JsDomParser = require('../../index').JsDomParser,
    Serializer = require('../../index').TreeSerializer,
    TestUtils = require('../test_utils');

exports['State guard'] = function () {
    var docHtml = '<script>Yoyo</script>',
        parser = new JsDomParser(),
        getParserController = function () {
            return parser.parseDocument(docHtml, function () {
                //NOTE: unreachable =)
            });

        };

    assert.throws(function () {
        var parserController = getParserController();

        parserController.suspend();
        parserController.suspend();
    });

    assert.throws(function () {
        var parserController = getParserController();

        parserController.resume();
    });
};

exports['Reentrancy'] = function (done) {
    var parser = new JsDomParser(),
        serializer = new Serializer(),
        asyncAssertionCount = 0,
        docHtml1 = '<!DOCTYPE html><html><head><script>Yoyo</script></head><body></body></html>',
        docHtml2 = '<!DOCTYPE html><html><head></head><body>Beep boop</body></html>',
        fragments = [
            '<div>Hey ya!</div>',
            '<p><a href="#"></a></p>'
        ];

    var parserController = parser.parseDocument(docHtml1, function () {
        parserController.suspend();

        setTimeout(function () {
            fragments.forEach(function (fragment) {
                var actual = serializer.serialize(parser.parseInnerHtml(fragment));
                assert.ok(actual === fragment, TestUtils.getStringDiffMsg(actual, fragment));
                asyncAssertionCount++;
            });

            parser.parseDocument(docHtml2, function (document2) {
                var actual = serializer.serialize(document2);

                assert.ok(actual === docHtml2, TestUtils.getStringDiffMsg(actual, docHtml2));
                asyncAssertionCount++;
                parserController.resume();
            });
        });

    }, function (document1) {
        var actual = serializer.serialize(document1);

        assert.strictEqual(asyncAssertionCount, 3);
        assert.ok(actual === docHtml1, TestUtils.getStringDiffMsg(actual, docHtml1));
        done();
    });
};


TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function getFullTestName(test) {
        return ['JsDomParser - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    var testDataDir = path.join(__dirname, '../data/tree_construction'),
        scriptedTestDataDir = path.join(__dirname, '../data/scripted_tree_construction');

    //Here we go..
    TestUtils.loadTreeConstructionTestData([
        testDataDir,
        scriptedTestDataDir
    ], treeAdapter).forEach(function (test) {
            var parser = new JsDomParser(treeAdapter);

            _test[getFullTestName(test)] = function (done) {
                function assertResult(result) {
                    var actual = TestUtils.serializeToTestDataFormat(result, treeAdapter),
                        msg = TestUtils.prettyPrintParserAssertionArgs(actual, test.expected);

                    assert.strictEqual(actual, test.expected, msg);

                    done();
                }

                if (test.fragmentContext) {
                    var result = parser.parseInnerHtml(test.input, test.fragmentContext);
                    assertResult(result);
                }

                else {
                    var parserController = parser.parseDocument(test.input, function (document, scriptElement) {
                        parserController.suspend();

                        //NOTE: test parser suspension in different modes (sync and async).
                        //If we have script then execute it and resume parser asynchronously.
                        //Otherwise - resume synchronously.
                        var scriptTextNode = treeAdapter.getChildNodes(scriptElement)[0],
                            script = scriptTextNode && treeAdapter.getTextNodeContent(scriptTextNode);

                        //NOTE: don't pollute test runner output by console.log() calls from test scripts
                        if (script && script.trim() && script.indexOf('console.log') === -1) {
                            setTimeout(function () {
                                //NOTE: mock document for script evaluation
                                var document = {
                                    write: function (html) {
                                        parserController.documentWrite(html);
                                    }
                                };

                                try {
                                    eval(script);
                                } catch (err) {
                                    //NOTE: ignore broken scripts from test data
                                }

                                parserController.resume();
                            });
                        }

                        else
                            parserController.resume();

                    }, assertResult);
                }
            };
        });
});


