<template>
  <div id='app'>
    <navbar></navbar>
    <router-view></router-view>
  </div>
</template>

<style>
  @import "../node_modules/vue-material/dist/vue-material.css";
  @import "http://fonts.googleapis.com/css?family=Roboto:300,400,500,700,400italic";
  @import "http://fonts.googleapis.com/icon?family=Material+Icons";
</style>

<script>
  import _ from 'lodash'
  import Navbar from './components/Navbar.vue'
  import auth from './modules/auth'
  import router from './router'

  export default {
    name: 'app',
    components: {Navbar},
    created () {
      if (_.startsWith('/participant', this.$route.path)) {
        console.log('> Publicly accessible', this.$route.path)
      } else if (_.startsWith('/mechanical-turk', this.$route.path)) {
        console.log('> Publicly accessible', this.$route.path)
      } else if (!auth.user.authenticated) {
        console.log('> Not logged-in: denied access to', this.$route.path)
        router.push('/login')
      }
    }
  }
</script>

