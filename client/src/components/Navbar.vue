<template>
  <header class="sticky">

    <span class="logo">Versus</span>

    <span v-if="user.authenticated">
      <router-link to='Experiments' class='button'>
        Experiments
      </router-link>
      <span class="user">
        {{user.email}}
      </span>
      <button @click="logout">Logout</button>
    </span>

    <span v-else>
      <router-link to='Login' class='button'>
        Login
      </router-link>
    </span>

  </header>
</template>

<style scoped>
</style>

<script>

import auth from '../modules/auth'

export default {
  name: 'navbar',
  data() {
    return {
      user: auth.user
    }
  },
  methods: {
    logout: auth.logout
  }
}
</script>

