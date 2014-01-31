var fs = require('fs'),
    path = require('path'),
    reporter = require('nodeunit').reporters.default;

var dirName = path.join(__dirname, './fixtures'),
    testFiles = fs.readdirSync(dirName);

process.chdir(dirName);
reporter.run(testFiles);

