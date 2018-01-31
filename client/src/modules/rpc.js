import axios from 'axios'
import _ from 'lodash'
import config from '../config'

/**
 * @fileOverview rpc module provides a clean rpc interface for JSON-based
 * api with the server.
 */

// important for using with passport.js
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

export default {

  rpcRun (method, ...args) {
    let params = _.cloneDeep(args)
    let payload = {method, args: params, jsonrpc: "2.0"}
    console.log('> rpc.rpcRun', method, ...params)
    return axios.post(`${config.apiUrl}/api/rpc-run`, payload)
  },

  rpcUpload (method, files, ...args) {
    let params = _.cloneDeep(args)

    let formData = new FormData()
    formData.append('method', method)
    formData.append('args', JSON.stringify(params))
    formData.append('jsonrpc',  "2.0")
    for (let f of files) {
      formData.append('uploadFiles', f, f.name)
    }

    let filenames = _.map(files, 'name')
    console.log('> rpc.rpcUpoad', method, ...params, filenames)
    return axios.post(`${config.apiUrl}/api/rpc-upload`, formData)
  }

}
