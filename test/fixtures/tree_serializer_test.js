var path = require('path'),
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
    function getFullTestName(test) {
        return ['TreeSerializer - ', test.idx, '.', test.name].join('');
    }

    //Here we go..
    TestUtils.loadSerializationTestData(path.join(__dirname, '../data/tree_serialization')).forEach(function (test) {
        _test[getFullTestName(test)] = function (t) {
            var parser = new Parser(treeAdapter),
                serializer = new Serializer(treeAdapter),
                document = parser.parse(test.src),
                serializedResult = TestUtils.removeNewLines(serializer.serialize(document)),
                expected = TestUtils.removeNewLines(test.expected);

            //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
            t.ok(serializedResult === expected, TestUtils.getStringDiffMsg(serializedResult, expected));
            t.done();
        };
    });

});