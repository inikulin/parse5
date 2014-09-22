var fs = require('fs'),
    path = require('path'),
    reporter = require('nodeunit').reporters.minimal;

var dirName = path.join(__dirname, './fixtures'),
    testFiles = fs.readdirSync(dirName);

process.chdir(dirName);

reporter.run(testFiles, null, function (err) {
    if (err) {
        setTimeout(function () {
            process.exit(1);
        });
    }
});

