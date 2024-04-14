import * as fs from 'node:fs';
import path from 'node:path';
import { normalizeNewLine } from './common.js';

export function loadSAXParserTestData(): { name: string; src: string; expected: string }[] {
    const dataDirPath = new URL('../data/sax', import.meta.url);
    const testSetFileDirs = fs.readdirSync(dataDirPath);

    return testSetFileDirs.map((dirName) => {
        const srcFilePath = path.join(dataDirPath.pathname, dirName, 'src.html');
        const expectedFilePath = path.join(dataDirPath.pathname, dirName, 'expected.html');
        const src = fs.readFileSync(srcFilePath).toString();
        const expected = fs.readFileSync(expectedFilePath).toString();

        return {
            name: dirName,
            src: normalizeNewLine(src),
            expected: normalizeNewLine(expected),
        };
    });
}
