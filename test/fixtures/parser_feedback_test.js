'use strict';

var assert = require('assert'),
    path = require('path'),
    Parser = require('../../lib/parser'),
    Tokenizer = require('../../lib/tokenizer'),
    ParserFeedbackSimulator = require('../../lib/sax/parser_feedback_simulator'),
    defaultTreeAdapter = require('../../lib/tree_adapters/default'),
    testUtils = require('../test_utils'),
    $ = require('../../lib/common/html').TAG_NAMES;

function getFullTestName(test) {
    return ['Feedback(', test.dirName, ') - ', test.idx, '.', test.setName, ' - ', test.input].join('');
}

function appendToken(dest, token) {
    switch (token.type) {
        case Tokenizer.EOF_TOKEN:
            return false;
        case Tokenizer.NULL_CHARACTER_TOKEN:
        case Tokenizer.WHITESPACE_CHARACTER_TOKEN:
            token.type = Tokenizer.CHARACTER_TOKEN;
            /* falls through */
        case Tokenizer.CHARACTER_TOKEN:
            if (dest.length > 0 && dest[dest.length - 1].type === Tokenizer.CHARACTER_TOKEN) {
                dest[dest.length - 1].chars += token.chars;
                return true;
            }
            break;
        case Tokenizer.START_TAG_TOKEN:
            // HTML and BODY are special in that they merge their attributes with
            // their duplicates and don't appear as separate tags in the document.
            //
            // For obvious reasons this requires being able to operate on entire
            // document, and won't work in the streaming mode (such as SAX)
            // without infinite buffering.
            //
            // So we assume that SAX consumers are aware of this and handle such
            // duplicates in the way they need (if they care about this edge case
            // at all, that is), and for tests we'll simply append new attributes
            // to the buffered first occurence of such start tag.
            if (token.tagName === $.HTML || token.tagName === $.BODY) {
                dest.some(function (prevToken) {
                    if (prevToken.type !== Tokenizer.START_TAG_TOKEN || prevToken.tagName !== token.tagName)
                        return false;

                    prevToken.attrs = prevToken.attrs.concat(token.attrs.filter(function (attr) {
                        return Tokenizer.getTokenAttr(prevToken, attr.name) === null;
                    }));

                    return true;
                });
            }
            break;
    }
    dest.push(token);
    return true;
}

function collectSimulatorTokens(html) {
    var tokenizer = new Tokenizer();
    var parserFeedbackSimulator = new ParserFeedbackSimulator(tokenizer);
    var tokens = [];

    tokenizer.write(html, true);

    while (appendToken(tokens, parserFeedbackSimulator.getNextToken()));

    return tokens;
}

function collectParserTokens(html) {
    var tokens = [];
    var parser = new Parser();

    parser._processInputToken = function (token) {
        Parser.prototype._processInputToken.call(this, token);

        // Temporary artifact, see https://github.com/inikulin/parse5/pull/127#issuecomment-218480695
        if (token.type === Tokenizer.END_TAG_TOKEN)
            token.ignored = false;

        appendToken(tokens, token);
    };

    parser.parse(html);

    return tokens;
}

function assertParsing(input) {
    var parserTokens = collectParserTokens(input);
    var simulatorTokens = collectSimulatorTokens(input);

    assert.deepEqual(simulatorTokens, parserTokens, 'Collected tokens should be same.');
}

//Here we go..
testUtils
    .loadTreeConstructionTestData([
        path.join(__dirname, '../data/tree_construction'),
        path.join(__dirname, '../data/tree_construction_regression')
    ], defaultTreeAdapter)
    .forEach(function (test) {
        exports[getFullTestName(test)] = function () {
            if (test.fragmentContext)
                return; // TODO

            assertParsing(test.input);
        };
    });
