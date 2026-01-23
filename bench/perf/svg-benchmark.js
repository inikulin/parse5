/* eslint-disable no-console */
/**
 * SVG Parsing Benchmark
 *
 * Tests parse5's performance with SVG content specifically.
 * SVG parsing involves foreign content handling which may have different
 * performance characteristics than regular HTML.
 */

import Benchmark from 'benchmark';
import * as parse5 from '../../packages/parse5/dist/index.js';
import * as parse5Upstream from 'parse5';

// Generate various SVG test cases

// Simple SVG with basic shapes
function generateSimpleSvg(shapeCount) {
    const shapes = [];
    for (let i = 0; i < shapeCount; i++) {
        const x = (i % 10) * 50;
        const y = Math.floor(i / 10) * 50;
        shapes.push(`<rect x="${x}" y="${y}" width="40" height="40" fill="blue" stroke="black" stroke-width="2"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">${shapes.join('')}</svg>`;
}

// SVG with paths (common in real-world SVGs)
function generatePathSvg(pathCount) {
    const paths = [];
    for (let i = 0; i < pathCount; i++) {
        // Generate a simple path with multiple commands
        const d = `M${i * 10},${i * 5} L${i * 10 + 50},${i * 5 + 30} Q${i * 10 + 25},${i * 5 + 60} ${i * 10},${i * 5 + 30} Z`;
        paths.push(`<path d="${d}" fill="none" stroke="red" stroke-width="1"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">${paths.join('')}</svg>`;
}

// SVG with nested groups and transforms
function generateNestedSvg(depth, elementsPerLevel) {
    function generateLevel(currentDepth) {
        if (currentDepth >= depth) {
            const elements = [];
            for (let i = 0; i < elementsPerLevel; i++) {
                elements.push(`<circle cx="${i * 20}" cy="${i * 20}" r="10" fill="green"/>`);
            }
            return elements.join('');
        }

        const children = generateLevel(currentDepth + 1);
        return `<g transform="translate(${currentDepth * 10}, ${currentDepth * 10})">${children}</g>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">${generateLevel(0)}</svg>`;
}

// SVG with many attributes (common in exported SVGs)
function generateAttributeHeavySvg(elementCount, attrsPerElement) {
    const elements = [];
    for (let i = 0; i < elementCount; i++) {
        const attrs = [`id="elem-${i}"`, `class="shape shape-${i % 10}"`];
        for (let j = 0; j < attrsPerElement; j++) {
            attrs.push(`data-attr-${j}="value-${j}"`);
        }
        elements.push(`<rect ${attrs.join(' ')} x="${i}" y="${i}" width="10" height="10"/>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">${elements.join('')}</svg>`;
}

// SVG with text elements
function generateTextSvg(textCount) {
    const texts = [];
    for (let i = 0; i < textCount; i++) {
        texts.push(`<text x="${i * 10}" y="${i * 20}" font-family="Arial" font-size="12">Text ${i}</text>`);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">${texts.join('')}</svg>`;
}

// SVG embedded in HTML (common real-world scenario)
function generateHtmlWithSvg(svgCount, shapesPerSvg) {
    const svgs = [];
    for (let i = 0; i < svgCount; i++) {
        svgs.push(`<div class="icon">${generateSimpleSvg(shapesPerSvg)}</div>`);
    }
    return `<!DOCTYPE html><html><head><title>SVG Test</title></head><body>${svgs.join('')}</body></html>`;
}

// Real-world-like SVG icon
const realWorldIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M12 6v6l4 2"/>
  <line x1="12" y1="2" x2="12" y2="4"/>
  <line x1="12" y1="20" x2="12" y2="22"/>
  <line x1="2" y1="12" x2="4" y2="12"/>
  <line x1="20" y1="12" x2="22" y2="12"/>
</svg>
`;

// Generate test data
const simpleSvg100 = generateSimpleSvg(100);
const simpleSvg500 = generateSimpleSvg(500);
const pathSvg100 = generatePathSvg(100);
const pathSvg500 = generatePathSvg(500);
const nestedSvg10x10 = generateNestedSvg(10, 10);
const nestedSvg20x5 = generateNestedSvg(20, 5);
const attrHeavySvg = generateAttributeHeavySvg(100, 20);
const textSvg100 = generateTextSvg(100);
const htmlWithSvg10 = generateHtmlWithSvg(10, 20);
const htmlWithSvg50 = generateHtmlWithSvg(50, 10);
const manyIcons = realWorldIcon.repeat(100);

console.log('=== SVG Parsing Benchmark ===\n');
console.log(`Node.js version: ${process.version}\n`);

// Log test data sizes
console.log('Test data sizes:');
console.log(`  Simple SVG (100 shapes): ${simpleSvg100.length} bytes`);
console.log(`  Simple SVG (500 shapes): ${simpleSvg500.length} bytes`);
console.log(`  Path SVG (100 paths): ${pathSvg100.length} bytes`);
console.log(`  Path SVG (500 paths): ${pathSvg500.length} bytes`);
console.log(`  Nested SVG (10x10): ${nestedSvg10x10.length} bytes`);
console.log(`  Nested SVG (20x5): ${nestedSvg20x5.length} bytes`);
console.log(`  Attribute-heavy SVG: ${attrHeavySvg.length} bytes`);
console.log(`  Text SVG (100): ${textSvg100.length} bytes`);
console.log(`  HTML with 10 SVGs: ${htmlWithSvg10.length} bytes`);
console.log(`  HTML with 50 SVGs: ${htmlWithSvg50.length} bytes`);
console.log(`  100 real-world icons: ${manyIcons.length} bytes`);
console.log('');

function getHz(suite, testName) {
    for (let i = 0; i < suite.length; i++) {
        if (suite[i].name === testName) {
            return suite[i].hz;
        }
    }
    return 0;
}

function runBench({ name, workingCopyFn, upstreamFn }) {
    const suite = new Benchmark.Suite(name);

    suite
        .add('Working copy', workingCopyFn)
        .add('Upstream', upstreamFn)
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

// Run benchmarks
console.log('--- SVG Fragment Parsing (parseFragment with SVG context) ---\n');

const svgContext = { tagName: 'svg', namespaceURI: 'http://www.w3.org/2000/svg' };

runBench({
    name: 'SVG Fragment - Simple shapes (100)',
    workingCopyFn: () => parse5.parseFragment(svgContext, simpleSvg100),
    upstreamFn: () => parse5Upstream.parseFragment(svgContext, simpleSvg100),
});

runBench({
    name: 'SVG Fragment - Simple shapes (500)',
    workingCopyFn: () => parse5.parseFragment(svgContext, simpleSvg500),
    upstreamFn: () => parse5Upstream.parseFragment(svgContext, simpleSvg500),
});

runBench({
    name: 'SVG Fragment - Paths (100)',
    workingCopyFn: () => parse5.parseFragment(svgContext, pathSvg100),
    upstreamFn: () => parse5Upstream.parseFragment(svgContext, pathSvg100),
});

runBench({
    name: 'SVG Fragment - Nested groups (10 deep, 10 elements)',
    workingCopyFn: () => parse5.parseFragment(svgContext, nestedSvg10x10),
    upstreamFn: () => parse5Upstream.parseFragment(svgContext, nestedSvg10x10),
});

runBench({
    name: 'SVG Fragment - Attribute heavy',
    workingCopyFn: () => parse5.parseFragment(svgContext, attrHeavySvg),
    upstreamFn: () => parse5Upstream.parseFragment(svgContext, attrHeavySvg),
});

console.log('--- SVG in HTML Document Parsing ---\n');

runBench({
    name: 'HTML with embedded SVGs (10 SVGs)',
    workingCopyFn: () => parse5.parse(htmlWithSvg10),
    upstreamFn: () => parse5Upstream.parse(htmlWithSvg10),
});

runBench({
    name: 'HTML with embedded SVGs (50 SVGs)',
    workingCopyFn: () => parse5.parse(htmlWithSvg50),
    upstreamFn: () => parse5Upstream.parse(htmlWithSvg50),
});

runBench({
    name: 'Many real-world icons (100)',
    workingCopyFn: () => parse5.parseFragment(svgContext, manyIcons),
    upstreamFn: () => parse5Upstream.parseFragment(svgContext, manyIcons),
});

console.log('--- Comparison: SVG vs equivalent HTML complexity ---\n');

// Generate equivalent HTML for comparison
const htmlEquivalent = `<!DOCTYPE html><html><head></head><body>${Array.from(
    { length: 100 },
    (_, i) =>
        `<div id="elem-${i}" class="shape" style="position:absolute;left:${i}px;top:${i}px;width:40px;height:40px;background:blue;border:2px solid black;"></div>`,
).join('')}</body></html>`;

runBench({
    name: 'HTML with 100 divs (baseline)',
    workingCopyFn: () => parse5.parse(htmlEquivalent),
    upstreamFn: () => parse5Upstream.parse(htmlEquivalent),
});

runBench({
    name: 'SVG with 100 rects (comparison)',
    workingCopyFn: () => parse5.parse(`<!DOCTYPE html><html><head></head><body>${simpleSvg100}</body></html>`),
    upstreamFn: () => parse5Upstream.parse(`<!DOCTYPE html><html><head></head><body>${simpleSvg100}</body></html>`),
});

console.log('=== SVG Benchmark Complete ===');
