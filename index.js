import gulp from 'gulp'
import webpack from 'webpack'
import gulpLoadPlugins from 'gulp-load-plugins'
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
  string: ['env', 'config']
}

const options = minimist(process.argv.slice(2), knownOptions)

/**
 * Returns a config object by checking three sources in this order:
 *  1. If there was a --config option passed in the cli options, use the
 *  config.json file provided there.
 *  2. If 1 failed, and there is a config.json file in the project folder, use that config.json
 *  3. If 1 and 2 failed, and there is an environment variable PSTASKS_ROOT, use the config.json in that directory.
 *  4. If the first 3 failed, throw an error.
 *
 * @return {object|null}
 */
function loadConfig () {
  if (options.config) {
    console.log(`Using config.json found at ${options.config}`)
    const normalizedPath = normalize(options.config)
    const configStr = readFileSync(`${normalizedPath}/config.json`).toString()
    return JSON.parse(configStr)
  }
  try {
    const configStr = readFileSync('./config.json').toString()
    console.log('Using config.json found in project folder')
    return JSON.parse(configStr)
  } catch (e) {
    const psTasksRoot = process.env['PSTASKS_ROOT']
    if (!psTasksRoot) {
      throw new Error('Unable to locate config. PSTASKS_ROOT env var not set.')
    } else {
      const normalizedPath = normalize(psTasksRoot)
      try {
        const configStr = readFileSync(`${normalizedPath}/config.json`)
          .toString()
        console.log(`using config.json in PSTASKS_ROOT: ${normalizedPath}`)
        return JSON.parse(configStr)
      } catch (e) {
        console.log(`error reading config.json found at ${normalizedPath}`)
      }
    }
  }

  console.log('Could not load config.json -- all three loading methods failed')
  return null
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

const deploy = lazypipe()
  .pipe(() => {
    const env = options.env
    return plugins.if(config.hasOwnProperty(env), plugins.sftp(config[env].deploy_credentials))
  })

const preprocess = lazypipe()
  .pipe(() => {
    const env = options.env
    const context = {
      context: {}
    };
    if (config[env].ps_url) {
      context.context.PS_URL = config[env].ps_url
    }
    return plugins.if(config.hasOwnProperty(env), plugins.preprocess(context))
  })

// Utility tasks
export const clean = () => del('dist/*')

export const zip = () => gulp
  .src([
    'dist/**',
    '!dist/**/*.zip',
    '!dist/build/'
  ])
  .pipe(plugins.zip('plugin.zip'))
  .pipe(gulp.dest('dist/build/'))

export const deployImg = () => gulp
  .src([
    'dist/web_root/scripts/**',
    'dist/web_root/images/**'
  ])
  .pipe(deploy())

// Build Tasks
export const buildPreprocess = () => gulp
  .src([
    './plugin/**/*',
    './queries_root/**/*',
    'plugin/plugin.xml'
  ])
  .pipe(preprocess())
  .pipe(gulp.dest('dist'))

export const buildWebpack = () => {
  return webpackStream(require(`${process.cwd()}/webpack.config.babel.js`), webpack)
    .pipe(gulp.dest('dist'))
}

// Tasks Runners
export const runBuildTasks = done => {
  return gulp.parallel(
    buildPreprocess, buildWebpack
  )(done)
}

// Orchestrators
export const createPkgNoImage = done => {
  return gulp.series(
    clean, runBuildTasks, zip
  )(done)
}
export const createPkgWithImage = done => {
  return gulp.series(
    clean, runBuildTasks, deployImg, zip
  )(done)
}
