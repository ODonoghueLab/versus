import axios from 'axios'
import _ from 'lodash'
import config from '../config'

// really important for using with passport.js
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

let user = {
  authenticated: false
}

export default {

  user: user,

  login (newUser) {
    console.log('>> auth.login', newUser)
    return axios
      .post(config.apiUrl + '/api/login', newUser)
      .then(
        (res) => {
          if (res.data.success) {
            localStorage.setItem('user', JSON.stringify(newUser))
            let returnUser = res.data.user
            user.authenticated = true
            _.assign(user, returnUser)
            console.log('>> auth.login user', user)
          }
          return res
        })
  },

  register (newUser) {
    console.log('>> auth.register', newUser)
    return axios.post(config.apiUrl + '/api/register', newUser)
  },

  update (editUser) {
    console.log('>> auth.update', editUser)
    return axios.post(config.apiUrl + '/api/update', editUser)
  },

  restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    console.log('>> auth.restoreLastUser', lastUser)
    return this.login(lastUser)
  },

  // To log out, we just need to remove the token
  logout () {
    localStorage.removeItem('user')
    user.authenticated = false
    return axios.post(`${config.apiUrl}/api/logout`)
  }
}
