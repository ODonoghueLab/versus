module.exports = (app) => {
  // Page Landing
  app.get('/', (req, res) => {
    try {
      res.render('dash', { name: req.user.name });
    } catch (err) {
      res.render('dash');
    }
  });
};
