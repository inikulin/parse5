'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Tokenizer = require('../../packages/parse5/lib/tokenizer');
const { makeChunks } = require('./common');

function convertTokenToHtml5Lib(token) {
    switch (token.type) {
        case Tokenizer.CHARACTER_TOKEN:
        case Tokenizer.NULL_CHARACTER_TOKEN:
        case Tokenizer.WHITESPACE_CHARACTER_TOKEN:
            return ['Character', token.chars];

        case Tokenizer.START_TAG_TOKEN: {
            const reformatedAttrs = {};

            token.attrs.forEach(attr => {
                reformatedAttrs[attr.name] = attr.value;
            });

            const startTagEntry = ['StartTag', token.tagName, reformatedAttrs];

            if (token.selfClosing) {
                startTagEntry.push(true);
            }

            return startTagEntry;
        }

        case Tokenizer.END_TAG_TOKEN:
            // NOTE: parser feedback simulator can produce adjusted SVG
            // tag names for end tag tokens so we need to lower case it
            return ['EndTag', token.tagName.toLowerCase()];

        case Tokenizer.COMMENT_TOKEN:
            return ['Comment', token.data];

        case Tokenizer.DOCTYPE_TOKEN:
            return ['DOCTYPE', token.name, token.publicId, token.systemId, !token.forceQuirks];

        default:
            throw new TypeError('Unrecognized token type: ' + token.type);
    }
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

function tokenize(createTokenSource, chunks, initialState, lastStartTag) {
    const result = { tokens: [], errors: [] };
    const { tokenizer, getNextToken } = createTokenSource(result);
    let token = { type: Tokenizer.HIBERNATION_TOKEN };
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

    do {
        if (token.type === Tokenizer.HIBERNATION_TOKEN) {
            writeChunk();
        } else {
            appendTokenEntry(result.tokens, convertTokenToHtml5Lib(token));
        }

        token = getNextToken();
    } while (token.type !== Tokenizer.EOF_TOKEN);

    sortErrors(result);

    return result;
}

function unicodeUnescape(str) {
    return str.replace(/\\u([\d\w]{4})/gi, (match, chCodeStr) => String.fromCharCode(parseInt(chCodeStr, 16)));
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
    const tests = [];
    let testIdx = 0;

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

module.exports = function generateTokenizationTests(moduleExports, prefix, testSuite, createTokenSource) {
    loadTests(testSuite).forEach(test => {
        const testName = `${prefix} - ${test.idx}.${test.setName} - ${test.name} - Initial state: ${test.initialState}`;

        moduleExports[testName] = function() {
            const chunks = makeChunks(test.input);
            const result = tokenize(createTokenSource, chunks, test.initialState, test.lastStartTag);

            assert.deepEqual(result.tokens, test.expected, 'Chunks: ' + JSON.stringify(chunks));
            assert.deepEqual(result.errors, test.expectedErrors || []);
        };
    });
};

module.exports.convertTokenToHtml5Lib = convertTokenToHtml5Lib;
