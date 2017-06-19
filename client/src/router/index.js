import _ from 'lodash'
import Vue from 'vue'
import Router from 'vue-router'
import UserExperiments from '@/components/UserExperiments'
import Experiment from '@/components/Experiment'
import CreateExperiment from '@/components/CreateExperiment'
import Invite from '@/components/Invite'
import Login from '@/components/Login'
import Register from '@/components/Register'
import auth from '../modules/auth'

Vue.use(Router)

let router = new Router({
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
      path: '/login',
      name: 'login',
      component: Login
    },
    {
      path: '/register',
      name: 'register',
      component: Register
    },
    {
      path: '/experiments',
      name: 'expriments',
      component: UserExperiments
    },
    {
      path: '/create-experiment',
      name: 'createExpriment',
      component: CreateExperiment
    },
    {
      path: '/experiment/:experimentId',
      name: 'expriment',
      component: Experiment
    },
    {
      path: '/invite/:inviteId',
      name: 'invite',
      component: Invite
    }
  ]
})

export default router
