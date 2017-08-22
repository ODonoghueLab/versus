# Versus

## Build Status:
Master:  
[![Build Status](https://travis-ci.com/ODonoghueLab/versus.svg?token=dvwsqpX2xpST9Mi1JGuz&branch=master)](https://travis-ci.com/ODonoghueLab/versus)

Develop:  
[![Build Status](https://travis-ci.com/ODonoghueLab/versus.svg?token=dvwsqpX2xpST9Mi1JGuz&branch=develop)](https://travis-ci.com/ODonoghueLab/versus)

## Description
Versus is a web-based application that allows users ('requesters') to create multiple experiments based on a full 2AFC methodology (two alternative forced-choice). Participants ('workers') are presented two images side-by-side, and - without imposing a time constraint - they are now asked to choose one of the two images, see Heinrich et al. (2015, 2016).

## Getting Started

To get started on versus:


1. Clone the Repository!

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

3. Start the server `http://localhost:3000`,  which serves a JSON api

    ```bash
    cd <versus>/server
    ./run_server.sh
    ```

4. Start the client, hot reload web-client on `http://localhost:8080`

    ```bash
    cd <versus>/client
    ./run_client.sh
    ```


# Running Experiments

1. Once the server and client are running, goto `http://localhost:8080/#/register`.
2. Create a user
3. Create a new experiment, during which, you will need a collection of images to upload.
4. Once the experiment is created, you need to invite participants, click `Invite Participant`
5. When the participant appears in the table, click on the `invite` button to go to the page to run the experiment.
6. Carry out the experiment.
7. Download results by clicking on the button `Download Results`


# Databases

The default database is sqlite, but you can use
other databases such as postgres. Here's a link to a Linux
[database installation guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04).


# Development Workflow

* Write Code
```
npm test
```
* If tests pass, branch and make merge requests
* Travis will block you if your branch build fails

