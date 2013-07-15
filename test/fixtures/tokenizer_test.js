var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Tokenizer = require('../../lib/tokenizer').Tokenizer;

function tokenize(html, initialState, lastStartTag) {
    var tokenizer = new Tokenizer(html),
        nextToken = null,
        out = {
            tokens: [],
            errCount: 0
        };

    tokenizer.state = initialState;

    if (lastStartTag)
        tokenizer.lastStartTagName = lastStartTag;

    do {
        nextToken = tokenizer.getNextToken();

        //NOTE: append current token to the output sequence in html5lib test suite compatible format
        switch (nextToken.type) {
            case Tokenizer.CHARACTER_TOKEN:
            case Tokenizer.NULL_CHARACTER_TOKEN:
            case Tokenizer.WHITESPACE_CHARACTER_TOKEN:
                out.tokens.push(['Character', nextToken.ch]);
                break;

            case Tokenizer.START_TAG_TOKEN:
                var reformatedAttrs = {};

                nextToken.attrs.forEach(function (attr) {
                    reformatedAttrs[attr.name] = attr.value;
                });

                var startTagEntry = [
                    'StartTag',
                    nextToken.tagName,
                    reformatedAttrs
                ];

                if (nextToken.selfClosing)
                    startTagEntry.push(true);

                out.tokens.push(startTagEntry);
                break;

            case Tokenizer.END_TAG_TOKEN:
                out.tokens.push(['EndTag', nextToken.tagName]);
                break;

            case Tokenizer.COMMENT_TOKEN:
                out.tokens.push(['Comment', nextToken.data]);
                break;

            case Tokenizer.DOCTYPE_TOKEN:
                out.tokens.push([
                    'DOCTYPE',
                    nextToken.name,
                    nextToken.publicId,
                    nextToken.systemId,
                    !nextToken.forceQuirks
                ]);
                break;
        }
    } while (nextToken.type !== Tokenizer.EOF_TOKEN);

    out.errCount = tokenizer.errs.length;
    out.tokens = concatCharacterTokens(out.tokens);

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

function concatCharacterTokens(tokenEntries) {
    var result = [];

    tokenEntries.forEach(function (tokenEntry) {
        if (tokenEntry[0] === 'Character') {
            var lastEntry = result[result.length - 1];

            if (lastEntry && lastEntry[0] === 'Character') {
                lastEntry[1] += tokenEntry[1];
                return;
            }
        }

        result.push(tokenEntry);
    });

    return result;
}

function getTokenizerSuitableStateName(testDataStateName) {
    return testDataStateName.toUpperCase().replace(/\s/g, '_');
}

function loadTests() {
    var dataDirPath = path.join(__dirname, '../data/tokenizer'),
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

            var expectedTokens = [],
                expectedErrCount = 0;

            descr.output.forEach(function (tokenEntry) {
                if (tokenEntry === 'ParseError')
                    expectedErrCount++;
                else
                    expectedTokens.push(tokenEntry);
            });

            descr.initialStates.forEach(function (initialState) {
                tests.push({
                    idx: ++testIdx,
                    setName: setName,
                    name: descr.description,
                    input: descr.input,
                    expectedTokens: concatCharacterTokens(expectedTokens),
                    expectedErrCount: expectedErrCount,
                    initialState: getTokenizerSuitableStateName(initialState),
                    lastStartTag: descr.lastStartTag
                });
            });
        });
    });

    return tests;
}

function getFullTestName(test) {
    return [test.idx, '.', test.setName, ' - ', test.name, ' - Initial state: ', test.initialState].join('');
}

//Here we go..
loadTests().forEach(function (test) {
    exports[getFullTestName(test)] = function (t) {
        var out = tokenize(test.input, test.initialState, test.lastStartTag);

        t.deepEqual(out.tokens, test.expectedTokens);
        t.strictEqual(out.errCount, test.expectedErrCount);

        t.done();
    };
});
