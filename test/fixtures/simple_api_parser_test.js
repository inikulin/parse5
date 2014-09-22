var assert = require('assert'),
    path = require('path'),
    SimpleApiParser = require('../../index').SimpleApiParser,
    TestUtils = require('../test_utils');

function getFullTestName(test) {
    return ['SimpleApiParser - ', test.idx, '.', test.name].join('');
}

function sanitizeForComparison(str) {
    return TestUtils.removeNewLines(str)
        .replace(/\s/g, '')
        .replace(/'/g, '"')
        .toLowerCase();
}

var testDataDir = path.join(__dirname, '../data/simple_api_parsing');

TestUtils.loadSerializationTestData(testDataDir).forEach(function (test) {
    exports[getFullTestName(test)] = function () {
        //NOTE: the idea of the test is to serialize back given HTML using SimpleApiParser handlers
        var result = '',
            parser = new SimpleApiParser({
                doctype: function (name, publicId, systemId) {
                    result += '<!DOCTYPE ' + name;

                    if (publicId !== null)
                        result += ' PUBLIC "' + publicId + '"';

                    else if (systemId !== null)
                        result += ' SYSTEM';

                    if (systemId !== null)
                        result += ' "' + systemId + '"';


                    result += '>';
                },

                startTag: function (tagName, attrs, selfClosing) {
                    result += '<' + tagName;

                    if (attrs.length) {
                        for (var i = 0; i < attrs.length; i++)
                            result += ' ' + attrs[i].name + '="' + attrs[i].value + '"';
                    }

                    result += selfClosing ? '/>' : '>';
                },

                endTag: function (tagName) {
                    result += '</' + tagName + '>';
                },

                text: function (text) {
                    result += text;
                },

                comment: function (text) {
                    result += '<!--' + text + '-->';
                }
            }),
            expected = sanitizeForComparison(test.expected);

        parser.parse(test.src);

        result = sanitizeForComparison(result);

        //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
        assert.ok(result === expected, TestUtils.getStringDiffMsg(result, expected));
    }
});
