module.exports.isAuth = (req, res, next) => {
  if (req.isAuthenticated()) { return next(); }
  return res.render('dash', { errors: ['Please Login To Continue'] });
};
