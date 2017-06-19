const models = require('../models');
const bcrypt = require('bcryptjs');

const auth = require('../modules/auth.js');

module.exports = (app) => {
  // [GET] Account Settings Form
  app.get('/account', auth.isAuth, (req, res) => {
    res.render('account')
  });

  // [POST] Account Settings Submission
  app.post('/account', auth.isAuth, (req, res) => {
    // Ensure all required fields are set and passwords match.
    if (!req.body.currentPassword) {
      res.render('error');
    } else if (!req.body.newPassword) { 
      res.render('error'); 
    } else if (!req.body.newPasswordConfirm) { 
      res.render('error'); 
    } else if (req.body.newPassword !== req.body.newPasswordConfirm) { 
      res.render('error'); 
      return null; 
    } else {
      // Compare the currentPassword entered to the users actual password.
      bcrypt.compare(req.body.currentPassword, req.user.password, (err, isMatch) => {
        if (isMatch) {
          models.User
            .update(
              { password: req.body.newPassword },
              { where: { id: req.user.id } })
            .catch(() => res.render('error'))
            .then(() => res.render(
              'account', { success: 'Successfully changed password' }));
        } else {
          res.render(
            'error', { error: 'Current Password was invalid, please try again.' });
        }
      });
    }
    return null;
  });
};
