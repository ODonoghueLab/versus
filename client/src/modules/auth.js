import axios from 'axios'
import _ from 'lodash'

// URL and endpoint constants
const API_URL = 'http://localhost:3000/api/'
const LOGIN_URL = API_URL + 'login/'
const SIGNUP_URL = API_URL + 'users/'

let user = {
  authenticated: false
}

export default {

  // User object will let us check authentication status
  user: user,

  // Send a request to the login URL and save the returned JWT
  login(creds) {
    return new Promise((resolve, reject) => {
      axios.post(LOGIN_URL, creds)
        .then(
          (res) => {
            let data = res.data
            if (res.data.success) {
              console.log('auth.login data', data)
              localStorage.setItem('id_token', data.id_token)
              localStorage.setItem('access_token', data.access_token)
              user.authenticated = true
              _.assign(user, data.user)
            }
            resolve(res)
          },
          (err) => {
            reject(err)
          })
    })
  },

  // To log out, we just need to remove the token
  logout() {
    localStorage.removeItem('id_token')
    localStorage.removeItem('access_token')
    user.authenticated = false
  },

  checkAuth() {
    var jwt = localStorage.getItem('id_token')
    if (jwt) {
      user.authenticated = true
    }
    else {
      user.authenticated = false
    }
  },

  // The object to be passed as a header for authenticated requests
  getAuthHeader() {
    return {
      'Authorization': 'Bearer ' + localStorage.getItem('access_token')
    }
  }
}
