

# Versus

## Description

Versus is a web-based application that enables the complete ranking of a set of images for image quality, via a set of forced choices between 2 options (also known as 2 alternative forced-choice (2AFC) methodology). It is designed to work both locally, and with Mechanical Turk.

Users uploads a set of images to the website, and the user can send a link to a participant. The particiapnt will be presented with a series of choices - each choice consists of two images side-by-side and the participant will be expected to choose one of the two images. From past choices, a binary search-tree is constructed, from which the next set of comparisons will be extracted. This will result in the optimal number of comparisons required to rank the entire set of images  (see Heinrich et al. [2015](https://pdfs.semanticscholar.org/957c/05a9aed884799f45c19987b6d21360d02476.pdf), [2016](http://www.joules.de/files/heinrich_evaluating_2016.pdf)).

The web-app has been setup to work with Amazon's Mechanical Turk, using the survey-link option in generating a Human Interactive Task.

The project has been funded by CSIRO in the lab of [Seán O’Donoghue](https://odonoghuelab.org/), and QUT in the lab of Jim Hogan.

## Getting Started

To get started on Versus on your local machine:


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

Versus can be easily re-configured to be deployed a server. There are two parts to the project, with the second part optional for development. The two parts need to be conficgured separately:

1. The front-end web-client is a Vue.js single-page-application that is meant to be loaded into a web-browser. 

   The front-end client communicates with the back-end server via JSON-api calls. 

   The front-end client needs to be compiled from source in the `client` directory:

   ```bash
   npm run build
   ```

   In development mode, a client-server can be run that serves the client, and watches for changes in the source. On detecting changes, the client-server re-compiles the client and force reloads the client in the browser. 

   The IP of the client-server in development is set in the file `<versus>/client/src/config.js`. Similarly, it is auto-generated if it does not exist. 

   In production mode, there is no need for a client-server, as the backend-server can directly serve the compiled client.

2. The back-end server processes the data from the web-client, stores the image files, and stores results to a database. 

   The IP of the backend-server is set in the file `<versus>/server/src/config.js`. This file is auto-generated if it does not exist.

   ​

## Mechanical Turk

Versus is designed to work easily with Mechanical Turk. 

1. Setup an experiment and upload your images.

2. Then setup your mechanical Requester account, and make a Survey Link job (Human Interaction Task). 

3. In your Versus Exeriment page, copy the mechanical-turk link, and paste this link in the Survey Link welcome page on the Mechanical Turk Requrester template.

4. The Workers will arrive on that page, and a new Partcipant account will automatially be created. Upon complemtion of the rankings for that experiment, a Survey Code will be generated, 

5. The Survey Code will be entered into Mechanical Turk by the Particpant, and the Requester can cross-check it with the Survey Code that appears in the Experiment page, which will list all Participants. The Requester can approve/not-approve the Participant based on the consistency of the results.


## RPC-JSON API

The communication between the client and the server is conducted through the RPC-JSON protocol.

The key idea with the RPC-JSON is that the client accesses the web-server through functions that receives JSON-literal parameters and returns a promise that returns a JSON-literals. JSON-literals are essentially combinations of dictionaries and lists, with strings and numbers as a base type.

These functions are instantiated directly in the `server/src/handlers.js` module in the server, and are instantly available in the client once defined. The middle-ware abstracts out the http calls through the `rpc` library.

There are three main variants of the RPC calls:
1. simple functions
2. upload functions
3. download functions

Furthermore, functions are generally protected by the user-authentication system. But if the name is preceeded with `public`, then the user-authentication is bypassed.

An alternate Python-based flask-server has been written that can interact via this RPC-JSON api with the same web-client.


## User system

Versus implements a session-based user-authentication system using the `passport.js` module.

User accounts are stored in the database by username/email/hashed-passwords, and passwords are hashed on the client-side, and salted in the database.

On session authentication, a token is stored in the client's localStorage, and a permanent session is activated until logout. If the client is restarted, the client will reauthenticate with any token found in the localStorage of the browser. This occurs in `client/src/main.js`.

Experiment pages in the client, by default, require user-authentication. By default, login, register, home, participant and mechanical-turk pages are publically accessible. Control of these pages are found in `client/src/router.js`

The JSON-api calls will be authenticated depending on the name of the calling function. Calling api functions that start with `public*` can be called without authentication - these can be used for publicly accessible pages.


