"use strict";

const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  var User = sequelize.define('User', {
    name: DataTypes.STRING,
    email: {type: DataTypes.STRING, unique: true},
    password: DataTypes.STRING,
  }, {
    classMethods: {
      associate: function(models) {
        User.belongsToMany(models.Experiment, {through: 'UserExperiment'});
      }
    }
  });

  User.beforeValidate((user) => {
    user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10));
  });

  return User;
};
