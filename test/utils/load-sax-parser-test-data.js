import * as fs from 'fs';
import * as path from 'path';
import { normalizeNewLine } from './common.js';

export function loadSAXParserTestData() {
    const dataDirPath = new URL('../data/sax', import.meta.url);
    const testSetFileDirs = fs.readdirSync(dataDirPath);
    const tests = [];

    testSetFileDirs.forEach((dirName) => {
        const srcFilePath = path.join(dataDirPath.pathname, dirName, 'src.html');
        const expectedFilePath = path.join(dataDirPath.pathname, dirName, 'expected.html');
        const src = fs.readFileSync(srcFilePath).toString();
        const expected = fs.readFileSync(expectedFilePath).toString();

        tests.push({
            name: dirName,
            src: normalizeNewLine(src),
            expected: normalizeNewLine(expected),
        });
    });

    return tests;
}
