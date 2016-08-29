module.exports = (app) => {

  //Page Landing
  app.get('/failure', (req, res) => {
    res.render('failure');
  });

}
