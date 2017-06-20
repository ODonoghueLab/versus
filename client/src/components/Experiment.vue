<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12 col-md-12 col-lg-12">
        <h1> Experiment - {{experiment.name}} </h1>
        <div class="row">
          <div class="col-sm-12 col-md-6 col-lg-4">
            <h3>Invites</h3>
            <button @click="makeInvite">
              New Invite
            </button>
            <table>
              <tr v-for="invite in experiment.Invites">
                <td>
                <router-link v-bind:to="getInviteRoute(invite)">{{invite.inviteId}}</router-link>
                </td>
                <td>
                <a class="button" 
                   @click="deleteInvite(invite)">X</a>
                </td>
              </tr>
            </table>
          </div>
          <div class="col-sm-12 col-md-6 col-lg-8">
            <h3>Images</h3>
            <div class="row">
              <img 
                  class="small card"
                  v-for="url in imageUrls"
                  v-bind:src="url">
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
</style>

<script>
import axios from 'axios'

import config from '../config'
import auth from '../modules/auth'
import util from '../modules/util'

export default {
  name: 'experiment',
  data() {
    return {
      experiment: {}
    }
  },
  computed: {
    imageUrls: function () {
      let images = this.$data.experiment.Images
      return _.map( images, i => config.apiUrl + i.url)
    },
    inviteRoutes: function () {
      let invites = this.$data.experiment.Invites
      return _.map(invites, i => `/invite/${i.inviteId}`)
    }
  },
  mounted () {
    let experimentId = this.$route.params.experimentId
    axios
      .post(
        `${config.api}/experiment/${experimentId}`,
        { userId: auth.user.id })
      .then((res) => {
        this.$data.experiment = res.data.experiment
        console.log('>> Experiment.mounted', this.$data.experiment)
      })
  },
  methods: {
    getInviteRoute(invite) {
      return `/invite/${invite.inviteId}`
    },
    deleteInvite(invite) {
      let url = `${config.api}/delete-invite/${invite.inviteId}`
      axios
        .post(url)
        .then((res) => {
          console.log('>> Experiment.deleteInvite', res.data)
          let invites = this.$data.experiment.Invites
          util.removeItem(invites, invite, 'inviteId')
        })
    },
    makeInvite () {
      let experimentId = this.$route.params.experimentId
      let invites = this.$data.experiment.Invites
      let url = `${config.api}/participate-invite/${experimentId}`
      axios
        .post(url, { email: 'test@test.com' })
        .then((res) => {
          invites.push(res.data.invite)
        })
    }
  }
}

</script>

