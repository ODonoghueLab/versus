

# Versus

## Description

Versus is a web-based application that allows images to be ranked for image quality via a series of forced choices between 2 options, also known as 2 alternative forced-choice (2AFC) methodology. 

Users uploads a set of images to the website, and the user can send a link to a participant. The particiapnt will be presented with a series of choices. Each choice consists of  two images side-by-side and the participant will be expected to choose one of the two images. The choices are saved. From the past choices, a binary search-tree is constructed, from which the next set of comparisons will be extracted. This will reduce the number of comparisons needed to rank the entire set of images  (see Heinrich et al. [2015](https://pdfs.semanticscholar.org/957c/05a9aed884799f45c19987b6d21360d02476.pdf), [2016](http://www.joules.de/files/heinrich_evaluating_2016.pdf)).

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

1. The front-end web-client is a Vue.js single-page-application that is meant to be loaded into a web-browser. 

   The front-end client communicates with the back-end server via JSON-api calls. 

   The front-end client needs to be compiled from source in the `client` directory:

   ```bash
   npm run build
   ```

   In development mode, a client-server can be run that serves the client, and watches for changes in the source. On detecting changes, the client-server re-compiles the client and force reloads the client in the browser. 

   The IP of the backend-server is set in the file `<versus>/server/src/config.js`. This file is auto-generated if it does not exist.

   In production mode, there is no need for a client-server, as the backend-server can directly serve the compiled client.

2. The back-end server processes the data from the web-client, stores the image files, and stores results to a database. 

   The IP of the client-server in development is set in the file `<versus>/client/src/config.js`. Similarly, it is auto-generated if it does not exist. 

   The backend-server is built on Node Express.

   he user authentication is done through passport, using a local strategy

   The backend-server talks to the database through the Sequelize ORM. The default database is a simple single-file Sqlite3 database and writes to the file `<versus>/server/database.sqlite`. The database configuration is also defined in `<versus>/client/src/config.js`.

   The database schema only uses database fields that can work with other databases in Sequelize. The database can be changed in the server config file `<versus>/client/src/config.js`. If you do use another database, you will have to set it up yourself. For instance to setup Postgres on Linux, here's an [installation guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04).

   ​

