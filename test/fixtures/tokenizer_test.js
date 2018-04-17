'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Tokenizer = require('../../lib/tokenizer');
const testUtils = require('../test_utils');
const Mixin = require('../../lib/utils/mixin');
const ParserFeedbackSimulator = require('../../lib/sax/parser_feedback_simulator');
const ErrorReportingTokenizerMixin = require('../../lib/extensions/error_reporting/tokenizer_mixin');

function createTokenSource(withFeedback, tokenizer, result) {
    if (withFeedback) {
        return new ParserFeedbackSimulator(tokenizer);
    }

    Mixin.install(tokenizer, ErrorReportingTokenizerMixin, {
        onParseError: function(err) {
            result.errors.push({
                code: err.code,
                line: err.startLine,
                col: err.startCol
            });
        }
    });

    return tokenizer;
}

function sortErrors(result) {
    result.errors = result.errors.sort((err1, err2) => {
        const lineDiff = err1.line - err2.line;

        if (lineDiff !== 0) {
            return lineDiff;
        }

        return err1.col - err2.col;
    });
}

function tokenize(chunks, initialState, lastStartTag, withFeedback) {
    const tokenizer = new Tokenizer();
    let token = { type: Tokenizer.HIBERNATION_TOKEN };
    const result = { tokens: [], errors: [] };
    let chunkIdx = 0;

    // NOTE: set small waterline for testing purposes
    tokenizer.preprocessor.bufferWaterline = 8;
    tokenizer.state = initialState;

    if (lastStartTag) {
        tokenizer.lastStartTagName = lastStartTag;
    }

    function writeChunk() {
        const chunk = chunks[chunkIdx];

        tokenizer.write(chunk, ++chunkIdx === chunks.length);
    }

    const tokenSource = createTokenSource(withFeedback, tokenizer, result);

    do {
        if (token.type === Tokenizer.HIBERNATION_TOKEN) {
            writeChunk();
        } else {
            appendTokenEntry(result.tokens, testUtils.convertTokenToHtml5Lib(token));
        }

        token = tokenSource.getNextToken();
    } while (token.type !== Tokenizer.EOF_TOKEN);

    sortErrors(result);

    return result;
}

function unicodeUnescape(str) {
    return str.replace(/\\u([\d\w]{4})/gi, (match, chCodeStr) => {
        return String.fromCharCode(parseInt(chCodeStr, 16));
    });
}

function unescapeDescrIO(testDescr) {
    testDescr.input = unicodeUnescape(testDescr.input);

    testDescr.output.forEach(tokenEntry => {
        //NOTE: unescape token tagName (for StartTag and EndTag tokens), comment data (for Comment token),
        //character token data (for Character token).
        tokenEntry[1] = unicodeUnescape(tokenEntry[1]);

        //NOTE: unescape token attributes(if we have them).
        if (tokenEntry.length > 2) {
            Object.keys(tokenEntry).forEach(attrName => {
                const attrVal = tokenEntry[attrName];

                delete tokenEntry[attrName];
                tokenEntry[unicodeUnescape(attrName)] = unicodeUnescape(attrVal);
            });
        }
    });
}

function appendTokenEntry(result, tokenEntry) {
    if (tokenEntry[0] === 'Character') {
        const lastEntry = result[result.length - 1];

        if (lastEntry && lastEntry[0] === 'Character') {
            lastEntry[1] += tokenEntry[1];
            return;
        }
    }

    result.push(tokenEntry);
}

function concatCharacterTokens(tokenEntries) {
    const result = [];

    tokenEntries.forEach(tokenEntry => {
        appendTokenEntry(result, tokenEntry);
    });

    return result;
}

function getTokenizerSuitableStateName(testDataStateName) {
    return testDataStateName.toUpperCase().replace(/\s/g, '_');
}

function loadTests(dataDirPath) {
    const testSetFileNames = fs.readdirSync(dataDirPath);
    let testIdx = 0;
    const tests = [];

    testSetFileNames.forEach(fileName => {
        if (path.extname(fileName) !== '.test') {
            return;
        }

        const filePath = path.join(dataDirPath, fileName);
        const testSetJson = fs.readFileSync(filePath).toString();
        const testSet = JSON.parse(testSetJson);
        const testDescrs = testSet.tests;

        if (!testDescrs) {
            return;
        }

        const setName = fileName.replace('.test', '');

        testDescrs.forEach(descr => {
            if (!descr.initialStates) {
                descr.initialStates = ['Data state'];
            }

            if (descr.doubleEscaped) {
                unescapeDescrIO(descr);
            }

            const expected = [];

            descr.output.forEach(tokenEntry => {
                if (tokenEntry !== 'ParseError') {
                    expected.push(tokenEntry);
                }
            });

            descr.initialStates.forEach(initialState => {
                tests.push({
                    idx: ++testIdx,
                    setName: setName,
                    name: descr.description,
                    input: descr.input,
                    expected: concatCharacterTokens(expected),
                    initialState: getTokenizerSuitableStateName(initialState),
                    lastStartTag: descr.lastStartTag,
                    expectedErrors: descr.errors || []
                });
            });
        });
    });

    return tests;
}

function getFullTestName(kind, test) {
    return [
        kind + ' - ' + test.idx,
        '.',
        test.setName,
        ' - `',
        test.name,
        '` - Initial state: ',
        test.initialState
    ].join('');
}

const suites = [
    {
        name: 'Tokenizer',
        dir: path.join(__dirname, '../data/html5lib-tests/tokenizer'),
        withFeedback: false
    },
    {
        name: 'Parser feedback',
        dir: path.join(__dirname, '../data/parser_feedback'),
        withFeedback: true
    }
];

//Here we go..
suites.forEach(suite => {
    loadTests(suite.dir).forEach(test => {
        exports[getFullTestName(suite.name, test)] = function() {
            const chunks = testUtils.makeChunks(test.input);
            const result = tokenize(chunks, test.initialState, test.lastStartTag, suite.withFeedback);

            assert.deepEqual(result.tokens, test.expected, 'Chunks: ' + JSON.stringify(chunks));

            if (!suite.withFeedback) {
                assert.deepEqual(result.errors, test.expectedErrors);
            }
        };
    });
});
