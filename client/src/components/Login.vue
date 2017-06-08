<template>
  <div class="container">
    <div class="row">
      <div class="
                  col-sm-6 col-sm-offset-3 
                  col-md-6 col-md-3-offset 
                  col-lg-4 col-lg-offset-4"
           style="padding-top: 4em">
        <form class="login-screen"
              v-on:submit.prevent="submit">
          <h2>{{ title }}</h2>
          <input type='text'
                 name='username'
                 v-model='username'
                 placeholder='E-mail address'>
          </input>
          <br>
          <input type='password'
                 v-model='password'
                 placeholder='Password'>
          </input>
          <br>
          <button @click='submit'>login</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import auth from '../modules/auth'
import Router from 'vue-router'

import router from '../router'

export default {
  name: 'Login',
  data() {
    return {
      title: 'Welcome to Versus',
      username: '',
      password: '',
      user: auth.user
    }
  },
  methods: {
    submit(e) {
      let credentials = {
        username: this.$data.username,
        password: this.$data.password
      }
      auth
        .login(credentials)
        .then((res) => {
          if (res.data.success) {
            this.$router.push('/experiments')
          }
        })
    }
  }
}
</script>
