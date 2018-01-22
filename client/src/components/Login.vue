<template>
  <div style="padding: 1em">

    <h2 class="md-display-2">
      {{ title }}
    </h2>

    <form
        novalidate class="login-screen"
        v-on:submit.prevent="submit">

      <md-input-container>
        <label>E-mail address</label>
        <md-input
            type='text'
            v-model='email'
            placeholder='E-mail address'>
        </md-input>
      </md-input-container>

      <md-input-container>
        <label>Password</label>
        <md-input
            type='password'
            v-model='rawPassword'
            placeholder='Password'>
        </md-input>
      </md-input-container>

      <md-button
          type="submit"
          class="md-raised md-primary">
        login
      </md-button>

      <div v-if="error" style="color: red">
        {{ error }}
      </div>

      <br>
      <br>
      <br>
      New to Versus? &nbsp;
      <router-link to="/register">Register</router-link>

    </form>

  </div>
</template>

<script>
  import auth from '../modules/auth'

  export default {
    name: 'Login',
    data() {
      return {
        title: 'Login to Versus',
        email: '',
        rawPassword: '',
        error: ''
      }
    },
    methods: {
      submit() {
        let payload = {
          email: this.$data.email,
          rawPassword: this.$data.rawPassword
        }
        console.log('> Login.submit', payload)
        auth
          .login(payload)
          .then((res) => {
            if (res.data.success) {
              this.$router.push('/experiments')
            } else {
              this.$data.error = res.data.msg
            }
          })
      }
    }
  }
</script>
