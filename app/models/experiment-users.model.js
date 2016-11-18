module.exports = (sequelize, DataTypes) => {
  return sequelize.define('UserExperiment', {
    permission: DataTypes.INTEGER
  });
};
