import gulp from 'gulp'
import gulpLoadPlugins from 'gulp-load-plugins'
import del from 'del'

const plugins = gulpLoadPlugins()

// Utils Tasks
export const clean = () => del(['dist/*'])

// Build Tasks
export const buildCopy = () => gulp
  .src([
    'LICENSE',
    'README.md',
    'package.json',
    'config.example.json',
    'gulp-sftp-patch4.js'
  ])
  .pipe(gulp.dest('dist'))

export const buildBabel = () => gulp
  .src('index.js')
  .pipe(plugins.babel())
  .pipe(gulp.dest('dist'))

// Orchestrators
export const createPackage = done => {
  return gulp.series(
    clean,
    gulp.parallel(
      buildBabel, buildCopy
    )
  )(done)
}
