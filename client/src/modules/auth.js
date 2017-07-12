import axios from 'axios'
import _ from 'lodash'
import config from '../config'
import util from '../modules/util'
// really important for using with passport.js
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

let user = {
  authenticated: false
}

// let jwtToken = null

export default {

  user: user,
  // jwtToken: jwtToken,

  login (newUser) {
    console.log('>> auth.login newUser', newUser)
    return axios
      .post(config.apiUrl + '/api/login', newUser)
      .then((res) => {
        if (res.data.success) {
          localStorage.setItem('user', JSON.stringify(newUser))
          // localStorage.setItem('jwtToken', res.data.jwtToken)
          // jwtToken = res.data.jwtToken
          user.authenticated = true
          _.assign(user, res.data.user)
          _.assign(user, newUser)
          console.log('>> auth.login user', util.jstr(user))
        }
        return res
      })
  },

  register (newUser) {
    console.log('>> auth.register', newUser)
    return axios.post(config.apiUrl + '/api/register', newUser)
  },

  update (editUser) {
    return axios
      .post(config.apiUrl + '/api/update', editUser)
      .then(res => {
        if (res.data.success) {
          _.assign(user, editUser)
          console.log('>> auth.update user', util.jstr(user))
          localStorage.setItem('user', JSON.stringify(user))
        }
        return res
      })
  },

  restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    // let jwtToken = localStorage.getItem('jwtToken')
    console.log('>> auth.restoreLastUser', lastUser)
    return this.login(lastUser)
  },

  logout () {
    localStorage.removeItem('user')
    // localStorage.removeItem('jwtToken')
    user.authenticated = false
    return axios.post(`${config.apiUrl}/api/logout`)
  }
}
