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

  // User object will let us check authentication status
  user: user,

  // Send a request to the login URL and save the returned JWT
  login (newUser) {
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
    return axios.post(config.apiUrl + '/api/register', newUser)
  },

  update (user) {
    console.log('>> auth.update', user)
    return axios.post(config.apiUrl + '/api/update', user)
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
