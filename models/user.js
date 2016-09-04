const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//User Schema
var userSchema = mongoose.Schema({
  name: {
    type: String,
    index: true
  },
  email: {
    type: String
  },
  password: {
    type: String
  }
});

//FIXME
//Change Promise Library

var User = module.exports = mongoose.model('User', userSchema);

// User Functions
module.exports.createUser = (newUser, callback) => {
  bcrypt.genSalt(10, function(err, salt){
    bcrypt.hash(newUser.password, salt, function(err, hash){
      newUser.password = hash;
      newUser.save(callback);
    });
  });
};

module.exports.getByEmail = (email, callback) => {
  User.findOne({email: email}, callback);
};

module.exports.getById = (id, callback) => {
  User.findById(id, callback);
};

module.exports.comparePassword = (password, hash, callback) => {
  bcrypt.compare(password, hash, (err,isMatch) => {

    if(err) {
      console.log("Password Compare error");
      throw err;
    }

    callback(null, isMatch);
  });
};
