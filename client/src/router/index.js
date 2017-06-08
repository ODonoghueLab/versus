import Vue from 'vue'
import Router from 'vue-router'
import Experiments from '@/components/Experiments'
import Login from '@/components/Login'
import auth from '../modules/auth'
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      redirect: to => {
        if (auth.user.authenticated) {
          return '/experiments'
        } else {
          return '/login'
        }
      }
    },
    {
      path: '/Login',
      name: 'Login',
      component: Login
    },
    {
      path: '/experiments',
      name: 'Expriments',
      component: Experiments
    }
  ]
})
