import { readFileSync, createReadStream, readdirSync } from 'node:fs';
import { Bench } from 'tinybench';
import { loadTreeConstructionTestData } from 'parse5-test-utils/dist/generate-parsing-tests.js';
import { loadSAXParserTestData } from 'parse5-test-utils/dist/load-sax-parser-test-data.js';
import { treeAdapters, WritableStreamStub, finished } from 'parse5-test-utils/dist/common.js';
import * as workingCopy from '../../packages/parse5/dist/index.js';
import { ParserStream as WorkingCopyParserStream } from '../../packages/parse5-parser-stream/dist/index.js';
import * as upstreamParser from 'parse5';

/* eslint-disable no-console */

const hugePagePath = new URL('../../test/data/huge-page/huge-page.html', import.meta.url);
const treeConstructionPath = new URL('../../test/data/html5lib-tests/tree-construction', import.meta.url);
const saxPath = new URL('../../test/data/sax/', import.meta.url);

// Huge page data
const hugePage = readFileSync(hugePagePath).toString();

// Micro data
const microTests = loadTreeConstructionTestData(treeConstructionPath, treeAdapters.default)
    .filter(
        (test) =>
            //NOTE: this test caused a stack overflow in parse5 v1.x
            test.input !== '<button><p><button>',
    )
    .map((test) => ({
        html: test.input,
        fragmentContext: test.fragmentContext,
    }));

function runMicro(parser) {
    for (const test of microTests) {
        if (test.fragmentContext) {
            parser.parseFragment(test.fragmentContext, test.html);
        } else {
            parser.parse(test.html);
        }
    }
}

// Pages data
const pages = loadSAXParserTestData().map((test) => test.src);

function runPages(parser) {
    for (const page of pages) {
        parser.parse(page);
    }
}

// Stream data
const files = readdirSync(saxPath).map((dirName) => new URL(`${dirName}/src.html`, saxPath).pathname);

// Utils
async function runBench({ name, workingCopyFn, upstreamFn }) {
    const bench = new Bench({ name });

    bench.add('Working copy', workingCopyFn).add('Upstream', upstreamFn);

    console.log(name);
    await bench.run();
    console.table(bench.table());

    const [workingCopyResult, upstreamResult] = bench.tasks.map((task) => task.result);

    if (workingCopyResult.state !== 'completed' || upstreamResult.state !== 'completed') {
        throw new Error(`${name} did not complete`, { cause: workingCopyResult.error ?? upstreamResult.error });
    }

    const workingCopyHz = workingCopyResult.throughput.mean;
    const upstreamHz = upstreamResult.throughput.mean;

    if (workingCopyHz > upstreamHz) {
        console.log(`Working copy is ${(workingCopyHz / upstreamHz).toFixed(2)}x faster.\n`);
    } else {
        console.log(`Working copy is ${(upstreamHz / workingCopyHz).toFixed(2)}x slower.\n`);
    }
}

// Benchmarks
await runBench({
    name: 'parse5 regression benchmark - MICRO',
    workingCopyFn: () => runMicro(workingCopy),
    upstreamFn: () => runMicro(upstreamParser),
});

await runBench({
    name: 'parse5 regression benchmark - HUGE',
    workingCopyFn: () => workingCopy.parse(hugePage),
    upstreamFn: () => upstreamParser.parse(hugePage),
});

await runBench({
    name: 'parse5 regression benchmark - PAGES',
    workingCopyFn: () => runPages(workingCopy),
    upstreamFn: () => runPages(upstreamParser),
});

await runBench({
    name: 'parse5 regression benchmark - STREAM',
    workingCopyFn: async () => {
        const parsePromises = files.map((fileName) => {
            const stream = createReadStream(fileName, 'utf8');
            const parserStream = new WorkingCopyParserStream();

            stream.pipe(parserStream);
            return finished(parserStream);
        });

        await Promise.all(parsePromises);
    },
    upstreamFn: async () => {
        const parsePromises = files.map(async (fileName) => {
            const stream = createReadStream(fileName, 'utf8');
            const writable = new WritableStreamStub();

            stream.pipe(writable);

            await finished(writable);

            upstreamParser.parse(writable.writtenData);
        });

        await Promise.all(parsePromises);
    },
});
