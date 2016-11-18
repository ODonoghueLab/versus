// Email Client for sending Invites to Collaborators or Participants.
const config = require('../config/keys.json');
const ses = require('node-ses');

// Initialise AWS SES Mail Client
const client = ses.createClient({ key: config.aws.id, secret: config.aws.secret });

// Send an invite to the user via email.
module.exports.sendInvite = (type, email, invite) => {
  
  // Invite to Participate.
  if (type === 'participate') {
    client.sendEmail({
      to: email,
      from: 'versus@binaryorange.co',
      subject: 'Invite to participate in experiment',
      message: 'You have been invited to participate in an experiment on Versus.' +
      'Click on the link below to participate. <br>' +
      'http://' + config.server.domain + ':' + config.server.port + '/' + invite
    }, function (err, data, res) {
      if (err) new Error(err);
    });
  }

  // Invite to Collaborate.
  else if (type === 'collaborate') {
    client.sendEmail({
      to: email,
      from: 'versus@binaryorange.co',
      subject: 'Invite to collaborate on experiment',
      message: 'You have been invited to collaborate on an experiment on Versus.' +
      'Click on the link below to collaborate. <br>' +
      'http://' + config.server.domain + ':' + config.server.port + '/' + invite
    }, function (err, data, res) {
      if (err) new Error(err);
    });
  }
  
  // Oops...
  else new Error('type not supported');
};