<template>
  <md-toolbar v-if="isShowNavbar" class="md-dense">

    <md-icon md-src="./static/logo.png"/>

    <h2 class="md-title" style="padding-left: 1em; flex: 1">Versus</h2>

    <span v-if="user.authenticated">

      <router-link to='/experiments' class="md-button">
        Experiments
      </router-link>

      <md-menu>

        <md-button md-menu-trigger>
            {{user.name}}
        </md-button>

        <md-menu-content>
          <md-menu-item @click="editUser">Edit User
          </md-menu-item>
          <md-menu-item @click="logout">Logout</md-menu-item>
        </md-menu-content>
      </md-menu>

    </span>

    <router-link v-else to='/login' tag='md-button'>
      Login
    </router-link>

  </md-toolbar>
</template>

<script>
  import auth from '../modules/auth'
  import router from '../router'
  import util from '../modules/util'

  let publicPathTokens = [
    '/mechanical-turk',
    '/participant',
  ]

  export default {
    name: 'navbar',
    data () {
      return {
        user: auth.user,
      }
    },
    computed: {
      isShowNavbar () {
        if (this.$route.fullPath) {
          if (util.isStringInStringList(this.$route.fullPath, publicPathTokens)) {
            return false
          }
        }
        return true
      }
    },
    methods: {
      editUser () {
        router.push('/edit-user')
      },
      async logout () {
        await auth.logout()
        this.$router.push('/login')
      }
    }
  }
</script>

