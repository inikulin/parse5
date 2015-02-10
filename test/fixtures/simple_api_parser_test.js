var assert = require('assert'),
    path = require('path'),
    SimpleApiParser = require('../../index').SimpleApiParser,
    TestUtils = require('../test_utils');

function getFullTestName(test, idx) {
    return ['SimpleApiParser - ', idx, '.', test.name].join('');
}

function sanitizeForComparison(str) {
    return TestUtils.removeNewLines(str)
        .replace(/\s/g, '')
        .replace(/'/g, '"')
        .toLowerCase();
}


function createTest(html, expected, options) {
    return function () {
        //NOTE: the idea of the test is to serialize back given HTML using SimpleApiParser handlers
        var actual = '',
            parser = new SimpleApiParser({
                doctype: function (name, publicId, systemId) {
                    actual += '<!DOCTYPE ' + name;

                    if (publicId !== null)
                        actual += ' PUBLIC "' + publicId + '"';

                    else if (systemId !== null)
                        actual += ' SYSTEM';

                    if (systemId !== null)
                        actual += ' "' + systemId + '"';


                    actual += '>';
                },

                startTag: function (tagName, attrs, selfClosing) {
                    actual += '<' + tagName;

                    if (attrs.length) {
                        for (var i = 0; i < attrs.length; i++)
                            actual += ' ' + attrs[i].name + '="' + attrs[i].value + '"';
                    }

                    actual += selfClosing ? '/>' : '>';
                },

                endTag: function (tagName) {
                    actual += '</' + tagName + '>';
                },

                text: function (text) {
                    actual += text;
                },

                comment: function (text) {
                    actual += '<!--' + text + '-->';
                }
            }, options);

        parser.parse(html);

        expected = sanitizeForComparison(expected);
        actual = sanitizeForComparison(actual);

        //NOTE: use ok assertion, so output will not be polluted by the whole content of the strings
        assert.ok(actual === expected, TestUtils.getStringDiffMsg(actual, expected));
    };
}

TestUtils.loadSerializationTestData(path.join(__dirname, '../data/simple_api_parsing'))
    .concat([
        {
            name: 'Options - decodeHtmlEntities (text)',
            src: '<div>&amp;&copy;</div>',
            expected: '<div>&amp;&copy;</div>',
            options: {
                decodeHtmlEntities: false
            }
        },

        {
            name: 'Options - decodeHtmlEntities (attributes)',
            src: '<a href = "&amp;test&lt;" &copy;>Yo</a>',
            expected: '<a href = "&amp;test&lt;" &copy;="">Yo</a>',
            options: {
                decodeHtmlEntities: false
            }
        }
    ])
    .forEach(function (test, idx) {
        exports[getFullTestName(test, idx)] = createTest(test.src, test.expected, test.options);
    });


