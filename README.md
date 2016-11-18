#Versus

##Build Status:
Master:  
[![Build Status](https://travis-ci.com/ODonoghueLab/versus.svg?token=dvwsqpX2xpST9Mi1JGuz&branch=master)](https://travis-ci.com/ODonoghueLab/versus)

Develop:  
[![Build Status](https://travis-ci.com/ODonoghueLab/versus.svg?token=dvwsqpX2xpST9Mi1JGuz&branch=develop)](https://travis-ci.com/ODonoghueLab/versus)

#Description
Versus is a web-based application that allows users ('requesters') to create multiple experiments based on a full 2AFC methodology (two alternative forced-choice). Participants ('workers') are presented two images side-by-side, and - without imposing a time constraint - they are now asked to choose one of the two images, see Heinrich et al. (2015, 2016).

# Getting Started
To get started working on versus there are a few prerequisites.

#### Linux [Ubuntu 16.04]
0. Make Sure to Update and Install PostgreSQL
    - Update.
    ```
    sudo apt-get update
    ```
    - Install.
    ```
    sudo apt-get install postgresql postgresql-contrib
    ```
1. Configure PostgreSQL - [Digital Ocean Guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04)
    - Create the `versus` Database.
        ```bash
        sudo -u postgres createdb versus
        ```
    - Set default password.
        ```bash
        sudo -u postgres psql postgres
        # \password postgres
        ```

2. Install Node Version Manager - [GitHub Repository](https://github.com/creationix/nvm)
    ```bash
    wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash
    nvm install 6.5
    nvm use 6.5
    ```
3. Clone the Repository!
    ```bash
    git clone https://github.com/ODonoghueLab/versus.git
    ```
4. Modify configuration files as needed.
    ```bash
    /config
    ```
5. Verify branch integrity and run project.
    ```bash
    npm test
    npm start
    ```

#### Mac
1. Install and Configure PostgreSQL
    ```bash
    brew install postgres
    ```

2. Install Node Version Manager - [GitHub Repository](https://github.com/creationix/nvm)
    ```bash
    brew install nvm
    nvm use 6.5
    ```
3. Clone the Repository!
    ```bash
    git clone https://github.com/ODonoghueLab/versus.git
    ```
4. Modify configuration files as needed.

    `note: postgres default configuration for mac is your username with no password.`
    ```bash
    /config
    ```
5. Verify branch integrity and run project.
    ```bash
    npm test
    npm start
    ```

#### Windows
Windows is not actively supported due to module dependencies. Results may vary.

#Development Workflow
* Write Code
* Write Tests
```
npm test
```
* If tests pass, branch and make merge requests
* Travis will block you if your branch build fails

##Git Issue Codes
* FN - Fix Now - Issues That Halt Progress
* CBT - Come Back To - Issues That Need Fixing But Not Urgent
* WLT - Would Like To - More Feature Idea/s Than Needed Fix
