<!---
title: Genserver - Developers
author: ORTEC
html:
  embed_local_images: true
  embed_svg: true
  offline: true
  toc: true
export_on_save:
  html: true
--->

# Genserver

Developer documentation

## Contents {ignore}

[TOC]

## Introduction

Genserver is part of the larger Genrem toolsuite. It makes it easy to run tasks such as Gensimul runs on Windows and Linux. Genserver itself is made up of the following parts.

* Server  
  The backend application. It listens for http requests and websocket messages. When asked it starts Gensimul runs and writes back progress messages.

* Client  
  Frontend web application to manage Genserver tasks.

The applications are cross-platform so that they can be developed and tested on Windows and deployed on Linux with minimal effort.  

## Technology stack

The following technologies are the foundation of Genserver.

* Node.js, Npm  
  Node.js is the engine that runs our Javascript code. Read about and download it here <https://nodejs.org/>. Node.js is distributed with npm (Node Package Manager). Browse all npm packages here <https://www.npmjs.com/>.

* Gulp  
  Gulp allows us to use Javascript to automate common workflow tasks. We use it to customize the build process. See also <https://github.com/gulpjs/gulp/tree/master/docs>.

* Typescript  
  Brings static typing and object-oriented programming to Javascript. We use it to write maintainable code. The documentation is quite useful, start here <https://www.typescriptlang.org/docs/handbook/basic-types.html>.

* Webpack  
  We use it to transform our Typescript code to (bundles of) minified Javascript code that can be executed by Node.js. After initial configuration it shouldn't need many changes. For completeness, documentation starts here <https://webpack.js.org/concepts/>.

The client web app additionally uses the following noteworthy Npm modules.

* React  
  Makes it easy to build a complex web user interface by composing it out of reusable components. See <https://reactjs.org/docs/hello-world.html>.

* Redux  
  Manages state of the entire web app in a single immutable state tree. See <https://redux.js.org/introduction/core-concepts>.

* Semantic UI  
  Collection of beautiful UI components. We use the React version, see <https://react.semantic-ui.com/layouts>.

## Visual Studio Code

We use Visual Studio Code (VSCode) as our main tool for developing Genserver. It is free and works great with the technologies mentioned above. Download and install it from <https://code.visualstudio.com/>. Note you can use any editor you like, but the remainder of this document assumes you use VSCode.

We found it worthwhile to learn these shortcuts by heart:
| Shortcut | Description |
|---|---|
| `ctrl` + `shift` + `b` | Run build tasks |
| `ctrl` + `shift` + `p` | Search for any VSCode command |
| `ctrl` + `p` | Search for any file in workspace |
| `ctrl` + `~` | Show / hide integrated terminal |

The following extensions are recommended and can be installed from within the editor.

**Perforce for VS Code**
[Marketplace](https://marketplace.visualstudio.com/items?itemName=slevesque.perforce)
Provides integration with Perforce for source control. If the P4V client is working on your system, it shouldn't need any login details.

After installation, apply these user settings in VSCode for automatic changelist updates.

~~~javascript
{
    "perforce.addOnFileCreate": true,
    "perforce.editOnFileSave": true,
    "perforce.deleteOnFileDelete": true
}
~~~

**Markdown Preview Enhanced**
[Marketplace](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)
Provides improved Markdown support for VSCode. See also the [Markdown basics](https://shd101wyy.github.io/markdown-preview-enhanced/#/markdown-basics) section in the online docs to learn about its features.

## Project structure

Genserver is set up as an NPM package. The folder structure is

~~~text

Genserver
├── .vscode 
├── server
├── client
├── docs
├── node_modules
├── dist
|   ├── development
|   └── production
├── gulpfile.js
├── package.json
└── package-lock.json
~~~

Explanation:

* `package.json`
  NPM package description file. Includes a list of all dependencies, see [NPM docs](https://docs.npmjs.com/files/package.json).
* `package-lock.json`
  Describes the exact dependency versions so that NPM downloads the same code, every time.
* `gulpfile.js`
  Javascript code for tasks that makes up the build system.
* `./.vscode`
  Contains VSCode-specific files, including workspace settings, build tasks and launch configurations.
* `./server`
  Contains Typescript configuration and source code for the server.
* `./client`
  Contains Typescript configuration and source code for the client. Also contains static assets such as client html and css files.
* `./docs`
  Contains documentation in markdown format and corresponding html output.
* `./node_modules` _(excluded from source control)_
  Contains external dependencies, managed by NPM.
* `./dist` _(excluded from source control)_
  Contains build output for development and production, ready to be distributed.

## Development process

### Preliminaries

For first time users:

* Install VSCode and the extensions listed above.
* Install Node.js from <https://nodejs.org/>. Choose long-term stable or latest, whatever floats your boat. This will install NPM as well.
* Install the Gulp CLI package globally. Open a terminal and run `npm install --global gulp-cli`.

We distinguish between production and development builds of Genserver. The production build differs from development in that:

* All code is minified.
* There are no source maps for debugging.
* The Node.js environment variable `NODE_ENV` is set to `'production'` so that libraries (for example React) are in production mode.
* The default http and websocket ports are different so that production and development instances can run simultaneously without colliding.

Build output can be found in the `./dist/` folder. The production and development subfolders contain everything needed to run Genserver in Node.js. They can be renamed, zipped and moved around freely.

### Build

Recall to run a build task, press `ctrl` + `shift` + `b` from VSCode.

The first time you open the Genserver workspace you'll need to run the `NPM: Install` build task. This will create a `./node_modules` folder with all required packages. Then, the following build tasks are available (if not, reload workspace):

#### Production

* `Production: Rebuild Genserver`  
  Rebuild Genserver from scratch in production mode.

#### Development

* `Development: Rebuild Genserver`
  Rebuild Genserver from scratch in development mode.
* `Development: Compile and watch`  
  Watch source code and compile automatically. Note it only watches code, so server modules and client assets are not updated.
* `Development: Update server modules`
  Update NPM packages to be distributed with Genserver. Use this after installing a new dependency.
* `Development: Update client assets`  
  Update static assets for the client. Use this after changing the `./client/assets` folder.

For build task details, look at the contents of `gulpfile.js`. Note there are no tasks for cleaning the output directies, just delete a subfolder from `./dist/` if you want to be sure.

### Run

Make sure a build has been completed. To run Genserver from VSCode:

1. Go to the debugging tab (`ctrl` + `shift` + `d`) and activate the development or production configuration.
2. Start without debugging (`ctrl` + `f5`).

### Debug

Make sure a development build has been completed. To debug server code from VSCode:

1. Set some breakpoint (`f9`) in the server code.
2. Activate development configuration and start with debugging (`f5`).

To debug client code, we advise to use the DevTools built into Chrome.

1. Run build task `Development: Compile and watch`. This will keep client code up to date.
2. Set some breakpoint in client code by adding a new line and writing `debugger`, save the file.
3. Activate development configuration and start without debugging (`ctrl` + `f5`). This will open Chrome.
4. In Chrome, open DevTools (`ctrl` + `shift` + `i`) and refresh the page (`f5`).

This should pause execution at your breakpoint in the DevTools Sources tab. You now have full debugging tools and an interactive console. You can edit the client source in VSCode and refresh the page in Chrome to see your changes.

We have configured source maps so that Chrome knows the mapping between Typescript source files and compiled Javascript. Find the Typescript source in `Chrome DevTools -> Sources -> Page (left sidebar) -> webpack://./client/source/`.

If you find yourself working a lot with React and Redux, then you may want to install the [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) and [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=nl) extensions for Chrome.

### Dependencies

Via NPM we have access to an enormous collection of free, reusable packages. Packages that Genserver depends on are listed in `package.json`, either in the dependencies or devDependencies section. The difference is that dependencies are distributed with Genserver, while devDependencies are only required during development.

Packages used in server code go in dependencies and packages for the build system go in devDependencies. Packages for client code are actually compiled (into `vendor.js`, for performance reasons) and therefore go in devDependencies as well.

To install a new package for Genserver:

1. Find something nice on <https://www.npmjs.com/>.
2. Check out `package.json` and `package-lock.json` to remove write protection.
3. In VSCode, show terminal (`ctrl` + `~`>).
4. Run `npm install some-package --save` or `npm install some-package --save-dev`.

Older packages may not have Typescript information. In that case you also need to install the package `@types/some-package`, always as a devDependency.

To remove a package, replace `npm install` by `npm uninstall` in the above commands.

## Code

A typical workflow looks like:

1. Open `./.vscode/genserver.code-workspace` in VSCode.
2. Activate development configuration.
3. Run build task `Development: Rebuild Genserver` followed by `Development: Compile and watch`.
4. Edit code, save files and debug server and/or client. Rinse and repeat until satisfied.

When satisfied:

1. Run build task `Production: Rebuild Genserver`.
2. Activate production configuration and start without debugging.
3. Test your changes in Internet Explorer (since that is used by NAM).

See below on how to deploy a development version to the NAM Linux environment for further testing by NAM keyusers.

## NAM Linux environment

### Access

Navigate to <https://www.tpa.shellanywhere.com/> and log in with our shared account `Genrem.Support-X`. Try Internet Explorer if you run into issues. Click on the link for LeoStream Access Tool. Then log in with your NAM Linux account. For example:

~~~text
Username: NLKGRS
Password: ******
Domain: linux.shell.com
~~~

This should give you a remote desktop view via ThinAnywhere.

Genserver runs under the `s_genrem` functional account. You can run commands under this account using `sudo` (mind the spaces!):

~~~text
sudo su - s_genrem
~~~

Provide your credentials and run for example `gnome-system-monitor` to view processes running under `s_genrem`. Use `nautilus` to start a file browser.

Commands `node` and `npm` are available since `/glb/eu/epe/data/genrem/genserver/node-distribution/bin/` has been added to path in `~/.custom.profile` of the `s_genrem` account.

### Deployment procedure

Let `/glb/eu/epe/data/genrem/genserver/` be our root directory. There are two folders for Genserver instances:

* `./development/` contains development code for testing by ORTEC or NAM keyusers.

* `./production/` contains production code for all users at NAM.

Always make sure there are no conflicts in the configured http and websocket ports between these environments. The node and npm binaries are in `./node-distribution/`. If needed you can update to a later version, see <https://nodejs.org/dist/latest/>.

We use the LinuxPorter utility (available in Perforce) to transfer files to the NAM Linux environment. Suppose the build we want to transfer is contained in `genserver.zip`. Open `psftp command to xfer1.shell.com.bat` and run for example:

~~~text
cd GENREM/KG
put genserver.zip
~~~

Now on the Linux side, open a console under `s_genrem` (see above), `cd` to the `Genserver` root directory and run:

~~~text
sftp
cd GENREM/KG
get genserver.zip
rm genserver.zip
exit
~~~

Shutdown the node process corresponding to the instance we want to update. Still under `s_genrem`, use `ps -A | grep node` to get the pid's of running Genserver instances. Use `pwdx <pid>` to view their working directories and find out which pid to kill. Then run `kill <pid>`.

Now you can use `nautilus` to extract the zip file and update the development code. As a quick check, run the following to verify the server  starts and then close it again.

~~~text
cd development
node main.js
~~~

To ensure the server runs in the background, and keeps running after logging out of the `s_genrem` session, use:

~~~text
cd development
nohup node main.js > /dev/null 2>&1 &
~~~

This command redirects stdout and stderr to the dummy device. Since Genserver also logs to file (see configuration in user docs) that is not an issue.

## Known bugs and limitations

* The client websocket port is hardcoded to use 8081 in production and 8080 in development. If you change the websocket port in `genserver.config.json`, you'll need to rebuild the client.

* See the Npm packages `pm2` or `forever` to daemonize the node server process, which is considered a better approach than running it in the background with `nohup` as described above.

* If the node server process closes, there is no cleanup of tasks and so child processes may be left running. (If so, you'll find them running under `s_genrem`.)

* If the node server process closes, all task info and history will be lost since everything is stored in memory. As a better approach, use `lowdb` package for persistent storage via a small database using JSON files.

* There are only 2 accounts, Admin and User. Neither have passwords. The User account is shared by all users. Account privileges are implemented in a very basic manner.
