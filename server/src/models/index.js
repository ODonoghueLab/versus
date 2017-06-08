const path = require('path');

const _ = require('lodash');
const bcrypt = require('bcryptjs');

// initialize database using Sequelize
const configFname = path.join(__dirname, '..', 'config', 'keys.json');
const env = process.env.NODE_ENV || 'development';
const config = require(configFname)[env]; // eslint-disable-line
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  config.database, config.username, config.password, config);


/**
 * Definitions of the database for Versus
 */

const User = sequelize.define('User', {
  firstName: Sequelize.STRING,
  lastName: Sequelize.STRING,
  email: { type: Sequelize.STRING, unique: true },
  password: Sequelize.STRING,
}, {
  classMethods: {
    associate(models) {
      User.belongsToMany(
        models.Experiment, 
        { through: models.UserExperiment });
    },
  },
});
User.beforeValidate((user) => {
  user.password = bcrypt.hashSync(
    user.password, bcrypt.genSaltSync(10));
});


const Image = sequelize.define('Image', {
  url: Sequelize.STRING
}, {
  classMethods: {
    associate(models) {
      Image.belongsTo( 
        models.Experiment, {onDelete: 'cascade'});
    }
  }
});


const Invite = sequelize.define('Invite', {
  inviteId: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  email: Sequelize.STRING,
  type: Sequelize.ENUM('collaborate', 'participate'), 
}, {
  classMethods: {
    associate(models) {
      Invite.belongsTo(
        models.Experiment,
        {onDelete: 'cascade'});
    },
  },
});


const Result = sequelize.define('Result', {
  inviteId: { 
    primaryKey: true, 
    type: Sequelize.UUID, 
    defaultValue: Sequelize.UUIDV4 
  },
  age: Sequelize.INTEGER,
  gender: Sequelize.ENUM('male', 'female', 'other'), 
  state: Sequelize.JSON
}, {
  classMethods: {
    associate(models) {
      Result.belongsTo(models.Experiment);
    },
  },
});


const UserExperiment = sequelize.define('UserExperiment', {
  permission: Sequelize.INTEGER,
});


const Experiment = sequelize.define('Experiment', {
  name: Sequelize.STRING,
  description: Sequelize.STRING,
}, {
  classMethods: {
    associate(models) {
      Experiment.hasMany(models.Image, {as: 'Images'});
      Experiment.belongsToMany(
        models.User, {through: models.UserExperiment});
      Experiment.hasMany(models.Invite, {as: 'Invites'});
      Experiment.hasMany(models.Result, {as: 'Results'});
    },
  },
});


const models = {
  sequelize, 
  User, 
  Image, 
  Invite, 
  Result,
  UserExperiment,
  Experiment
};

_.each(_.values(models), model => {
  if (model.associate) {
    model.associate(models);
  }
});

module.exports = models;
