/**
 * @fileOverview Entry point the the Versus web-client.
 *
 * The Vue build version to load with the `import` command
 * (runtime-only or standalone) has been set in webpack.base.conf
 * with an alias.
 */

import Vue from 'vue'
import Vuex from 'vuex'
import VueMaterial from 'vue-material'

import auth from './modules/auth.js'
import App from './App'
import router from './router'
import store from './store'

async function init() {
  // Allows vue to initialize directly with user
  await auth.restoreLastUser()

  Vue.config.productionTip = false
  Vue.use(VueMaterial)
  Vue.use(Vuex)

  new Vue({
    el: '#app',
    router,
    store: new Vuex.Store(store),
    template: '<App/>',
    components: {App}
  })
}

init()
