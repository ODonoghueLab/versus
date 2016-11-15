

module.exports = (sequelize, DataTypes) => {
  const Result = sequelize.define('Result', {
    inviteId: DataTypes.UUID,
    age: DataTypes.INTEGER,
    gender: DataTypes.ENUM('male', 'female', 'other'),
    imageIndex: DataTypes.INTEGER,
    treeIndex: DataTypes.INTEGER,
    tree: DataTypes.JSON,
  }, {
    classMethods: {
      associate(models) {
        Result.belongsTo(models.Experiment);
      },
    },
  });

  return Result;
};
