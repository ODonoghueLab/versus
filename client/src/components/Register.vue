<template>
  <div style="padding: 1em">
    <h2 class="md-display-2">
      {{ title }}
    </h2>
    <form v-on:submit.prevent="submit">
      <md-input-container>
        <label>User name</label>
        <md-input
            type='text'
            v-model='name'
            placeholder='User name'>
        </md-input>
      </md-input-container>
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
      <md-input-container>
        <label>Confirm Password</label>
        <md-input
            type='password'
            v-model='rawPasswordConfirm'
            placeholder='Confirm Password'>
        </md-input>
      </md-input-container>
      <md-button type="submit" class="md-raised md-primary">
        Register
      </md-button>
      <div v-if="errors.length" style="color: red">
        <ul>
          <li v-for="err in errors">
            {{ err }}
          </li>
        </ul>
      </div>
    </form>
  </div>
</template>

<script>

import auth from '../modules/auth'

export default {
  name: 'Register',
  data() {
    return {
      title: 'Please register to Versus',
      name: '',
      email: '',
      rawPassword: '',
      rawPasswordConfirm: '',
      user: auth.user,
      errors: []
    }
  },
  methods: {
    submit(e) {
      let payload = {
        name: this.$data.name,
        email: this.$data.email,
        rawPassword: this.$data.rawPassword,
        rawPasswordConfirm: this.$data.rawPasswordConfirm
      }
      auth
        .register(payload)
        .then((res) => {
          if (res.data.success) {
            console.log('> Register.submit success: login')
            return auth.login({
              email: payload.email,
              rawPassword: payload.rawPassword
            })
          } else {
            console.log('> Register.submit fail', res.data)
            this.$data.errors = res.data.errors
            return { data: { success: false } }
          }
        })
        .then((res) => {
          if (res.data.success) {
            this.$router.push('/experiments')
          }
        })
    }
  }
}
</script>
