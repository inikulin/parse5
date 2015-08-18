'use strict';

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var mocha = require('gulp-mocha');
var install = require('gulp-install');
var benchmark = require('gulp-benchmark');
var rename = require('gulp-rename');
var download = require('gulp-download');
var through = require('through2');


gulp.task('generate-trie', function () {
    function trieGenerator(file, enc, callback) {
        var entitiesData = JSON.parse(file.contents.toString());

        var trie = Object.keys(entitiesData).reduce(function (trie, entity) {
            var codepoints = entitiesData[entity].codepoints;

            entity = entity.replace(/^&/, '');

            var last = entity.length - 1,
                leaf = trie;

            entity
                .split('')
                .map(function (ch) {
                    return ch.charCodeAt(0);
                })
                .forEach(function (key, idx) {
                    if (!leaf[key])
                        leaf[key] = {};

                    if (idx === last)
                        leaf[key].c = codepoints;

                    else {
                        if (!leaf[key].l)
                            leaf[key].l = {};

                        leaf = leaf[key].l;
                    }
                });

            return trie;
        }, {});

        var out = '\'use strict\';\n\n' +
                  '//NOTE: this file contains auto-generated trie structure that is used for named entity references consumption\n' +
                  '//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references and\n' +
                  '//http://www.whatwg.org/specs/web-apps/current-work/multipage/named-character-references.html#named-character-references)\n' +
                  'module.exports = ' + JSON.stringify(trie).replace(/"/g, '') + ';\n';


        file.contents = new Buffer(out);

        callback(null, file);
    }

    return download('https://html.spec.whatwg.org/multipage/entities.json')
        .pipe(through.obj(trieGenerator))
        .pipe(rename('named_entity_trie.js'))
        .pipe(gulp.dest('lib/tokenization'));
});

gulp.task('install-upstream-parse5', function () {
    return gulp
        .src('test/benchmark/package.json')
        .pipe(install());
});

gulp.task('benchmark', ['install-upstream-parse5'], function () {
    return gulp
        .src('test/benchmark/*.js', {read: false})
        .pipe(benchmark({
            failOnError: true,
            reporters: benchmark.reporters.etalon('Upstream')
        }));
});

gulp.task('lint', function () {
    return gulp
        .src([
            'src/**/*.js',
            'test/**/*.js',
            '!test/benchmark/node_modules/**/*.js',
            'Gulpfile.js'
        ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('test', ['lint'], function () {
    return gulp
        .src('test/fixtures/*_test.js')
        .pipe(mocha({
            ui: 'exports',
            reporter: 'progress',
            timeout: typeof v8debug === 'undefined' ? 2000 : Infinity // NOTE: disable timeouts in debug
        }));
});
