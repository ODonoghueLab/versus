import axios from 'axios'
import _ from 'lodash'
import config from '../config'
import util from '../modules/util'
import SHA224 from '../modules/sha224/sha224'
import rpc from '../modules/rpc'


function hashPassword (password) {
  return SHA224(password).toString()
}

// really important for using with passport.js
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

let user = {
  authenticated: false
}

// let jwtToken = null

function getHeader() {
  if (user.jwtToken) {
    return {
      'Authorization': `Bearer ${user.jwtToken}`
    }
  } else {
    return {}
  }
}

export default {

  user: user,
  // jwtToken: jwtToken,

  login (newUser) {
    let payload = _.cloneDeep(newUser)
    payload.password = hashPassword(payload.password)
    console.log('>> auth.login newUser', payload)
    return rpc
      .rpcRun('login', payload)
      .then((res) => {
        if (res.data.success) {
          // localStorage.setItem('jwtToken', res.data.jwtToken)
          // jwtToken = res.data.jwtToken
          user.authenticated = true
          _.assign(user, res.data.user)
          user.password = newUser.password
          localStorage.setItem('user', util.jstr(user))
          console.log('>> auth.login user', util.jstr(user))
        }
        return res
      })
    // return axios
    //   .post(config.apiUrl + '/api/login', payload)
    //   .then((res) => {
    //     if (res.data.success) {
    //       // localStorage.setItem('jwtToken', res.data.jwtToken)
    //       // jwtToken = res.data.jwtToken
    //       user.authenticated = true
    //       _.assign(user, res.data.user)
    //       user.password = newUser.password
    //       localStorage.setItem('user', util.jstr(user))
    //       console.log('>> auth.login user', util.jstr(user))
    //     }
    //     return res
    //   })
  },

  register (newUser) {
    let payload = _.cloneDeep(newUser)
    payload.password = hashPassword(payload.password)
    payload.passwordv = hashPassword(payload.passwordv)
    console.log('>> auth.register', payload)
    return rpc.rpcRun('registerUser', payload)
    // return axios
    //   .post(config.apiUrl + '/api/register', payload)
  },

  update (editUser) {
    let payload = _.cloneDeep(editUser)
    payload.password = hashPassword(payload.password)
    payload.passwordv = hashPassword(payload.passwordv)
    payload.jwtToken = user.jwtToken
    console.log('>> auth.update', payload)
    return rpc.rpcRun('updateUser', payload)
      // .post(config.apiUrl + '/api/update', payload)
      .then(res => {
        if (res.data.success) {
          _.assign(user, payload)
          console.log('>> auth.update user', util.jstr(user))
          localStorage.setItem('user', JSON.stringify(user))
        }
        return res
      })
    // return axios
    //   .post(config.apiUrl + '/api/update', payload)
    //   .then(res => {
    //     if (res.data.success) {
    //       _.assign(user, payload)
    //       console.log('>> auth.update user', util.jstr(user))
    //       localStorage.setItem('user', JSON.stringify(user))
    //     }
    //     return res
    //   })
  },

  restoreLastUser () {
    let lastUser = JSON.parse(localStorage.getItem('user'))
    return new Promise((resolve) => {
      console.log('>> auth.restoreLastUser', lastUser)
      if (lastUser) {
        this.login(lastUser)
          .then(resolve)
          .catch(resolve)
      } else {
        resolve()
      }
    })
  },

  logout () {
    localStorage.removeItem('user')
    // localStorage.removeItem('jwtToken')
    user.authenticated = false
    return rpc.rpcRun('logout')
    // return axios.post(`${config.apiUrl}/api/logout`)
  }
}
