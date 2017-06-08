// Email Client for sending Invites to Collaborators or Participants.
const config = require(`${__dirname}/../../config/keys.json`); //eslint-disable-line
const ses = require('node-ses');

// Initialise AWS SES Mail Client
const client = ses.createClient({ key: config.aws.id, secret: config.aws.secret });

// Send an invite to the user via email.
module.exports.sendInvite = (type, email, inviteId) => {
  // Invite to Participate.
  if (type === 'participate') {
    client.sendEmail({
      to: email,
      from: 'versus@binaryorange.co',
      subject: 'Invite to participate in experiment',
      message: `${'You have been invited to participate in an experiment on Versus.' +
      'Click on the link below to participate. <br>' +
      'http://'}${config.server.domain}:${config.server.port}/invites/${inviteId}`,
    }, (err) => {
      if (err) throw Error(err);
    });
  }

  // Invite to Collaborate.
  else if (type === 'collaborate') { // eslint-disable-line
    client.sendEmail({
      to: email,
      from: 'versus@binaryorange.co',
      subject: 'Invite to collaborate on experiment',
      message: `${'You have been invited to collaborate on an experiment on Versus.' +
          'Click on the link below to collaborate. <br>' +
          'http://'}${config.server.domain}:${config.server.port}/invites/${inviteId}`,
    }, (err) => {
      if (err) throw Error(err);
    });
  }

  // Oops...
  else throw Error('type not supported'); // eslint-disable-line
};
