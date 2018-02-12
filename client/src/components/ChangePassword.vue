<template>
  <div style="padding: 1em">
    <h2 class="md-display-2">
      {{ title }}
    </h2>
    <form v-on:submit.prevent="submit">
      <md-input-container>
        <label>User id</label>
        <md-input
          type='text'
          v-model='id'
          placeholder='User id'>
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
      <md-button type="submit" class="md-raised md-primary">
        Update
      </md-button>
      <div v-if="msg" class="card error">
        {{ msg }}
      </div>
    </form>
  </div>
</template>

<script>
import auth from '../modules/auth'
import util from '../modules/util'

export default {
  name: 'ChangePassword',
  data () {
    let payload = {
      id: '',
      title: 'Edit Your Details',
      rawPassword: '',
      msg: ''
    }
    console.log('> ChangePassword.data', util.jstr(payload))
    return payload
  },
  methods: {
    async submit () {
      let payload = {}
      const keys = ['id', 'rawPassword']
      for (let key of keys) {
        if (this.$data[key]) {
          payload[key] = this.$data[key]
        }
      }

      let response = await auth.forceUpdate(payload)

      if (response.result) {
        this.msg = 'success'
        this.$router.push('/experiments')
      } else {
        console.log('> ChangePassword.submit fail')
        this.msg = response.error.message
      }
    }
  }
}
</script>
