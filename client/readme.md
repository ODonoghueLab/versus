
# Versus Web-client

Versus web-client is:

-  standalone Javascript single-page-application
- written in ECMAScript 6
- uses the Vue framework
- built on the default vue-loader template (checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader)).
- compiled using webpack
- talks to the server via a ajax api, using the RPC-JSON protocol

## Files

The entry point to the web-client is `client/index.html`. It will refer to javascript files in the `client/src` directory:

- `main.js` - entry point of app, called from `index.html` in the parent directory
- `router.js` - defines all the pages, and their associated Vue components
- `config.js` - defines the url for the ajax api calls
- `App.vue` - the top-level Vue component

Since the web-client is a Vue.js app, it makes heavy use of `.vue` components, which wraps Javascript/HTML/CSS together into single files for specific functionality. This makes it the code particularly easy to read and reason about. The specific Vue components, corresponding to elements and pages are defined in the `client/src/components` directory. They are:

- `Navbar.vue` - defines the navigation bar at the top of all 
- `Home.vue` - home page with introduction, and buttons to `login` or `register`
- `Register.vue` - user registration page
- `Login.vue` - user login page
- `UserExperiments.vue` - the user's home page, listing available experiments, with a button to create a new experiment
- `CreateExperiment.vue` - page to create new experiment, with image upload
- `Experiment.vue` - the page to show/edit an experiment, invite participants and download results
- `Participant.vue` - a publicly-accessible page, for the user to run through the image comparisons of the 2FAC experiment, will issue a survey link at the end of the run
- `MturkParticipant.vue` - a welcome page for mechanical turk workers for a given experiment, creates a new partcipant, and a button the new page created for the participant

## Configuration

The web-client needs to be compiled to be used. There are two options for this.

1. In development, the compilation can be done with the Vue hot-reloading client-server. This can be run:

   ```bash
   npm run dev
   ```

   The web-client will now be available at `localhost:8080`.

2. In production, the web-client must be compiled to static form:

   ```bash
   npm run build
   ```

   and will be compiled to the `build` directory, with the entry point at `build/index.html`.

The web-client will make cross-origin-site JSON api calls to the url designated in `src/config.js`. By default, this is `localhost:3000`, but you should put in the full IP address of the backend-server.


