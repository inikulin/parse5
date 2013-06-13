var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    Tokenizer = require('../../lib/tokenizer').Tokenizer;

function tokenize(html, initialState, lastStartTag) {
    var tokenizer = new Tokenizer(html),
        nextToken = null,
        out = [];

    tokenizer.state = initialState;

    if (lastStartTag)
        tokenizer.lastStartTagName = lastStartTag;

    do {
        nextToken = tokenizer.getNextToken();

        //NOTE: if we have parse errors append them to the output sequence
        if (tokenizer.errs.length) {
            for (var i = 0; i < tokenizer.errs.length; i++)
                out.push('ParseError');

            tokenizer.errs = [];
        }

        //NOTE: append current token to the output sequence in html5lib test suite compatible format
        switch (nextToken.type) {
            case Tokenizer.CHARACTER_TOKEN:
                //NOTE: html5lib test suite concatenates all character tokens into one token.
                //So if last entry in output sequence is a character token we just append obtained token
                //to it's data string. Otherwise we create a new character token entry.
                var lastEntry = out[out.length - 1];

                if (util.isArray(lastEntry) && lastEntry[0] === 'Character')
                    lastEntry[1] += nextToken.ch;
                else
                    out.push(['Character', nextToken.ch]);
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

                out.push(startTagEntry);
                break;

            case Tokenizer.END_TAG_TOKEN:
                out.push(['EndTag', nextToken.tagName]);
                break;

            case Tokenizer.COMMENT_TOKEN:
                out.push(['Comment', nextToken.data]);
                break;

            case Tokenizer.DOCTYPE_TOKEN:
                out.push([
                    'DOCTYPE',
                    nextToken.name,
                    nextToken.publicID,
                    nextToken.systemID,
                    !nextToken.forceQuirks
                ]);
                break;
        }
    } while (nextToken.type !== Tokenizer.EOF_TOKEN);

    return out;
}

function unicodeUnescape(str) {
    return str.replace(/\\u([\d\w]{4})/gi, function (match, chCodeStr) {
        return String.fromCharCode(parseInt(chCodeStr, 16));
    });
}

function unescapeDescrIO(testDescr) {
    testDescr.input = unicodeUnescape(testDescr.input);

    testDescr.output.forEach(function (token) {
        if (token === 'ParseError')
            return;

        //NOTE: unescape token tagName (for StartTag and EndTag tokens), comment data (for Comment token),
        //character token data (for Character token).
        token[1] = unicodeUnescape(token[1]);

        //NOTE: unescape token attributes(if we have them).
        if (token.length > 2) {
            Object.keys(token).forEach(function (attrName) {
                var attrVal = token[attrName];

                delete token[attrName];
                token[unicodeUnescape(attrName)] = unicodeUnescape(attrVal);
            });
        }
    });
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

            descr.initialStates.forEach(function (initialState) {
                tests.push({
                    idx: ++testIdx,
                    setName: setName,
                    name: descr.description,
                    input: descr.input,
                    expected: descr.output,
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

        t.deepEqual(out, test.expected);
        t.done();
    };
});
