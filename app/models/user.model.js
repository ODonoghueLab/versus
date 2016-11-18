const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
  }, {
    classMethods: {
      associate(models) {
        User.belongsToMany(models.Experiment, { through: models.UserExperiment });
      },
    },
  });

  User.beforeValidate((user) => {
    user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10)); // eslint-disable-line
  });

  return User;
};
