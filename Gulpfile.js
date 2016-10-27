'use strict';

var fork = require('child_process').fork,
    gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    mocha = require('gulp-mocha'),
    install = require('gulp-install'),
    benchmark = require('gulp-benchmark'),
    rename = require('gulp-rename'),
    download = require('gulp-download'),
    through = require('through2'),
    concat = require('gulp-concat'),
    jsdoc = require('gulp-jsdoc-to-markdown'),
    insert = require('gulp-insert'),
    generateNamedEntityData = require('./scripts/generate_named_entity_data'),
    generateParserFeedbackTest = require('./scripts/generate_parser_feedback_test');


// Docs
gulp.task('update-api-reference', function () {
    return gulp
        .src('lib/**/*.js')
        .pipe(concat('05_api_reference.md'))
        .pipe(jsdoc())
        .pipe(insert.prepend('# API Reference\n'))
        .pipe(gulp.dest('docs'));
});

gulp.task('docs', ['update-api-reference'], function () {
    return gulp
        .src('docs/*.md')
        .pipe(concat('index.md'))
        .pipe(gulp.dest('docs/build'));
});


// Benchmarks
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

gulp.task('install-memory-benchmark-dependencies', function () {
    return gulp
        .src('test/memory_benchmark/package.json')
        .pipe(install());
});

gulp.task('sax-parser-memory-benchmark', ['install-memory-benchmark-dependencies'], function (done) {
    fork('./test/memory_benchmark/sax_parser').once('close', done);
});

gulp.task('named-entity-data-memory-benchmark', function (done) {
    fork('./test/memory_benchmark/named_entity_data').once('close', done);
});


// Test
gulp.task('lint', function () {
    return gulp
        .src([
            'lib/**/*.js',
            'test/**/*.js',
            'scripts/**/*.js',
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


// Scripts
gulp.task('update-feedback-tests', function () {
    return gulp
        .src(['test/data/tree_construction/*.dat', 'test/data/tree_construction_regression/*.dat'])
        .pipe(through.obj(function (file, encoding, callback) {
            var test = generateParserFeedbackTest(file.contents.toString());

            file.contents = new Buffer(test);

            callback(null, file);
        }))
        .pipe(rename({extname: '.test'}))
        .pipe(gulp.dest('test/data/parser_feedback'));
});


gulp.task('update-named-entities-data', function () {
    return download('https://html.spec.whatwg.org/multipage/entities.json')
        .pipe(through.obj(function (file, encoding, callback) {
            var entitiesData = JSON.parse(file.contents.toString());

            file.contents = new Buffer(generateNamedEntityData(entitiesData));

            callback(null, file);
        }))
        .pipe(rename('named_entity_data.js'))
        .pipe(gulp.dest('lib/tokenizer'));
});
