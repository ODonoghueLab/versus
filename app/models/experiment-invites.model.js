

module.exports = (sequelize, DataTypes) => {
  const Invite = sequelize.define('Invite', {
    inviteId: { primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    email: DataTypes.STRING,
  }, {
    classMethods: {
      associate(models) {
        Invite.belongsTo(models.Experiment);
      },
    },
  });

  return Invite;
};
