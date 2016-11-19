

module.exports = (sequelize, DataTypes) => {
  const Result = sequelize.define('Result', {
    inviteId: { primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    age: DataTypes.INTEGER,
    gender: DataTypes.ENUM('male', 'female', 'other'), // eslint-disable-line
    imageIndex: DataTypes.INTEGER,
    treeIndex: DataTypes.INTEGER,
    tree: DataTypes.ARRAY(DataTypes.JSON), // eslint-disable-line
    Ranks: DataTypes.ARRAY(DataTypes.STRING), // eslint-disable-line
  }, {
    classMethods: {
      associate(models) {
        Result.belongsTo(models.Experiment);
      },
    },
  });

  return Result;
};
