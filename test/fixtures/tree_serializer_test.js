var fs = require('fs'),
    path = require('path'),
    Parser = require('../../lib/tree_construction_stage/parser'),
    Serializer = require('../../lib/tree_construction_stage/tree_serializer'),
    testGenerator = require('../test_generator');


testGenerator.defineForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function loadTests() {
        var dataDirPath = path.join(__dirname, '../data/tree_serializer'),
            testSetFileDirs = fs.readdirSync(dataDirPath),
            tests = [],
            testIdx = 1;

        testSetFileDirs.forEach(function (dirName) {
            var srcFilePath = path.join(dataDirPath, dirName, 'src.html'),
                expectedFilePath = path.join(dataDirPath, dirName, 'expected.html'),
                src = fs.readFileSync(srcFilePath).toString(),
                expected = fs.readFileSync(expectedFilePath).toString();

            tests.push({
                idx: testIdx,
                name: dirName,
                src: src,
                expected: expected
            });

            testIdx++;
        });

        return tests;
    }

    function addSlashes(str) {
        return str
            .replace(/\t/g, '\\t')
            .replace(/\n/g, '\\n')
            .replace(/\f/g, '\\f')
            .replace(/\r/g, '\\r');
    }

    function removeNewLines(str) {
        return str
            .replace(/\r/g, '')
            .replace(/\n/g, '');
    }

    function createDiffMarker(markerPosition) {
        var marker = '';

        for (var i = 0; i < markerPosition - 1; i++)
            marker += ' ';

        return marker + '^\n';
    }

    function getAssertionMessage(actual, expected) {
        for (var i = 0; i < expected.length; i++) {
            if (actual[i] !== expected[i]) {
                var errMsg = '\nString differ at index ' + i + '\n';

                var expectedStr = 'Expected: ' + addSlashes(expected.substring(i - 100, i + 1)),
                    expectedDiffMarker = createDiffMarker(expectedStr.length);

                errMsg += expectedStr + addSlashes(expected.substring(i + 1, i + 20)) + '\n' + expectedDiffMarker;

                var actualStr = 'Actual:   ' + addSlashes(actual.substring(i - 100, i + 1)),
                    actualDiffMarker = createDiffMarker(actualStr.length);

                errMsg += actualStr + addSlashes(actual.substring(i + 1, i + 20)) + '\n' + actualDiffMarker;

                return errMsg;
            }
        }

        return '';
    }

    function getFullTestName(test) {
        return ['TreeSerializer - ', test.idx, '.', test.name].join('');
    }

    //Here we go..
    loadTests().forEach(function (test) {
        _test[getFullTestName(test)] = function (t) {
            var parser = new Parser(treeAdapter),
                serializer = new Serializer(treeAdapter),
                document = parser.parse(test.src),
                serializedResult = removeNewLines(serializer.serialize(document)),
                expected = removeNewLines(test.expected);

            //NOTE: use ok assertion, so output will not be polluted by the whole content of the assertable strings
            t.ok(serializedResult === expected, getAssertionMessage(serializedResult, expected));
            t.done();
        };
    });

});