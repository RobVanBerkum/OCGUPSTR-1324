/**
 * Description: Gulp tasks for building Genserver.
 * Author: ORTEC
 */

const path = require('path');
const gulp = require('gulp');
const changed = require('gulp-changed');
const install = require('gulp-install');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const nodeExternals = require('webpack-node-externals');


//#region Configurations.


/**
 * Configuration parameters for the tasks in this file. 
 */
const configGulp = {
    pathRoot: __dirname,
    pathDevelopment: path.join(__dirname, '/dist/development'),
    pathProduction: path.join(__dirname, '/dist/production')
};

/**
 * Webpack configuration for server in development. 
 * See also https://webpack.js.org/configuration/. 
 */
const configWebpackServerDev = {
    target: 'node',
    mode: 'development',
    devtool: 'eval-source-map',
    output: {
        path: configGulp.pathDevelopment,
        filename: 'main.js'
    },
    resolve: {
        extensions: ['.ts']
    },
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                loader: 'ts-loader'
            }
        ]
    },
    node: {
        __dirname: false
    }
};

/**
 * Webpack configuration for server in production.
 */
const configWebpackServerProd = {...configWebpackServerDev, ...{
    mode: 'production',
    devtool: 'none',
    output: {
        path: configGulp.pathProduction,
        filename: 'main.js'
    }
}};

/**
 * Webpack configuration for client in development. 
 * See also https://webpack.js.org/configuration/. 
 */
const configWebpackClientDev = {
    mode: 'development',
    devtool: 'eval-source-map',
    output: {
        path: path.join(configGulp.pathDevelopment, '/client/public'),
        filename: 'main.js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader'
            }
        ]
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            filename: 'vendor.js'
        }
    },
    performance: { hints: false }
};

/**
 * Webpack configuration for client in production.
 */
const configWebpackClientProd = {...configWebpackClientDev, ...{
    mode: 'production',
    devtool: 'none',
    output: {
        path: path.join(configGulp.pathProduction, '/client/public'),
        filename: 'main.js'
    }
}};


//#endregion


//#region Methods for building server and client.


/**
 * Update node_modules in destination directory. 
 */
const updateModules = (isDev) => {
    let pathSource = path.join(configGulp.pathRoot, 'package*.json');
    let pathDest = path.join(isDev ? configGulp.pathDevelopment : configGulp.pathProduction, '/server/app');
    return gulp.src(pathSource)
        .pipe(changed(pathDest))
        .pipe(gulp.dest(pathDest))
        .pipe(install({ production: true }));    // We only need modules to run the server.
};

/**
 * Compile server source code for destination directory. 
 */
const compileServer = (isDev, watchSource) => {
    let pathSource = path.join(configGulp.pathRoot, 'server/source/**/*.*');
    let pathDest = path.join(isDev ? configGulp.pathDevelopment : configGulp.pathProduction, '/server/app');
    let config = isDev ? configWebpackServerDev : configWebpackServerProd;
    config.watch = watchSource;
    return gulp.src(pathSource)
        .pipe(webpackStream(config, webpack))
        .pipe(gulp.dest(pathDest));
};

/**
 * Update client assets in destination directory.
 */
const updateAssets = (isDev) => {
    let pathSource = path.join(configGulp.pathRoot, '/client/assets/**/*.*');
    let pathDest = path.join(isDev ? configGulp.pathDevelopment : configGulp.pathProduction, '/client/public');
    return gulp.src(pathSource)
        .pipe(changed(pathDest))
        .pipe(gulp.dest(pathDest));
};

/**
 * Compile client source code for destination directory.
 */
const compileClient = (isDev, watchSource) => {
    let pathSource = path.join(configGulp.pathRoot, '/client/source/**/*.*');
    let pathDest = path.join(isDev ? configGulp.pathDevelopment : configGulp.pathProduction, '/client/public');
    let config = isDev ? configWebpackClientDev : configWebpackClientProd
    config.watch = watchSource
    return gulp.src(pathSource)
        .pipe(webpackStream(config, webpack))
        .pipe(gulp.dest(pathDest));
};


//#endregion


//#region Gulp tasks definitions.


gulp.task('Dev_UpdateModules', () => updateModules(true));
gulp.task('Prod_UpdateModules', () => updateModules(false));
gulp.task('Dev_UpdateAssets', () => updateAssets(true));
gulp.task('Prod_UpdateAssets', () => updateAssets(false));
gulp.task('Dev_CompileServer', () => compileServer(true, false));
gulp.task('Prod_CompileServer', () => compileServer(false, false));
gulp.task('Dev_CompileClient', () => compileClient(true, false));
gulp.task('Prod_CompileClient', () => compileClient(false, false));
gulp.task('Dev_Rebuild', gulp.parallel(
    'Dev_UpdateModules', 'Dev_UpdateAssets', 'Dev_CompileServer', 'Dev_CompileClient'
));
gulp.task('Prod_Rebuild', gulp.parallel(
    'Prod_UpdateModules', 'Prod_UpdateAssets', 'Prod_CompileServer', 'Prod_CompileClient'
));
gulp.task('Dev_CompileAndWatch', gulp.parallel(
    () => compileServer(true, true),
    () => compileClient(true, true)
));


//#endregion




