let { readFile, writeFile } = require('fs');
const { promisify } = require('util');
const { basename } = require('path');
const Parser = require('../../packages/parse5/lib/parser');
const Tokenizer = require('../../packages/parse5/lib/tokenizer');
const defaultTreeAdapter = require('../../packages/parse5/lib/tree-adapters/default');
const { convertTokenToHtml5Lib } = require('../../test/utils/generate-tokenization-tests');
const parseDatFile = require('../../test/utils/parse-dat-file');
const { addSlashes } = require('../../test/test/utils/common');

readFile = promisify(readFile);
writeFile = promisify(writeFile);

main();

async function main() {
    const convertPromises = process.argv.slice(2).map(async file => {
        const content = await readFile(file, 'utf-8');
        const feedbackTestContent = generateParserFeedbackTest(content);
        const feedbackTestFile = `test/data/parser-feedback/${basename(file, '.dat')}.test`;

        await writeFile(feedbackTestFile, feedbackTestContent);
    });

    await Promise.all(convertPromises);
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
    }

    dest.push(token);

    return true;
}

function collectParserTokens(html) {
    const tokens = [];
    const parser = new Parser();

    parser._processInputToken = function(token) {
        Parser.prototype._processInputToken.call(this, token);

        // NOTE: Needed to split attributes of duplicate <html> and <body>
        // which are otherwise merged as per tree constructor spec
        if (token.type === Tokenizer.START_TAG_TOKEN) {
            token.attrs = token.attrs.slice();
        }

        appendToken(tokens, token);
    };

    parser.parse(html);

    return tokens.map(convertTokenToHtml5Lib);
}

function generateParserFeedbackTest(parserTestFile) {
    const tests = parseDatFile(parserTestFile, defaultTreeAdapter);

    const feedbackTest = {
        tests: tests
            .filter(test => !test.fragmentContext) // TODO
            .map(test => {
                const input = test.input;

                return {
                    description: addSlashes(input),
                    input,
                    output: collectParserTokens(input)
                };
            })
    };

    return JSON.stringify(feedbackTest, null, 4);
}
