

module.exports = (sequelize, DataTypes) => {
  const Image = sequelize.define('Image', {
    url: DataTypes.STRING,
  }, {
    classMethods: {
      associate(models) {
        Image.belongsTo(models.Experiment);
      },
    },
  });

  return Image;
};
