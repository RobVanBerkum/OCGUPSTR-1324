<!---
title: Genserver - Keyusers
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

Keyuser documentation

## Contents {ignore}

[TOC]

## Introduction

Genserver is part of the larger Genrem toolsuite. It manages GenSimul runs on Linux and communicates with the Genrem Gui on Windows. It consists of a server (backend) and client (frontend) application.

# Client

The web client can be accessed using any browser connected to the NAM intranet. Simply navigate to `http://hostname:portHttp`. Here, `hostname` equals the hostname of the machine where the server is running and `portHttp` equals the http port specified in the server configuration.

The production instance of Genserver at NAM can be found at:

~~~text
http://amsdc2-n-sv0023:3001
~~~

If the development instance of Genserver is running at NAM as well, it can be found at:

~~~text
http://amsdc2-n-sv0023:3000
~~~

# Server

## Configuration

The root directory of the server equals the directory where `main.js` is located. On startup, the server reads `./genserver.config.json`, i.e. this file should exist next to `main.js`. Its options (production defaults) are:

~~~javascript
{
    logging: {
        console: {
            minLogLevel: 'Warning'   // 'Info'|'Warning'|'Error'
        },
        file: {
            enabled: true,   // boolean  
            minLogLevel: 'Info',   // 'Info'|'Warning'|'Error'
            path: './logs/'   // string
        }
    },
    server: {
        portHttp: 3001,   // number
        portWs: 8081,   // number
        pathPublic: '../../client/public/'   // string
    },
    tasks: {
        path: './tasks/',   // string
        genperl: {
            pathVersionsGensimul: '/glb/eu/epe/data/genrem/genrem',   // string
            pathVersionsGensimulDev: 'glb/eu/epe/data/genrem/genrem_d/',   // string
            pathVersionsDynamo: '/apps/sss/dynamo/',   // string
            PathVersionsDynamoDev: '/apps/sssdev/dynamo/',   // string
        }, 
        deleteTaskAfterDays: 14   // number
    }
}
~~~

Remarks:

* `server.portHttp`  
      Defaults to 3001 in production and 3000 in development.
* `server.portWs`  
    Defaults to 8081 in production and 8080 in development. Changing this port means the client has to be rebuilt, so best leave it at default.
* `tasks.deleteTaskAfterDays`  
    Tasks that are created more than this number of days ago are automatically deleted by the server.

## Websocket API

The server uses the Websocket protocol to communicate with clients. The Websocket address is `ws://hostname:portWs`. Here, hostname equals the hostname of the machine where the server is running and `portWs` equals the Websocket port specified in the server configuration. For example:

~~~text
ws://amsdc2-n-sv0023:8081
~~~

The contents of the Websocket messages are JSON formatted strings. Dates stored as string follow ISO 8601 format in UTC, see also [momentjs](https://momentjs.com/docs/#/displaying/as-iso-string/) docs. The server understands the following messages.

### Authorization

* `TokenRequest`

Client to server. Request a token for given client. Server responds with `TokenResponse`.

~~~javascript
    {
        type: 'TokenRequest',
        payload: {
            clientId: 'User'   // string
        }
    }
~~~

* `TokenResponse`

Server to client. Response indicating whether authorization was successful and if so, a random token to be used in future messages.

~~~javascript
    {
        type: 'TokenResponse',
        payload: {
            success: true,   // boolean
            token: 'd3719f66538611e89c2dfa7ae01bbebc',   // string
        }
    }
~~~

### Logging

* `ServerLog`

Server to client. Contains a log message from server.

~~~javascript
    {
        type: 'ServerLog',
        payload: {
            type: 'Info',   // 'Info'|'Warning'|'Error'
            date: '2018-02-04T22:44:30.652Z',   // datestring
            text: 'Action completed successfully.'   // string
        }
    }
~~~

### Tasks

* `TaskInfoRequest`

    Client to server. Request information about one or more tasks. Server responds with `TaskInfoResponse`.

~~~javascript
    {
        type: 'TaskInfoRequest',
        payload: {
            token: 'd3719f66538611e89c2dfa7ae01bbebc',   // string
            taskIds: [],   // string[]
            includeLogs: false,   // boolean
            logStartDate: '',   // datestring
            includeInput: false,   // boolean
            includeOutput: false   // boolean
        }
    }
~~~

Remarks:

* `taskIds` If empty, response includes info on all tasks available to client. If non-empty, response contains info specific to those tasks.

* `includeLogs` If true, response includes task log messages.

* `includeInput` If true, response includes task input.

* `includeOutput` If true, response includes task output.

* `logStartDate` If non-empty, response does not include task log messages from before this date.

* `TaskInfoResponse`

Server to client. Contains info about specific tasks.

~~~javascript
    {
        type: 'TaskInfoResponse',
        payload: {
            infoItems: [
                {
                    type: 'Genperl',   // 'Genperl'|'FolderWatch'
                    status: 'Running',   // TaskStatus, see remarks below.
                    id: '20180204224430652',   // string 
                    ownerClientId: 'User',   // string
                    dateCreated: '2018-02-04T22:44:30.652Z',   // datestring
                    description: 'Genperl task for testing purposes.',   // string
                    logs: [{
                            type: 'Info',   // 'Info'|'Warning'|'Error'
                            date: '2018-02-04T22:44:30.652Z',   // datestring
                            text: 'Action completed successfully.'   // string
                        }], 
                    input: {...}   // TaskInput, see remarks
                    output: {...}   // TaskOutput, see remarks
                }
            ]
        }
    }
~~~

Remarks:

* The options for `status` are Concept, PendingStart, Running, PendingStop, Success, Error, PendingDelete.

* The fields `logs`, `input` and `output` are optional. See also `TaskInfoRequest` message.

* For each entry in `infoItems`, the structure of `input` and `output` depends on `type`. See also `TaskCreateNew` message.

* `TaskInfoSubscribe`

Client to server. Request server to keep client informed of task info updates.

~~~javascript
    {
        type: 'TaskInfoSubscribe',
        payload: {
            token: 'd3719f66538611e89c2dfa7ae01bbebc',   // string
            defaultType: 'Summary',   // 'None'|'Summary'|'Detail'
            overloads: [
                {
                    taskId: '20180204224430652',   // string 
                    type: 'Detail'   // 'None'|'Summary'|'Detail'
                }
            ]
        }
    }
~~~

Remarks:

* With a subscription of type `Summary`, the server sends a message on task status updates. With a `Detail` subscription, the server sends all  task log message updates in real-time. Please be careful with this option. None` can be used to cancel a subscription.

* `defaultType` This subscription type is applied to all current and future tasks available to client. It overrides previous subscriptions.

* `overloads` If non-empty, allows to override the default type for specific task ids. This is useful for limiting `Detail` updates to some relevant tasks.  

* `TaskCreateNew`

Client to server. Request the server to start a new task or ask server to describe options for starting new tasks.

~~~javascript
    {
        type: 'TaskCreateNew',
        payload: {
            token: 'd3719f66538611e89c2dfa7ae01bbebc',   // string
            type: 'Genperl',   // 'Genperl'|'FolderWatch'
            input: {...}   // TaskInput, see remarks
        }
    }
~~~

Remarks:

* `type` If empty, server responds with `TaskTypeOptionsResponse`, describing the options for starting new tasks. If non-empty, server responds with `TaskInfoResponse` and `input` should match as follows.

* `input` structure for `type` Genperl:

~~~javascript
    {
        description: 'Genperl task for testing purposes.',   // string
        pathGendsc: '//folder/file.gendsc',   // string
        runLocal: false,   // boolean
        useDynamo: false,   // boolean
        useGensimulDev: false,   // boolean
        useDynamoDev: false,   // boolean
        gensimulVersion: 'Default',   // string
        dynamoVersion: 'Default'   // string
    }
~~~

* `input` structure for `type` FolderWatch:

~~~javascript
    {
        description: 'Task to trigger Genperl tasks based on file detection.',   // string
        watchPath: '//folder/subfolder/',   // string
        fileHandler: 'GenperlStartfileHandler',   // 'GenperlStartfileHandler'
    }
~~~

* This is the same input as required when starting a new task via the web client, so see the web client for more information.

* `TaskTypeOptionsResponse`

Server to client. Describes options available to client for starting new tasks, for example possible Gensimul versions.

~~~javascript
    {
        type: 'TaskTypeOptionsResponse',
        payload: {
            taskOptions: [
                {
                    type: 'Genperl'   // 'Genperl'|'FolderWatch' 
                    options: {...}   // TaskTypeOptions, see remarks
                }
            ]
        }
    }
~~~

Remarks:

* `taskOptions` has an entry for each task that can be started by client. For each entry, `options` depends on `type` as follows.

* `options` structure for `type` Genperl:

~~~javascript
    {
        gensimulVersions: ['Default', 'v2018.1.0.0'],   // string[]
        gensimulVersionsDev: ['Default', 'v2018.1.0.0', 'v2018.2.0.0'],   // string[]
        dynamoVersions: ['Default', 'v2017.1.0'],   // string[]
        dynamoVersionsDev: ['Default', 'v2017.1.0', 'v2018.1.0']   // string[]
    }
~~~

* `options` structure for `type` FolderWatch:

~~~javascript
    {
        fileHandlers: ['GenperlStartfileHandler']   // string[]
    }
~~~

* `TaskControl`

Client to server. Request the server to stop or delete a specific task. Server responds with `TaskInfoResponse`.

~~~javascript
    {
        type: 'TaskControl',
        payload: {
            token: 'd3719f66538611e89c2dfa7ae01bbebc',   // string
            taskId: '20180204224430652',   // string
            action: 'stop'   // 'stop'|'delete'
        }
    }
~~~
