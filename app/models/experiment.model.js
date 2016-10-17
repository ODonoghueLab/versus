"use strict";

module.exports = (sequelize, DataTypes) => {
  var Experiment = sequelize.define('Experiment', {
    name: DataTypes.STRING,
    description: DataTypes.STRING,
  }, {
    classMethods: {
      associate: function(models) {
        Experiment.hasMany(models.Image, {as: 'Images'});
        Experiment.belongsToMany(models.User, {through: 'UserExperiment'});
      }
    }
  });

  return Experiment;
};
