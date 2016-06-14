'use strict';

var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    Tokenizer = require('../../lib/tokenizer'),
    testUtils = require('../test_utils'),
    ParserFeedbackSimulator = require('../../lib/sax/parser_feedback_simulator');

function tokenize(chunks, initialState, lastStartTag, withFeedback) {
    var tokenizer = new Tokenizer(),
        token = {type: Tokenizer.HIBERNATION_TOKEN},
        out = [],
        chunkIdx = 0,
        tokenSource = null;

    tokenizer.state = initialState;

    if (lastStartTag)
        tokenizer.lastStartTagName = lastStartTag;

    function writeChunk() {
        var chunk = chunks[chunkIdx];

        tokenizer.write(chunk, ++chunkIdx === chunks.length);
    }

    if (withFeedback)
        tokenSource = new ParserFeedbackSimulator(tokenizer);
    else
        tokenSource = tokenizer;

    do {
        if (token.type === Tokenizer.HIBERNATION_TOKEN)
            writeChunk();
        else
            appendTokenEntry(out, testUtils.convertTokenToHtml5Lib(token));

        token = tokenSource.getNextToken();
    } while (token.type !== Tokenizer.EOF_TOKEN);

    return out;
}

function unicodeUnescape(str) {
    return str.replace(/\\u([\d\w]{4})/gi, function (match, chCodeStr) {
        return String.fromCharCode(parseInt(chCodeStr, 16));
    });
}

function unescapeDescrIO(testDescr) {
    testDescr.input = unicodeUnescape(testDescr.input);

    testDescr.output.forEach(function (tokenEntry) {
        if (tokenEntry === 'ParseError')
            return;

        //NOTE: unescape token tagName (for StartTag and EndTag tokens), comment data (for Comment token),
        //character token data (for Character token).
        tokenEntry[1] = unicodeUnescape(tokenEntry[1]);

        //NOTE: unescape token attributes(if we have them).
        if (tokenEntry.length > 2) {
            Object.keys(tokenEntry).forEach(function (attrName) {
                var attrVal = tokenEntry[attrName];

                delete tokenEntry[attrName];
                tokenEntry[unicodeUnescape(attrName)] = unicodeUnescape(attrVal);
            });
        }
    });
}

function appendTokenEntry(result, tokenEntry) {
    if (tokenEntry[0] === 'Character') {
        var lastEntry = result[result.length - 1];

        if (lastEntry && lastEntry[0] === 'Character') {
            lastEntry[1] += tokenEntry[1];
            return;
        }
    }

    result.push(tokenEntry);
}

function concatCharacterTokens(tokenEntries) {
    var result = [];

    tokenEntries.forEach(function (tokenEntry) {
        appendTokenEntry(result, tokenEntry);
    });

    return result;
}

function getTokenizerSuitableStateName(testDataStateName) {
    return testDataStateName.toUpperCase().replace(/\s/g, '_');
}

function loadTests(kindDir) {
    var dataDirPath = path.join(__dirname, '../data', kindDir),
        testSetFileNames = fs.readdirSync(dataDirPath),
        testIdx = 0,
        tests = [];

    testSetFileNames.forEach(function (fileName) {
        var filePath = path.join(dataDirPath, fileName),
            testSetJson = fs.readFileSync(filePath).toString(),
            testSet = JSON.parse(testSetJson),
            testDescrs = testSet.tests,
            setName = fileName.replace('.test', '');

        testDescrs.forEach(function (descr) {
            if (!descr.initialStates)
                descr.initialStates = ['Data state'];

            if (descr.doubleEscaped)
                unescapeDescrIO(descr);

            var expected = [];

            descr.output.forEach(function (tokenEntry) {
                if (tokenEntry !== 'ParseError')
                    expected.push(tokenEntry);
            });

            descr.initialStates.forEach(function (initialState) {
                tests.push({
                    idx: ++testIdx,
                    setName: setName,
                    name: descr.description,
                    input: descr.input,
                    expected: concatCharacterTokens(expected),
                    initialState: getTokenizerSuitableStateName(initialState),
                    lastStartTag: descr.lastStartTag
                });
            });
        });
    });

    return tests;
}

function getFullTestName(kind, test) {
    return [kind + ' - ' +
            test.idx, '.', test.setName, ' - ', test.name, ' - Initial state: ', test.initialState].join('');
}

var suites = [
    { name: 'Tokenizer', dir: 'tokenization', withFeedback: false },
    { name: 'Parser feedback', dir: 'parser_feedback', withFeedback: true }
];

//Here we go..
suites.forEach(function (suite) {
    loadTests(suite.dir).forEach(function (test) {
        exports[getFullTestName(suite.name, test)] = function () {
            var chunks = testUtils.makeChunks(test.input);
            var out = tokenize(chunks, test.initialState, test.lastStartTag, suite.withFeedback);

            assert.deepEqual(out, test.expected, 'Chunks: ' + JSON.stringify(chunks));
        };
    });
});
