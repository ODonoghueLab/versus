module.exports = (app) => {
  // Page Landing
  app.get('/', (req, res) => {
    res.redirect('/dashboard');
  });
};
