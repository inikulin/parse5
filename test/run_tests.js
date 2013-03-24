var fs = require('fs'),
    path = require('path');

var dirPath = path.join(__dirname,  './fixtures'),
    testFiles = fs.readdirSync(dirPath),
    reporter = require('nodeunit').reporters.default;

process.chdir(dirPath);
reporter.run(testFiles);