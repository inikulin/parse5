/* eslint-disable no-console */
import assert from 'node:assert/strict';

const checks = [
    {
        name: 'parse5',
        async run() {
            const { parse, parseFragment, serialize, defaultTreeAdapter } = await import('parse5');
            const doc = parse('<!DOCTYPE html><html><body><p>hi</p></body></html>');
            assert.ok(doc, 'parse() returned a document');
            const fragment = parseFragment('<div>x</div>');
            assert.ok(fragment, 'parseFragment() returned a fragment');
            assert.equal(typeof serialize(doc), 'string', 'serialize() returned a string');
            assert.ok(defaultTreeAdapter, 'defaultTreeAdapter is exported');
        },
    },
    {
        name: 'parse5-htmlparser2-tree-adapter',
        async run() {
            const { parse } = await import('parse5');
            const { adapter } = await import('parse5-htmlparser2-tree-adapter');
            assert.ok(adapter, 'adapter is exported');
            const doc = parse('<p>hi</p>', { treeAdapter: adapter });
            assert.ok(doc, 'parse() with htmlparser2 adapter returned a document');
        },
    },
    {
        name: 'parse5-sax-parser',
        async run() {
            const { SAXParser } = await import('parse5-sax-parser');
            const parser = new SAXParser();
            const tags = [];
            parser.on('startTag', (tag) => tags.push(tag.tagName));
            await new Promise((resolve, reject) => {
                parser.on('finish', resolve);
                parser.on('error', reject);
                parser.end('<p>hello</p>');
            });
            assert.deepEqual(tags, ['p'], 'SAXParser emitted expected startTag');
        },
    },
    {
        name: 'parse5-parser-stream',
        async run() {
            const { ParserStream } = await import('parse5-parser-stream');
            const stream = new ParserStream();
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
                stream.end('<p>hello</p>');
            });
            assert.ok(stream.document, 'ParserStream produced a document');
        },
    },
    {
        name: 'parse5-plain-text-conversion-stream',
        async run() {
            const { PlainTextConversionStream } = await import('parse5-plain-text-conversion-stream');
            const stream = new PlainTextConversionStream();
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
                stream.end('hello world');
            });
            assert.ok(stream.document, 'PlainTextConversionStream produced a document');
        },
    },
    {
        name: 'parse5-html-rewriting-stream',
        async run() {
            const { RewritingStream } = await import('parse5-html-rewriting-stream');
            const stream = new RewritingStream();
            let output = '';
            stream.on('data', (chunk) => {
                output += chunk;
            });
            await new Promise((resolve, reject) => {
                stream.on('finish', resolve);
                stream.on('error', reject);
                stream.end('<p>hello</p>');
            });
            assert.equal(output, '<p>hello</p>', 'RewritingStream passed content through');
        },
    },
];

let failures = 0;
for (const { name, run } of checks) {
    try {
        await run();
        console.log(`ok - ${name}`);
    } catch (error) {
        failures++;
        console.error(`not ok - ${name}`);
        console.error(error);
    }
}

if (failures > 0) {
    console.error(`\n${failures} smoke test(s) failed`);
    // eslint-disable-next-line unicorn-x/no-process-exit
    process.exit(1);
}

console.log(`\nAll ${checks.length} smoke tests passed`);
