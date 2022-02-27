import * as assert from 'node:assert';
import { Tokenizer, TokenizerMode } from './index.js';
import { SinglePathHandler } from './queued.js';
import { Location, EOFToken, Token } from '../common/token.js';
import { getSubstringByLineCol, normalizeNewLine } from 'parse5-test-utils/utils/common.js';

interface LocationInfoTestCase {
    initialMode: typeof TokenizerMode[keyof typeof TokenizerMode];
    lastStartTagName: string;
    htmlChunks: string[];
}

/** Receives events and immediately compares them against the expected values. */
class LocationInfoHandler extends SinglePathHandler {
    public sawEof = false;
    /** The index of the last html chunk. */
    private idx = 0;
    /** All of the lines in the input. */
    private lines: string[];

    constructor(private testCase: LocationInfoTestCase, private html: string) {
        super();
        this.lines = html.split(/\r?\n/g);
    }

    protected handleToken(token: Token): void {
        this.validateLocation(token.location);
    }

    private validateLocation(location: Location | null): void {
        assert.ok(location);

        //Offsets
        const actual = this.html.substring(location.startOffset, location.endOffset);
        const chunk = this.testCase.htmlChunks[this.idx];

        assert.strictEqual(actual, chunk);

        //Line/col
        const line = getSubstringByLineCol(this.lines, location);
        const expected = normalizeNewLine(chunk);

        assert.strictEqual(line, expected);

        this.idx += 1;
    }

    override onEof({ location }: EOFToken): void {
        assert.ok(location);
        assert.strictEqual(location.endOffset, location.startOffset);
        assert.strictEqual(location.endOffset, this.html.length);

        assert.strictEqual(this.idx, this.testCase.htmlChunks.length);

        this.sawEof = true;
    }
}

it('Location Info (Tokenizer)', () => {
    const testCases = [
        {
            initialMode: TokenizerMode.DATA,
            lastStartTagName: '',
            htmlChunks: [
                '\r\n',
                '<!DOCTYPE html>',
                '\n',
                '<!-- Test -->',
                '\n',
                '<head>',
                '\n   ',
                '<meta charset="utf-8">',
                '<title>',
                '   ',
                'node.js',
                '\u0000',
                '</title>',
                '\n',
                '</head>',
                '\n',
                '<body id="front">',
                '\n',
                '<div id="intro">',
                '\n   ',
                '<p\n>',
                '\n       ',
                'Node.js',
                ' ',
                'is',
                ' ',
                'a',
                '\n       ',
                'platform',
                ' ',
                'built',
                ' ',
                'on',
                '\n       ',
                '<a href="http://code.google.com/p/v8/">',
                '\n       ',
                "Chrome's",
                ' ',
                'JavaScript',
                ' ',
                'runtime',
                '\n       ',
                '</a>',
                '\n',
                '</div>',
                '</body>',
            ],
        },
        {
            initialMode: TokenizerMode.RCDATA,
            lastStartTagName: 'title',
            htmlChunks: ['<div>Test', ' \n   ', 'hey', ' ', 'ya!', '</title>', '<!--Yo-->'],
        },
        {
            initialMode: TokenizerMode.RAWTEXT,
            lastStartTagName: 'style',
            htmlChunks: ['.header{', ' \n   ', 'color:red;', '\n', '}', '</style>', 'Some', ' ', 'text'],
        },
        {
            initialMode: TokenizerMode.SCRIPT_DATA,
            lastStartTagName: 'script',
            htmlChunks: ['var', ' ', 'a=c', ' ', '-', ' ', 'd;', '\n', 'a<--d;', '</script>', '<div>'],
        },
        {
            initialMode: TokenizerMode.PLAINTEXT,
            lastStartTagName: 'plaintext',
            htmlChunks: ['Text', ' \n', 'Test</plaintext><div>'],
        },
        {
            initialMode: TokenizerMode.DATA,
            lastStartTagName: '',
            htmlChunks: [
                '\n',
                '<!-- regular comment -->',
                '<! bogus comment >',
                '<? another bogus comment >',
                '</!yet another bogus comment>',
                '<![CDATA[ cdata as a bogus comment >',
            ],
        },
        {
            initialMode: TokenizerMode.DATA,
            lastStartTagName: '',
            inForeignNode: true,
            htmlChunks: ['<a>', '<![CDATA[ ', 'CDATA', ' ]]>', '<test>', ' <![CDATA[ ]]>\n'],
        },
    ];

    for (const testCase of testCases) {
        const html = testCase.htmlChunks.join('');
        const handler = new LocationInfoHandler(testCase, html);
        const tokenizer = new Tokenizer({ sourceCodeLocationInfo: true }, handler);
        const lastChunkIdx = testCase.htmlChunks.length - 1;

        for (let i = 0; i < testCase.htmlChunks.length; i++) {
            tokenizer.write(testCase.htmlChunks[i], i === lastChunkIdx);
        }

        // NOTE: set small waterline for testing purposes
        tokenizer.preprocessor.bufferWaterline = 8;
        tokenizer.state = testCase.initialMode;
        tokenizer.lastStartTagName = testCase.lastStartTagName;
        tokenizer.inForeignNode = !!testCase.inForeignNode;

        while (!handler.sawEof) {
            tokenizer.getNextToken();
        }
    }
});
