import gulp from 'gulp'
import webpack from 'webpack'
import gulpLoadPlugins from 'gulp-load-plugins'
import image from 'gulp-image'
import minimist from 'minimist'
import del from 'del'
import lazypipe from 'lazypipe'
import normalize from 'normalize-path'
import webpackStream from 'webpack-stream'
import pkgInfo from 'pkginfo'
import {
  readFileSync
} from 'fs'

pkgInfo(module)

const knownOptions = {
  string: ['env']
}

const options = minimist(process.argv.slice(2), knownOptions)

/**
 * Returns a config object by checking three sources in this order:
 *  1. If there was a --config option passed in the cli options, use the
 *  gulp.config.json file provided there.
 *  2. If 1 failed, and there is a gulp.config.json file in the project folder, use that gulp.config.json
 *  3. If 1 and 2 failed, and there is an environment variable PSTASKS_ROOT, use the gulp.config.json in that directory.
 *  4. If the first 3 failed, throw an error.
 *
 * @return {object|null}
 */
function loadConfig () {
  const psTasksRoot = process.env['PSTASKS_ROOT']
  if (!psTasksRoot) {
    throw new Error('Unable to locate config. PSTASKS_ROOT env var not set.')
  } else {
    const normalizedPath = normalize(psTasksRoot)
    try {
      const configStr = readFileSync(`${normalizedPath}/gulp.config.json`)
        .toString()
      console.log(`using gulp.config.json in PSTASKS_ROOT: ${normalizedPath}`)
      return JSON.parse(configStr)
    } catch (e) {
      console.log(`error reading gulp.config.json found at ${normalizedPath}`)
    }
  }
}

// Required Functions
const config = loadConfig()
if (!options.env) {
  options.env = config.default_deploy_target
}

const plugins = gulpLoadPlugins()

if (!config.default_deploy_target && !knownOptions.env) {
  throw new Error('No deploy target provided in cli options or the default_deploy_target config option')
}

// Utility tasks
const preprocess = lazypipe()
  .pipe(() => {
    const env = options.env
    const context = {
      context: {}
    };
    if (config[env].ps_url) {
      context.context.PS_URL = config[env].ps_url
    }
    if (config[env].api_url) {
      context.context.API_URL = config[env].api_url
    }
    return plugins.if(config.hasOwnProperty(env), plugins.preprocess(context))
  })

export const clean = () => del('dist/*')

export const zip = () => gulp
  .src([
    'dist/**',
    '!dist/**/*.zip',
    '!dist/build/'
  ])
  .pipe(plugins.zip('plugin.zip'))
  .pipe(gulp.dest('dist/build/'))

// Build Tasks
export const buildPreprocess = () => gulp
  .src([
    './plugin/**/*',
    './queries_root/**/*',
    'plugin/plugin.xml'
  ])
  .pipe(preprocess())
  .pipe(gulp.dest('dist'))

export const imgCopy = () => gulp
  .src([
    './plugin/web_root/images/**/*'
  ])
  .pipe(image())
  .pipe(gulp.dest('dist/web_root/images'))


export const buildWebpack = () => {
  return webpackStream(require(`${process.cwd()}/webpack.prod.babel.js`).default, webpack)
      .pipe(gulp.dest('dist/web_root'))
}

// Tasks Runners
export const runBuildTasks = done => {
  return gulp.parallel(
    gulp.series(buildPreprocess, imgCopy), buildWebpack
  )(done)
}

// Orchestrators
export const createPkg = done => {
  return gulp.series(
    clean, runBuildTasks, zip
  )(done)
}
