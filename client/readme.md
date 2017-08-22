# BaseGui

This is a pre-built web-client that works with an RPC-JSON api.

The web-client uses the vue.js framework and is written with vue components.

The vue.js client is built on the hot-reload template, which is useful for
development, and can be compiled to the dist directory for production.

The web-client makes rpc calls to a web-server at localhost:3000.

A local-based user system is implemented with register/login/edit-user pages.
The user and a hashed-password is stored in local-storage to maintain
permanent sessions until logout. On load, the loacl-storage is checked for an
exisiting user, and the credentials are sent to login.

Verification on the server is assumed after login, for rpc calls that require
a login.

Configuration is in src/config.js that sets the ip:port combo that the client
expects.

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run e2e tests
npm run e2e

# run all tests
npm test
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
