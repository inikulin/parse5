import { readFileSync, writeFileSync } from 'node:fs';

// Oxfmt skips npm lockfiles. Keep the indentation npm reads from the existing file.
const lockfile = new URL('../package-lock.json', import.meta.url);
const contents = readFileSync(lockfile, 'utf8');
const formatted = `${JSON.stringify(JSON.parse(contents), null, 4)}\n`;

if (contents !== formatted) {
    if (process.argv.includes('--check')) {
        process.stderr.write('package-lock.json is not formatted. Run npm run format.\n');
        process.exitCode = 1;
    } else {
        writeFileSync(lockfile, formatted);
    }
}
