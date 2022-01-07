import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeNewLine } from './common.js';

export function loadSAXParserTestData() {
    const dataDirPath = new URL('../data/sax', import.meta.url);
    const testSetFileDirs = fs.readdirSync(dataDirPath);
    const tests = [];

    for (const dirName of testSetFileDirs) {
        const srcFilePath = path.join(dataDirPath.pathname, dirName, 'src.html');
        const expectedFilePath = path.join(dataDirPath.pathname, dirName, 'expected.html');
        const src = fs.readFileSync(srcFilePath).toString();
        const expected = fs.readFileSync(expectedFilePath).toString();

        tests.push({
            name: dirName,
            src: normalizeNewLine(src),
            expected: normalizeNewLine(expected),
        });
    }

    return tests;
}
