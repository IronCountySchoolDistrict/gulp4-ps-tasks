# gulp4-ps-tasks
`gulp4-ps-tasks` is a collection of Gulp tasks that makes it easier and faster to develop PowerSchool customizations and deploy them to a PowerSchool "image" server (cdn).


# Installation
#### 1. Install dependencies:
```
npm install -g babel babel-cli babel-register babel-plugin-transform-es2015-modules-commonjs
npm install --save-dev gulp-ps-tasks
```
#### 2. Copy `.babelrc` and `local.gulpfile.babel.js` to the root of your project folder.
#### 3. Rename the local (in your project folder) version of `local.gulpfile.babel.js` to `gulpfile.babel.js`.

# Configuration
### config.json
A `gulp.config.json` file is required for the following information:
* Image server sftp credentials
* Any URLs that should be dynamically inserted into your project's code
The `gulp.config.json` file location can be specified one of two ways. As soon as a config file is found, the search for a config file stops and the first config file found is used. Note that the config path should only include the path to your `gulp.config.json` file -- it should not include the `gulp.config.json` filename itself. Trailing slashes don't matter, they will be removed if they're included.

1. `gulp.config.json` is placed in your project folder.
2. Set an environment variable, `PSTASKS_ROOT`, to the directory path of your `gulp.config.json` file.

If you have a large number of plugins, I recommend using method 3 because it allows you to create and maintain a single `gulp.config.json` file that can be used across all of your plugins. However, if you want it to just work, use method 2.

### gulp.config.example.json
The following config example should be used as a starting point for your own `gulp.config.json` file.
```
{
  "ps_test1": {
    "ps_url": "https://pstest1.example.com",
    "api_url": "https://psappstest.example.com"
  },

  "ps_prod": {
    "ps_url": "https://ps.example.com",
    "api_url": "https://psapps.example.com"
  },

  "default_deploy_target": "ps_prod"
}

```

# Contributing
## Login to `npm`
To make a new release of this package, you'll need to be logged in to `npmjs.com` as `icsd`.

To sign in to `npmjs.com`:
```
$ npm login
Username: icsd
Password: 
Email: (this IS public) data@ironmail.org
Logged in as icsd on https://registry.npmjs.org
```

## Build and publish
1. Increment the package version. To do this, open this project's `package.json` file and change the `"package:"` value. This package follows [Semantic Versioning](https://semver.org/). The new version you choose for this package should conform to Semantic Versioning's guidelines for MAJOR, MINOR, or PATCH changes.
2. Run `gulp createPackage` to compile this package
3. `cd dist/`
4. `npm publish` to publish to the `npm` registry
   
**Note: It's important you run `npm publish` from the `dist/` directory. If you publish this package without being in the `dist/` directory, you'll publish the non-compiled version of this package and it will not be usable.**

## Usage
After you publish a new version of this package, you'll need to change your PowerSchool plugin's `package.json` to use the new version. To do this, `cd` to the plugin directory and run:

```
yarn upgrade --latest gulp4-ps-tasks
```

# Task Usage
Run a task using `gulp {taskname}`

## Utility tasks

### `preprocess`
Invokes the [preprocessor](https://www.npmjs.com/package/preprocessor). Separated out as a reusable Gulp pipe that can be be used by an Gulp task. At one point in this package's history, there *were* multiple tasks that called the `preprocessor`, but that is no longer the case, so the the `index.js` code could be refactored to put the code in the `preprocessor` `lazypipe` into the `buildPreprocess` task, but that isn't necessary for this package to properly function. 

### `clean`
Removes all files and folders in the `dist/` folder

### `zip`
Takes all files and folders that are *within* the `dist/` folder (the `dist/` folder itself is not included), and creates a `plugin.zip` ZIP archive file. This `plugin.zip` file is stored in the `dist/` folder.

## Build Tasks

`tl;dr`: Run `gulp createPkg` to compile your code into a `plugin.zip` file that can be installed as a PowerSchool plugin.

Build tasks are a basic building-block tasks that performs a process on multiple files.

### `buildPreprocess`
Uses [preprocessor](https://www.npmjs.com/package/preprocessor) to insert the PowerSchool URL and "API URL" into your project. We do this dynamic insertion of URLs so we don't have to manually hard-code the URL to a test instance of PowerSchool while we're developing, and then have to change it when deploying to production.

### `imgCopy`
Recursively copies all files in the `plugin/web_root/images/**/*` directory to the `dist/web_root/images` directory.

### `buildWebpack`
Calls the [webpack](https://webpack.js.org/) module bundler. It uses the `webpack.prod.babel.js` file found in your PowerSchool plugin's directory for its configuration. This task is only meant to be run for production builds, so it won't be used in development. The `Webpack Dev Server` will build and make available the compiled files via a web server for our development environment.

## Task Runners
Task runners handle the calling of [Build tasks](#build-tasks) to create a larger workflow.

### `runBuildTasks`
Runs all of the build tasks defined in the [Build tasks](#build-tasks) section above. `buildPreprocess` and `imgCopy` are run in series (wait for the first task to complete before running the next one), and while those two tasks are running, the `buildWebpack` task is run. We run the build tasks in this way to try to keep build times as low as possible.

## Orchestrators
Orchestrators should perform a full build. They should start running the `clean` [Utility task](#utility-tasks), call one or more [Task Runners](#task-runners) to perform workflows, then call `zip` to create the plugin file. For now, this package provides one `Orchestrator`, `createPkg`.

### `createPkg`
Top-level plugin package creation task. Run this task to create a usable plugin that can be installed in PowerSchool. Cleans the `dist/` directory by calling the `clean` [Utility task](#utility-tasks), runs the `runBuildTasks` [Task Runner](#task-runners), then creates a `plugin.zip` file with the resulting files by calling the `zip` [Utility task](#utility-tasks).
