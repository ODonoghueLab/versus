<template>
  <div class="container">
    <div class="row">
      <div 
          class="
            col-sm-6 col-sm-offset-3 
            col-md-6 col-md-3-offset 
            col-lg-4 col-lg-offset-4"
          style="
            padding-top: 4em">
        <form class="login-screen"
              v-on:submit.prevent="submit">
          <h2>{{ title }}</h2>
          <input 
              type='text'
              v-model='email'
              placeholder='E-mail address'>
          </input>
          <br>
          <input 
              type='password'
              v-model='password'
              placeholder='Password'>
          </input>
          <br>
          <button>login</button>
          <div v-if="msg" class="card error">
            {{ msg }}
          </div>
        </form>
        <div style="padding-left: 2em">
          New to Versus? 
          <router-link to="/register">Register</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import Router from 'vue-router'
import auth from '../modules/auth'

export default {
  name: 'Login',
  data() {
    return {
      title: 'Welcome to Versus',
      email: '',
      password: '',
      msg: ''
    }
  },
  methods: {
    submit(e) {
      let payload = {
        email: this.$data.email,
        password: this.$data.password
      }
      console.log('>> Login.submit', payload)
      auth
        .login(payload)
        .then((res) => {
          if (res.data.success) {
            this.$router.push('/experiments')
          } else {
            this.$data.msg = res.data.msg
          }
        })
    }
  }
}
</script>
