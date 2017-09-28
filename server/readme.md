# Versus back-end server

The Versus back-end server is a Node Express server, that is designed to server JSON-based API requests, serve files, and handle a database. The 

Specifically, the back-end is not responsible for the front-end, except for serving the client as a compiled javascript single-page application from a static directory. Communication between web-client and the back-end server is done through a JSON-based API. In particular, this is achieved through an RPC-JSON api, where both the web-client and backend-server implements a uniform API so that new handlers can be added in a simple and transparent manner.

## Database

The server talks to the database through the Sequelize ORM. The default is a Sqlite database located at `<versus>/sever/database.sqlite`. The database models only use fields that can be implenmented in other databases, such as Postgres and MySQL.

The backend-server talks to the database through the Sequelize ORM. The default database is a simple single-file Sqlite3 database and writes to the file `<versus>/server/database.sqlite`. The database configuration is also defined in `<versus>/client/src/config.js`.

The database schema only uses database fields that can work with other databases in Sequelize. The database can be changed in the server config file `<versus>/client/src/config.js`. If you do use another database, you will have to set it up yourself. For instance to setup Postgres on Linux, here's an [installation guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-16-04).

## User authentication

The base user class in the database is implemented, which hooks into the the authentication library `passport`, which connects the datatabase to the session manager.

The user authentication is done through passport, using a local strategy

## Files

- `app.js` - entry point of server, loads all other modules
- `config.js` - configuration of the IP, and database
- `conn.js` - storage of key global variables in the Node/Sequelize ecosystem
- `model.js` - defines the database models, and all database access functions - these only accepts and returns Javascript object literals
- `router.js` - this defines the key http handlers. In the RPC-JSON approach, there are only 3 handlers, a generic run handler, an upload handler, and a download handler. As well, there is a bridge to uploaded files, which are publically accessible.
- `handlers.js` - this defines all the javascript functions that are automatically accessible via the RPC-JSON api. These functions interface the database to the web-client. 

The specific domain functions are placed in the `modules` directory:

- `modules/tree.js` - implements the binary-tree search and handles all the comparisons and image comparisons

  ​

  ## 

