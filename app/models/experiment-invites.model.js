module.exports = (sequelize, DataTypes) => {
  const Invite = sequelize.define('Invite', {
    inviteId: { primaryKey: true, type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
    email: DataTypes.STRING,
    type: DataTypes.ENUM('collaborate', 'participate'), // eslint-disable-line
  }, {
    classMethods: {
      associate(models) {
        Invite.belongsTo(models.Experiment, { onDelete: 'cascade' });
      },
    },
  });

  return Invite;
};
