module.exports = (app) => {

  //Logout
  app.get('/logout', (req, res) => {
    req.session.destroy();
    req.logout();
    res.render('dash', {success: ["You have been Logged Out."]});
  });

}
