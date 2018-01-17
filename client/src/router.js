/**
 * @fileoverview Defines the routes available for the webapp and
 * some guards for routes that require user authentication
 */

import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)

import auth from './modules/auth'
import util from './modules/util'

import Home from './components/Home'
import UserExperiments from './components/UserExperiments'
import Experiment from './components/Experiment'
import CreateExperiment from './components/CreateExperiment'
import Participant from './components/Participant'
import Login from './components/Login'
import Register from './components/Register'
import EditUser from './components/EditUser'
import MturkParticipant from './components/MturkParticipant'
import ChangePassword from './components/ChangePassword'

let router = new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
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
      path: '/change-password',
      name: 'changePassword',
      component: ChangePassword
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
    },
    {
      path: '/mechanical-turk/:experimentId',
      name: 'mturkParticipant',
      component: MturkParticipant
    }
  ]
})


let publicPathTokens = [
  '/mechanical-turk',
  '/participant',
  '/login',
  '/register'
]


router.beforeEach((to, from, next) => {
  if (util.isStringInStringList(to.path, publicPathTokens)
       || to.path === '/') {
    console.log('> router.beforeEach public', to.path)
    next()
  } else {
    if (!auth.user.authenticated) {
      console.log('> router.beforeEach blocked', to.path, 'to /')
      next('/login')
    } else {
      console.log('> router.beforeEach authenticated', to.path)
      next()
    }
  }
})

export default router
