'use strict';

var assert = require('assert'),
    Tokenizer = require('../../lib/tokenizer'),
    LocationInfoTokenizerMixin = require('../../lib/extensions/location_info/tokenizer_mixin'),
    testUtils = require('../test_utils');

exports['Location info (Tokenizer)'] = function () {
    var testCases = [
        {
            initialMode: Tokenizer.MODE.DATA,
            lastStartTagName: '',
            htmlChunks: [
                '\r\n', '<!DOCTYPE html>', '\n',
                '<!-- Test -->', '\n',
                '<head>',
                '\n   ', '<meta charset="utf-8">', '<title>', '   ', 'node.js', '\u0000', '</title>', '\n',
                '</head>', '\n',
                '<body id="front">', '\n',
                '<div id="intro">',
                '\n   ', '<p\n>',
                '\n       ', 'Node.js', ' ', 'is', ' ', 'a',
                '\n       ', 'platform', ' ', 'built', ' ', 'on',
                '\n       ', '<a href="http://code.google.com/p/v8/">',
                '\n       ', 'Chrome\'s', ' ', 'JavaScript', ' ', 'runtime',
                '\n       ', '</a>', '\n',
                '</div>',
                '</body>'
            ]
        },
        {
            initialMode: Tokenizer.MODE.RCDATA,
            lastStartTagName: 'title',
            htmlChunks: [
                '<div>Test',
                ' \n   ', 'hey', ' ', 'ya!', '</title>', '<!--Yo-->'
            ]
        },
        {
            initialMode: Tokenizer.MODE.RAWTEXT,
            lastStartTagName: 'style',
            htmlChunks: [
                '.header{', ' \n   ', 'color:red;', '\n', '}', '</style>', 'Some', ' ', 'text'
            ]
        },
        {
            initialMode: Tokenizer.MODE.SCRIPT_DATA,
            lastStartTagName: 'script',
            htmlChunks: [
                'var', ' ', 'a=c', ' ', '-', ' ', 'd;', '\n', 'a<--d;', '</script>', '<div>'
            ]
        },
        {
            initialMode: Tokenizer.MODE.PLAINTEXT,
            lastStartTagName: 'plaintext',
            htmlChunks: [
                'Text', ' \n', 'Test</plaintext><div>'
            ]
        }

    ];

    testCases.forEach(function (testCase) {
        var html = testCase.htmlChunks.join(''),
            lines = html.split(/\r?\n/g),
            tokenizer = new Tokenizer(),
            lastChunkIdx = testCase.htmlChunks.length - 1;

        new LocationInfoTokenizerMixin(tokenizer);

        for (var i = 0; i < testCase.htmlChunks.length; i++)
            tokenizer.write(testCase.htmlChunks[i], i === lastChunkIdx);

        // NOTE: set small waterline for testing purposes
        tokenizer.preprocessor.bufferWaterline = 8;
        tokenizer.state = testCase.initialMode;
        tokenizer.lastStartTagName = testCase.lastStartTagName;

        for (var token = tokenizer.getNextToken(), j = 0; token.type !== Tokenizer.EOF_TOKEN;) {
            if (token.type === Tokenizer.HIBERNATION_TOKEN)
                continue;

            //Offsets
            var actual = html.substring(token.location.startOffset, token.location.endOffset);

            assert.strictEqual(actual, testCase.htmlChunks[j]);

            //Line/col
            actual = testUtils.getSubstringByLineCol(lines, token.location.startLine, token.location.startCol);

            var expected = testUtils.normalizeNewLine(testCase.htmlChunks[j]);

            assert.strictEqual(actual.indexOf(expected), 0);

            token = tokenizer.getNextToken();
            j++;
        }
    });
};
