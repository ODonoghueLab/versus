import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)

import UserExperiments from './components/UserExperiments'
import Experiment from './components/Experiment'
import CreateExperiment from './components/CreateExperiment'
import Participant from './components/Participant'
import Login from './components/Login'
import Register from './components/Register'
import EditUser from './components/EditUser'

import auth from './modules/auth'

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
      path: '/edit-user',
      name: 'editUser',
      component: EditUser
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
      path: '/participant/:participateId',
      name: 'participant',
      component: Participant
    }
  ]
})

export default router