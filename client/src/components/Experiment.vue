<template>
  <div style="padding-left: 1em; padding-right: 1em; text-align: left">
    <h2 class="md-display-2">
      Experiment: {{experiment.name}}
    </h2>
    <h3 class="md-title">Participants</h3>
    <md-button class="md-raised" @click="makeInvite">
      Invite participant
    </md-button>
    <md-button class="md-raised" @click="downloadResults">
      Download Results
    </md-button>
    <md-table v-if="experiment.participants && experiment.participants.length">
      <md-table-header>
        <md-table-row>
          <md-table-head>Invite</md-table-head>
          <md-table-head>Age</md-table-head>
          <md-table-head>Gender</md-table-head>
          <md-table-head>Best Image</md-table-head>
          <md-table-head>Created</md-table-head>
          <md-table-head>Updated</md-table-head>
        </md-table-row>
      </md-table-header>
      <md-table-body>
        <md-table-row v-for="(participant, index) in experiment.participants" :key="index">
          <md-table-cell>
            <router-link
                class="button"
                v-bind:to="getInviteRoute(participant)">
              invite
            </router-link>
          </md-table-cell>
          <md-table-cell>
            <span v-if="participant.user">
              {{participant.user.age}}
            </span>
          </md-table-cell>
          <md-table-cell>
            <span v-if="participant.user">
              {{participant.user.gender}}
            </span>
          </md-table-cell>
          <md-table-cell>
            <span v-if="participant.state.ranks.length">
              <a
                  class="button"
                  v-bind:href="participant.state.ranks[0]">
                Image
              </a>
            </span>
          </md-table-cell>
          <md-table-cell>
            {{reformatDate(participant, 'createdAt')}}
          </md-table-cell>
          <md-table-cell>
            {{reformatDate(participant, 'updatedAt')}}
          </md-table-cell>
          <md-table-cell>
            <md-button class="md-icon-button md-raised"
                       @click="deleteInvite(participant)">
              <md-icon>delete</md-icon>
            </md-button>
          </md-table-cell>
        </md-table-row>
      </md-table-body>
    </md-table>

    <h3>Images</h3>

    <md-layout md-gutter :md-gutter="40">
      <md-layout  md-gutter :md-gutter="40">
        <md-card v-for="(url, index) in imageUrls" :key="index">
          <img style="width: 100px" v-bind:src="url">
        </md-card>
      </md-layout>
    </md-layout>

  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
  .left-margin {
    margin-left: 10px
  }
</style>

<script>
  import axios from 'axios'
  import config from '../config'
  import auth from '../modules/auth'
  import util from '../modules/util'
  import rpc from '../modules/rpc'

  function getFullUrl (url) {
    return config.apiUrl + url
  }

  export default {
    name: 'experiment',
    data() {
      return {
        experiment: {}
      }
    },
    computed: {
      imageUrls: function() {
        let urls = _.map(this.$data.experiment.Images, 'url')
        return _.map(urls, getFullUrl)
      },
    },
    mounted () {
      let experimentId = this.$route.params.experimentId
      rpc
        .rpcRun('getExperiment', experimentId)
        .then((res) => {
          let experiment = res.data.experiment
          let participants = experiment.participants
          _.each(participants, participant => {
            let state = participant.state
            if ('ranks' in state) {
              state.ranks = _.map(state.ranks, getFullUrl)
            }
          })
          console.log('>> Experiment.mounted', experiment)
          this.$data.experiment = experiment
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
        util.downloadObject('results.json', payload)
      },
      reformatDate(participant, key) {
        if (key in participant) {
          let date = participant[key]
          return new Date(date).toDateString()
        }
        return ''
      },
      getInviteRoute(participant) {
        return `/participant/${participant.participateId}`
      },
      deleteInvite(participant) {
        rpc
          .rpcRun('deleteParticipant', participant.participateId)
          .then((res) => {
            console.log('>> Experiment.deleteInvite', res.data)
            let participants = this.$data.experiment.participants
            util.removeItem(participants, participant, 'participateId')
          })
      },
      makeInvite () {
        let experimentId = this.$route.params.experimentId
        let participants = this.$data.experiment.participants
        rpc
          .rpcRun('inviteParticipant', experimentId, 'test@test.com')
          .then((res) => {
            console.log('>> Experiment.makeInvite', res.data)
            participants.push(res.data.participant)
          })
      }
    }
  }

</script>

