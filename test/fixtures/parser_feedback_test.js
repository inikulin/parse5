'use strict';

var assert = require('assert'),
    path = require('path'),
    parse5 = require('../..'),
    Tokenizer = require('../../lib/tokenizer'),
    ParserFeedbackSimulator = require('../../lib/sax/parser_feedback_simulator'),
    testUtils = require('../test_utils');

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
            /* fallthrough */
        case Tokenizer.CHARACTER_TOKEN:
            if (dest.length > 0 && dest[dest.length - 1].type === Tokenizer.CHARACTER_TOKEN) {
                dest[dest.length - 1].chars += token.chars;
                break;
            }
            /* fallthrough */
        default:
            dest.push(token);
    }
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

    parse5.parse(html, {
        onToken: function (token) {
            // Temporary artifact, see https://github.com/inikulin/parse5/pull/127#issuecomment-218480695
            if (token.type === Tokenizer.END_TAG_TOKEN)
                token.ignored = false;

            appendToken(tokens, token);
        }
    });

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
    ], parse5.treeAdapters.default)
    .forEach(function (test) {
        exports[getFullTestName(test)] = function () {
            if (test.fragmentContext)
                return; // TODO

            assertParsing(test.input);
        };
    });
