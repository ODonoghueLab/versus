"use strict";

module.exports = (sequelize, DataTypes) => {
  var Image = sequelize.define('Image', {
    url: DataTypes.STRING,
  }, {
    classMethods: {
      associate: function(models) {
        Image.belongsTo(models.Experiment);
      }
    }
  });

  return Image;
};
