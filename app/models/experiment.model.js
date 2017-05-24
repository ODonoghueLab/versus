module.exports = (sequelize, DataTypes) => {
  const Experiment = sequelize.define(
    'Experiment',
    {
      name: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      classMethods: {
        associate(models) {
          Experiment.hasMany(models.Image, {as: 'Images'});
          Experiment.belongsToMany(models.User, {through: models.UserExperiment});
          Experiment.hasMany(models.Invite, {as: 'Invites'});
          Experiment.hasMany(models.Result, {as: 'Results'});
        },
      },
    });

  return Experiment;
};
