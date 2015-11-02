'use strict';

var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    mocha = require('gulp-mocha'),
    install = require('gulp-install'),
    benchmark = require('gulp-benchmark'),
    rename = require('gulp-rename'),
    download = require('gulp-download'),
    through = require('through2'),
    concat = require('gulp-concat'),
    jsdoc = require('gulp-jsdoc-to-markdown'),
    insert = require('gulp-insert');


gulp.task('generate-trie', function () {
    function createTrie(entitiesData) {
        return Object.keys(entitiesData).reduce(function (trie, entity) {
            var resultCp = entitiesData[entity].codepoints;

            entity = entity.replace(/^&/, '');

            var entityLength = entity.length,
                last = entityLength - 1,
                leaf = trie;

            for (var i = 0; i < entityLength; i++) {
                var key = entity.charCodeAt(i);

                if (!leaf[key])
                    leaf[key] = {};

                if (i === last)
                    leaf[key].c = resultCp;

                else {
                    if (!leaf[key].l)
                        leaf[key].l = {};

                    leaf = leaf[key].l;
                }
            }

            return trie;
        }, {});
    }

    function trieCodeGen(file, encoding, callback) {
        var entitiesData = JSON.parse(file.contents.toString()),
            trie = createTrie(entitiesData),
            out = '\'use strict\';\n\n' +
                  '//NOTE: this file contains auto-generated trie structure that is used for named entity references consumption\n' +
                  '//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references and\n' +
                  '//http://www.whatwg.org/specs/web-apps/current-work/multipage/named-character-references.html#named-character-references)\n' +
                  'module.exports = ' + JSON.stringify(trie).replace(/"/g, '') + ';\n';


        file.contents = new Buffer(out);

        callback(null, file);
    }

    return download('https://html.spec.whatwg.org/multipage/entities.json')
        .pipe(through.obj(trieCodeGen))
        .pipe(rename('named_entity_trie.js'))
        .pipe(gulp.dest('lib/tokenizer'));
});

gulp.task('generate-api-reference', function () {
    return gulp
        .src('lib/**/*.js')
        .pipe(concat('04_api_reference.md'))
        .pipe(jsdoc())
        .pipe(insert.prepend('# API Reference\n'))
        .pipe(gulp.dest('docs'));
});

gulp.task('docs', ['generate-api-reference'], function () {
    return gulp
        .src('docs/*.md')
        .pipe(concat('index.md'))
        .pipe(gulp.dest('docs/build'));
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
            'lib/**/*.js',
            'test/**/*.js',
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
            timeout: typeof v8debug === 'undefined' ? 20000 : Infinity // NOTE: disable timeouts in debug
        }));
});
