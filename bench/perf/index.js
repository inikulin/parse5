import { readFileSync, createReadStream, readdirSync } from 'node:fs';
import Benchmark from 'benchmark';
import { loadTreeConstructionTestData } from 'parse5-test-utils/dist/generate-parsing-tests.js';
import { loadSAXParserTestData } from 'parse5-test-utils/dist/load-sax-parser-test-data.js';
import { treeAdapters, WritableStreamStub, finished } from 'parse5-test-utils/dist/common.js';
import * as parse5 from '../../packages/parse5/dist/index.js';
import { ParserStream as parse5Stream } from '../../packages/parse5-parser-stream/dist/index.js';
import * as parse5Upstream from 'parse5';

const hugePagePath = new URL('../../test/data/huge-page/huge-page.html', import.meta.url);
const treeConstructionPath = new URL('../../test/data/html5lib-tests/tree-construction', import.meta.url);
const saxPath = new URL('../../test/data/sax/', import.meta.url);

//HACK: https://github.com/bestiejs/benchmark.js/issues/51
/* global workingCopy, WorkingCopyParserStream, upstreamParser, hugePage, microTests, runMicro, runPages, files */
global.workingCopy = parse5;
global.WorkingCopyParserStream = parse5Stream;
global.upstreamParser = parse5Upstream;

// Huge page data
global.hugePage = readFileSync(hugePagePath).toString();

// Micro data
global.microTests = loadTreeConstructionTestData(treeConstructionPath, treeAdapters.default)
    .filter(
        (test) =>
            //NOTE: this test caused a stack overflow in parse5 v1.x
            test.input !== '<button><p><button>'
    )
    .map((test) => ({
        html: test.input,
        fragmentContext: test.fragmentContext,
    }));

global.runMicro = function (parser) {
    for (const test of microTests) {
        if (test.fragmentContext) {
            parser.parseFragment(test.fragmentContext, test.html);
        } else {
            parser.parse(test.html);
        }
    }
};

// Pages data
const pages = loadSAXParserTestData().map((test) => test.src);

global.runPages = function (parser) {
    for (const page of pages) {
        parser.parse(page);
    }
};

// Stream data
global.files = readdirSync(saxPath).map((dirName) => new URL(`${dirName}/src.html`, saxPath).pathname);

// Utils
function getHz(suite, testName) {
    for (let i = 0; i < suite.length; i++) {
        if (suite[i].name === testName) {
            return suite[i].hz;
        }
    }
}

function runBench({ name, workingCopyFn, upstreamFn, defer = false }) {
    const suite = new Benchmark.Suite(name);

    suite
        .add('Working copy', workingCopyFn, { defer })
        .add('Upstream', upstreamFn, { defer })
        .on('start', () => console.log(name))
        .on('cycle', (event) => console.log(String(event.target)))
        .on('complete', () => {
            const workingCopyHz = getHz(suite, 'Working copy');
            const upstreamHz = getHz(suite, 'Upstream');

            if (workingCopyHz > upstreamHz) {
                console.log(`Working copy is ${(workingCopyHz / upstreamHz).toFixed(2)}x faster.\n`);
            } else {
                console.log(`Working copy is ${(upstreamHz / workingCopyHz).toFixed(2)}x slower.\n`);
            }
        })
        .run();
}

// Benchmarks
runBench({
    name: 'parse5 regression benchmark - MICRO',
    workingCopyFn: () => runMicro(workingCopy),
    upstreamFn: () => runMicro(upstreamParser),
});

runBench({
    name: 'parse5 regression benchmark - HUGE',
    workingCopyFn: () => workingCopy.parse(hugePage),
    upstreamFn: () => upstreamParser.parse(hugePage),
});

runBench({
    name: 'parse5 regression benchmark - PAGES',
    workingCopyFn: () => runPages(workingCopy),
    upstreamFn: () => runPages(upstreamParser),
});

runBench({
    name: 'parse5 regression benchmark - STREAM',
    defer: true,
    workingCopyFn: async (deferred) => {
        const parsePromises = files.map((fileName) => {
            const stream = createReadStream(fileName, 'utf8');
            const parserStream = new WorkingCopyParserStream();

            stream.pipe(parserStream);
            return finished(parserStream);
        });

        await Promise.all(parsePromises);
        deferred.resolve();
    },
    upstreamFn: async (deferred) => {
        const parsePromises = files.map(async (fileName) => {
            const stream = createReadStream(fileName, 'utf8');
            const writable = new WritableStreamStub();

            stream.pipe(writable);

            await finished(writable);

            upstreamParser.parse(writable.writtenData);
        });

        await Promise.all(parsePromises);
        deferred.resolve();
    },
});
