// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.

import Vue from 'vue'
Vue.config.productionTip = false

import VueMaterial from 'vue-material'
Vue.use(VueMaterial)

import App from './App'
import auth from './modules/auth'

import router from './router.js'

auth
  .restoreLastUser()
  .then(() => {
    new Vue({
      el: '#app',
      router,
      template: '<App/>',
      components: {App}
    })
  })
