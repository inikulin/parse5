var gulp  = require('gulp');
var babel = require('gulp-babel');
var mocha = require('gulp-mocha');


gulp.task('build', function () {
    return gulp
        .src('src/**/*.js')
        .pipe(babel())
        .pipe(gulp.dest('lib'));
});

gulp.task('test', ['build'], function () {
    return gulp
        .src('test/fixtures/*-test.js')
        .pipe(mocha({
            ui:       'exports',
            reporter: 'progress',
            timeout:  typeof v8debug === 'undefined' ? 2000 : Infinity // NOTE: disable timeouts in debug
        }));
});

