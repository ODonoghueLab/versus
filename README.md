# Versus

## Build Status:
Master:  
[![Build Status](https://travis-ci.com/ODonoghueLab/versus.svg?token=dvwsqpX2xpST9Mi1JGuz&branch=master)](https://travis-ci.com/ODonoghueLab/versus)

Develop:  
[![Build Status](https://travis-ci.com/ODonoghueLab/versus.svg?token=dvwsqpX2xpST9Mi1JGuz&branch=develop)](https://travis-ci.com/ODonoghueLab/versus)

## Description
Versus is a web-based application that allows users ('requesters') to create multiple experiments based on a full 2AFC methodology (two alternative forced-choice). Participants ('workers') are presented two images side-by-side, and - without imposing a time constraint - they are now asked to choose one of the two images, see Heinrich et al. (2015, 2016).

## Getting Started

To get started working on versus there are a few prerequisites (Windows is not supported)

1. Installing Postgres
   - Linux - [Digital Ocean Guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04)
     - Install with  `apt-get`

       ```bash
       sudo apt-get update
       sudo apt-get install postgresql postgresql-contrib
       ```
     - a postgres superuser may already be defined on your file system, in that case, set password to `postgres`

       ```bash
         sudo -u postgres psql postgres
         # \password postgres
         # \q
       ```

     - Create the `versus` Database.

        ```bash
        sudo -u postgres createdb versus
        ```
   - Mac
     - Install with `brew`

       ```bash
       brew update
       brew install postgres
       ```

     - Create a user within postgres

       ```bash
       psql
       # \du # list users to check if postgres exists
       # CREATE USER postgres WITH SUPERUSER;
       # \q
       ```

     -  Create the versus database

         ```bash
         createdb versus
         ```

         ​

2. Clone the Repository!

    ```bash
    git clone https://github.com/ODonoghueLab/versus.git
    ```

3. Start the server (JSON api served on `http://localhost:3000`)
    ```bash
    cd <versus>/server/src
    ./run_server.sh
    ```

4. Start the client, hot reload web-client on `http://localhost:8080`

    ```bash
    cd <versus>/client/src
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



# Development Workflow

* Write Code
```
npm test
```
* If tests pass, branch and make merge requests
* Travis will block you if your branch build fails

## Git Issue Codes
* FN - Fix Now - Issues That Halt Progress
* CBT - Come Back To - Issues That Need Fixing But Not Urgent
* WLT - Would Like To - More Feature Idea/s Than Needed Fix
