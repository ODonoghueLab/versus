# BaseGUI server

A node express server that takes rpc-json api requests, and
writes to a sequelize database.

It is designed to work with an SPA client that
makes predominantly ajax. 

The rpc-json procedure routes all calls through 
a common interface: a post call, with matching
function name, and function arguments, where all
function arguments must be a JSON-literal, or uploadable
files.

The returning function is a JSON-literal, or downloadable
file.

This simplifies the interface in extending the web-server
for a certain class of application -> those wrapping
the web-server around storage of a complex data-type
that does not need to be stored in a relational database
for searching.

The server implements a generic interface to a database,
using sequelize. The default databse is an sqlite
database, the basic database models only use fields
that can be implenmented in sqlite, postgres and mysql.

A base user class in the database is implemented, which is hooked into
the authentication library `passport`, which connects
the datatabase to the session manager.

## Why this approach?

Want to separate client from server -> SPA approach.

Data transfer is clear, JSON api, not server-side rendering.

Allows transparent swapping out of node/express server with
other servers, such as Python/flask server.

Why vue? Clean library that doesn't require typescript
or a new language.

Vue components are a great way of structuring front-end
code.

Vue material - is the google design hook to view. Material
Design is an excellent full-featured web-response/mobile-ready
design framework.

## RPC-JSON

Typical websites focus on customer data that is directly stored
in a relational database. The database model is the key transactional
model of the website. This suits an Restful web interface.

This framework is aimed at the websites that build on complex
computational models and calculations. Typically, such problems
have complex hierarchical data or parameters that are suited to
storage in flat fields of relational table data. As such, they
are best stored as a thin wrapper around a hierarchical data structure, and stored in
a database as a string/blob/binary field. JSON literals can
serve as an excellent cross-platform format in these cases.

When you have such structures, a RESTFul architecture can't easily
reflect the kinds of operations you would want to enact on such
a structure. Most calls from the client will be calling operations
on the model state, or modifying the complex underlying data.
As such, an RPC model better matches the operational approach to 
such a system. By mandating an rpc model, the underlying framework
simplifies. The loss of a natural link to the database is minimal
in this kind of system.

With a well-described rpc model, building up the system can take a very 
simple form, where server functions are declared, and can be automatically
looked up.

In such a system, the database can be abstracted out into functions where
the transactional database is never accessed directly.

Such a framework will allow a website wrapping computational models,
with a built-in user management system to be prototyped extremely rapidly.

- document api model -> how to integrate handlers
- handlers in their own file
- storing files on the server is important -> and getting them back
- serving the static web-client
- rpc—json api
- thin wrapper around dataase
- dataase - manager user, json-store
- sql is good, but simple
- use sqlite -> configuration free, get started quickly
- stick with abstract databases - only fields that can be transferred -> allows transition away from sqlite if so choose
- handlers -> json parameters in, json out
- abstract out models to only functions that return json
- basic user model - sha password in client, salt password for db
- vue-material
- client-side SPA - with ajax for all optional data - rpc-json-api
- frameworks make life a lot easier
- choose vue as it’s based on javascript
- vue - componenent model that combines HTML/CSS/Javascript provides the right level of encapsulation
- material design - google’s framework provides a modern, web-responsive well thought out framework for UX

