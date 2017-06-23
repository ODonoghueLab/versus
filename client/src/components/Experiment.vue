<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12 col-md-12 col-lg-12">
        <h1> Experiment - {{experiment.name}} </h1>
        <div class="row">
          <div class="col-sm-12 col-md-6 col-lg-4">
            <h3>participants</h3>
            <button @click="makeInvite">
              Invite participant
            </button>
            <button @click="downloadResults">
              Download Results
            </button>
            <table>
              <tr v-for="participant in experiment.participants">
                <td>
                <router-link v-bind:to="getInviteRoute(participant)">{{participant.inviteId}}</router-link>
                </td>
                <td>
                <a class="button" 
                   @click="deleteInvite(participant)">X</a>
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
  },
  mounted () {
    let experimentId = this.$route.params.experimentId
    axios
      .post(
        `${config.api}/experiment/${experimentId}`,
        { userId: auth.user.id })
      .then((res) => {
        console.log('>> Experiment.mounted', res.data.experiment)
        this.$data.experiment = res.data.experiment
      })
  },
  methods: {
    downloadResults() {
      console.log('>> Experiment.downloadResults')
      let experiment = this.$data.experiment
      let participants = experiment.participants
      let payload = _.map(participants, participant => {
        return {
          user: participant.user,
          ranks: participant.state.ranks,
          time: {
            start: participant.createdAt,
            end: participant.updatedAt
          }
        }
      })
      console.log(payload)
      // payload = this.$data.experiment
      util.downloadObject('results.json', payload)
    },
    getInviteRoute(participant) {
      return `/participant/${participant.inviteId}`
    },
    deleteInvite(participant) {
      let url = `${config.api}/delete-invite/${participant.inviteId}`
      axios
        .post(url)
        .then((res) => {
          console.log('>> Experiment.deleteInvite', res.data)
          let participants = this.$data.experiment.participants
          util.removeItem(participants, participant, 'inviteId')
        })
    },
    makeInvite () {
      let experimentId = this.$route.params.experimentId
      let participants = this.$data.experiment.participants
      let url = `${config.api}/participate-invite/${experimentId}`
      axios
        .post(url, { email: 'test@test.com' })
        .then((res) => {
          console.log('>> Experiment.makeInvite', res.data)
          participants.push(res.data.participant)
        })
    }
  }
}

</script>

