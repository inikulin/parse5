var fs = require('fs'),
    path = require('path'),
    Parser = require('../../lib/tree_construction/parser'),
    Serializer = require('../../lib/tree_serialization/tree_serializer'),
    TestUtils = require('../test_utils');


exports['Regression - SYSTEM-only doctype serialization'] = function (t) {
    var html = '<!DOCTYPE html SYSTEM "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
               '<html><head></head><body></body></html>',
        parser = new Parser(),
        serializer = new Serializer(),
        document = parser.parse(html),
        serializedResult = serializer.serialize(document);

    t.strictEqual(serializedResult, html);
    t.done();
};

exports['Regression - Escaping of doctypes with quotes in them'] = function (t) {
    var htmlStrs = [
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ' +
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
            '<html><head></head><body></body></html>',

            '<!DOCTYPE html PUBLIC \'-//W3C//"DTD" XHTML 1.0 Transitional//EN\' ' +
            '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">' +
            '<html><head></head><body></body></html>',

            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ' +
            '\'http://www.w3.org/TR/xhtml1/DTD/"xhtml1-transitional.dtd"\'>' +
            '<html><head></head><body></body></html>'
        ],
        parser = new Parser(),
        serializer = new Serializer();

    htmlStrs.forEach(function (html) {
        var document = parser.parse(html),
            serializedResult = serializer.serialize(document);

        t.strictEqual(serializedResult, html);
    });

    t.done();
};

exports['Regression - new line in <pre> tag'] = function (t) {
    var htmlStrs = [
            {
                src: '<!DOCTYPE html><html><head></head><body><pre>\ntest</pre></body></html>',
                expected: '<!DOCTYPE html><html><head></head><body><pre>test</pre></body></html>'
            },

            {
                src: '<!DOCTYPE html><html><head></head><body><pre>\n\ntest</pre></body></html>',
                expected: '<!DOCTYPE html><html><head></head><body><pre>\n\ntest</pre></body></html>'
            }
        ],
        parser = new Parser(),
        serializer = new Serializer();

    htmlStrs.forEach(function (htmlStr) {
        var document = parser.parse(htmlStr.src),
            serializedResult = serializer.serialize(document);

        t.strictEqual(serializedResult, htmlStr.expected);
    });

    t.done();
};

TestUtils.generateTestsForEachTreeAdapter(module.exports, function (_test, adapterName, treeAdapter) {
    function loadTests() {
        var dataDirPath = path.join(__dirname, '../data/serialization'),
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

            //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
            t.ok(serializedResult === expected, getAssertionMessage(serializedResult, expected));
            t.done();
        };
    });

});