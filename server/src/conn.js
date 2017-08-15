// Centralized place to declare main app and db variables
// so that circular references are avoided when loading
// models.js, router.js and app.js

// Initialize express app
const express = require('express')
const app = express()

// initialize database using Sequelize
const env = process.env.NODE_ENV || 'development'
const dbConfig = require('./config')[env]
const Sequelize = require('sequelize')
const db = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig)

// Reset database `force: true` -> wipes database
db.sync({ force: false })

module.exports = {app, db}