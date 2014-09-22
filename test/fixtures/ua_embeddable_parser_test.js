var fs = require('fs'),
    path = require('path'),
    HTML = require('../../lib/common/html'),
    UAEmbeddableParser = require('../../index').UAEmbeddableParser,
    Serializer = require('../../index').TreeSerializer,
    TestUtils = require('../test_utils');

exports['State guard'] = function (t) {
    var docHtml = '<script>Yoyo</script>',
        parser = new UAEmbeddableParser(),
        getParserController = function () {
            return parser.parseDocument(docHtml, function () {
                //NOTE: unreachable =)
            });

        };

    t.throws(function () {
        var parserController = getParserController();

        parserController.suspend();
        parserController.suspend();
    });

    t.throws(function () {
        var parserController = getParserController();

        parserController.resume();
    });

    t.done();
};

exports['Reentrancy'] = function (t) {
    var parser = new UAEmbeddableParser(),
        serializer = new Serializer(),
        docHtml1 = '<!DOCTYPE html><html><head><script>Yoyo</script></head><body></body></html>',
        docHtml2 = '<!DOCTYPE html><html><head></head><body>Beep boop</body></html>',
        fragments = [
            '<div>Hey ya!</div>',
            '<p><a href="#"></a></p>'
        ];

    t.expect(4);

    var parserController = parser.parseDocument(docHtml1, function () {
        parserController.suspend();

        setTimeout(function () {
            fragments.forEach(function (fragment) {
                var actual = serializer.serialize(parser.parseInnerHtml(fragment));
                t.ok(actual === fragment, TestUtils.getStringDiffMsg(actual, fragment));
            });

            parser.parseDocument(docHtml2, function (document2) {
                var actual = serializer.serialize(document2);

                t.ok(actual === docHtml2, TestUtils.getStringDiffMsg(actual, docHtml2));
                parserController.resume();
            });
        });

    }, function (document1) {
        var actual = serializer.serialize(document1);

        t.ok(actual === docHtml1, TestUtils.getStringDiffMsg(actual, docHtml1));
        t.done();
    });
};


TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function getFullTestName(test) {
        return ['UAEmbeddableParser - ', test.idx, '.', test.setName, ' - ', test.input].join('');
    }

    var testDataDir = path.join(__dirname, '../data/tree_construction'),
        scriptedTestDataDir = path.join(__dirname, '../data/scripted_tree_construction');

    //Here we go..
    TestUtils.loadTreeConstructionTestData([testDataDir, scriptedTestDataDir], treeAdapter).forEach(function (test) {
        var parser = new UAEmbeddableParser(treeAdapter);

        _test[getFullTestName(test)] = function (t) {
            function assertResult(result) {
                var actual = TestUtils.serializeToTestDataFormat(result, treeAdapter);
                t.strictEqual(actual, test.expected, TestUtils.prettyPrintParserAssertionArgs(actual, test.expected));
                t.done();
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


