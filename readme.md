

# Versus

## Description

Versus is a web-based application that allows users ('requesters') to create multiple experiments based on a full 2AFC methodology (two alternative forced-choice). Participants ('workers') are presented two images side-by-side, and - without imposing a time constraint - they are now asked to choose one of the two images, see Heinrich et al. ([2015](https://pdfs.semanticscholar.org/957c/05a9aed884799f45c19987b6d21360d02476.pdf), [2016](http://www.joules.de/files/heinrich_evaluating_2016.pdf)).

The choices are saved, and used to construct a binary-search tree, so that a list of images can be efficiently ranked in terms of participants preferences. Thus user-preferences can be compared to a theroretical definition of image quality.

The web-app has been setup to work with Amazon's Mechanical Turk, using the survey-link option in generating a Human Interactive Task.

The project has been funded by CSIRO in the lab of [Seán O’Donoghue](https://odonoghuelab.org/), and QUT in the lab of Jim Hogan.

## Getting Started

To get started on Versus:


1. Clone the repository

    ```bash
    git clone https://github.com/ODonoghueLab/versus.git
    ```

2. The Versus code-base consists of two node packages, one for the server and one for the client. You need to install this via the node package manager `npm` 

    ```bash
    cd <versus>/server
    npm install
    cd <versus>/client
    npm install
    ```

3. Start the backend server `http://localhost:3000`,  which handles the JSON api, and the production version of the client

    ```bash
    cd <versus>/server
    ./run_server.sh
    ```

4. In development mode, start the client-server and hot reload the web-client on `http://localhost:8080`

    ```bash
    cd <versus>/client
    ./run_client.sh
    ```


## Configuration

The project consists of two parts:

1. The front-end client is a single-page-application that is meant to be loaded into a web-browser. The front-end client communicates with the back-end server via JSON-api calls. 

   The front-end client needs to be compiled from source in the `client` directory:

   ```bash
   npm run build
   ```

   In development mode, a client-server can be run that serves the client, and watches for changes in the source. On detecting changes, the client-server re-compiles the client and force reloads the client in the browser. 

   The IP of the backend-server is set in the file `<versus>/server/src/config.js`. This file is auto-generated if it does not exist.

   In production mode, there is no need for a client-server, as the backend-server can directly serve the compiled client.

2. The back-end server is a javascript node-express server that processes JSON-api requests and stores results to a database. The default database is a simple single-file Sqlite3 database.

   The IP of the client-server in development is set in the file `<versus>/client/src/config.js`. Similarly, it is auto-generated if it does not exist. The database configuration is also defined in this file.

## Design notes

* The web-client is a [Vue](https://vuejs.org/) single-page-application that needs to be compiled. 
* The styling follows Google's [Material Design](http://vuematerial.io/#/), using a Vue-plugin.
* The backend-server is built on Node Express
* The user authentication is done through passport, using a local strategy
* The backend-server talks to the database through the Sequelize ORM.
* The default Sequelize database is Sqlite3, and writes to the file `<versus>/server/database.sqlite`
* The database schema only uses database fields that can work with other databases in Sequelize. The database can be changed in the server config file `<versus>/client/src/config.js`. If you do use another database, you will have to set it up yourself. For instance to setup Postgres on Linux, here's an [installation guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04).

