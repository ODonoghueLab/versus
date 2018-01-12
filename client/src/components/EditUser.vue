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
        <label>New Password</label>
        <md-input
          type='password'
          v-model='rawPassword'
          placeholder='New Password'>
        </md-input>
      </md-input-container>
      <md-input-container>
        <label>New Password</label>
        <md-input
          type='password'
          v-model='rawPasswordConfirm'
          placeholder='Confirm Password'>
        </md-input>
      </md-input-container>
      <md-button type="submit" class="md-raised md-primary">
        Update
      </md-button>
      <div v-if="errors.length" class="card error">
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
  import _ from 'lodash'
  import auth from '../modules/auth'
  import util from '../modules/util'

  export default {
    name: 'EditUser',
    data () {
      let payload = _.assign({}, auth.user)
      _.assign(payload, {
        title: 'Edit Your Details',
        rawPassword: '',
        rawPasswordConfirm: '',
        errors: []
      })
      console.log('> EditUser.data', util.jstr(payload))
      return payload
    },
    methods: {
      async submit (e) {

        let payload = {}
        const keys = ['id', 'name', 'email', 'rawPassword', 'rawPasswordConfirm']
        for (let key of keys) {
          if (this.$data[key]) {
            payload[key] = this.$data[key]
          }
        }
        console.log('> EditUser.submit', util.jstr(payload))

        let res = await auth.update(payload)

        if (res.data.success) {

          console.log('> Register.submit success: login')
          await auth.login({
            email: payload.email,
            password: payload.password
          })
          this.$data.errors = ['success']
          this.$router.push('/experiments')

        } else {

          console.log('> EditUser.submit fail')
          if (res.data.errors) {
            this.$data.errors = res.data.errors
          }

        }
      }
    }
  }
</script>
