import * as fs from 'fs';
import * as path from 'path';
import { normalizeNewLine } from './common.js';

export function loadSAXParserTestData() {
    const dataDirPath = path.join(__dirname, '../data/sax');
    const testSetFileDirs = fs.readdirSync(dataDirPath);
    const tests = [];

    testSetFileDirs.forEach((dirName) => {
        const srcFilePath = path.join(dataDirPath, dirName, 'src.html');
        const expectedFilePath = path.join(dataDirPath, dirName, 'expected.html');
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
