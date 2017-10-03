<template>
  <div
    style="
      padding-left: 1em;
      padding-right: 1em;">


    <h2 class="md-display-2">

      Experiment:
      <span v-if="experiment.attr">
        {{experiment.attr.name}}
      </span>

    </h2>


    <md-whiteframe
      v-if="experiment.attr"
      style="
        padding: 1em;
        margin-bottom: 1em">

      <h3 class="md-title">
        Question
      </h3>

      <md-input-container>
        <label>Title</label>
        <md-input v-model="experiment.attr.title">
        </md-input>
      </md-input-container>

      <md-input-container>
        <label>Blurb</label>
        <md-textarea
            v-model="experiment.attr.blurb">

        </md-textarea>
      </md-input-container>

      <md-button
          class="md-raised"
          @click="saveExperimentAttr">
        Update Question
      </md-button>

    </md-whiteframe>


    <md-whiteframe
      style="
        padding: 1em;
        margin-bottom: 1em">

      <h3 class="md-title">Participants</h3>

      Mechanical Turk Survey Link:
      <a :href="getMturkLink()">{{getMturkLink()}}</a>
      <br>
      <br>

      <md-button class="md-raised" @click="makeInvite">
        Invite participant
      </md-button>

      <md-button class="md-raised" @click="downloadResults()">
        Download Results
      </md-button>

      <md-table v-if="experiment.participants">

        <md-table-header>
          <md-table-row>
            <md-table-head>Invite</md-table-head>
            <md-table-head>SurveyCode</md-table-head>
            <md-table-head>Comparisons</md-table-head>
            <md-table-head>Consistency</md-table-head>
            <md-table-head>Created</md-table-head>
            <md-table-head>Updated</md-table-head>
          </md-table-row>
        </md-table-header>

        <md-table-body>
          <md-table-row
              v-for="(participant, index) in experiment.participants"
              :key="index">
            <md-table-cell>
              <router-link
                  class="button"
                  v-bind:to="getInviteRoute(participant)">
                link
              </router-link>
            </md-table-cell>
            <md-table-cell>
              {{ participant.attr.surveyCode }}
            </md-table-cell>
            <md-table-cell>
              {{ participant.nComparisonDone }}
            </md-table-cell>
            <md-table-cell>
              <span v-if="participant.consistency">
                {{ participant.consistency }}/{{ participant.nRepeatTotal}}
              </span>
            </md-table-cell>
            <md-table-cell>
              {{reformatDate(participant, 'createdAt')}}
            </md-table-cell>
            <md-table-cell>
              {{reformatDate(participant, 'updatedAt')}}
            </md-table-cell>
            <md-table-cell>
              <md-button
                  class="md-icon-button md-raised"
                  @click="deleteInvite(participant)">
                <md-icon>delete</md-icon>
              </md-button>
            </md-table-cell>
          </md-table-row>
        </md-table-body>

      </md-table>

    </md-whiteframe>


    <md-whiteframe
      style="
        padding: 1em;
        margin-bottom: 1em">

      <h2 class="md-title">Images</h2>

      <md-whiteframe
          v-for="(imageSetId, index) in imageSetIds"
          :key="index"
          style="
            padding: 0.5em;
            margin-top: 0.5em;">
        <h2 class="md-subheading">{{imageSetId}}</h2>
        <md-layout
            style="padding-top: 0.5em">
          <md-card
              v-for="(url, index2) in images[imageSetId]"
              :key="index2"
              style="
                margin-right: 0.5em;
                margin-bottom: 0.5em;">
            <md-card-media>
              <img style="width: 150px" :src="getFullUrl(url)">
            </md-card-media>
            <md-card-content style="text-align: left">
              {{ index2 + 1 }}: {{ getBaseUrl(url) }}
            </md-card-content>
          </md-card>
        </md-layout>
      </md-whiteframe>

    </md-whiteframe>


  </div>
</template>


<script>

  import path from 'path'

  import config from '../config'
  import auth from '../modules/auth'
  import util from '../modules/util'
  import rpc from '../modules/rpc'

  export default {
    name: 'experiment',
    data () {
      return {
        experiment: {},
        images: {},
        imageSetIds: [],
      }
    },
    mounted () {
      let experimentId = this.$route.params.experimentId
      rpc
        .rpcRun('getExperiment', experimentId)
        .then((res) => {
          let experiment = res.data.experiment
          let urls = _.map(experiment.Images, i => i.url)

          let images = {}
          let imageSetIds = experiment.attr.imageSetIds
          this.$data.imageSetIds = imageSetIds

          console.log('> Experiment.mounted imageSetIds', imageSetIds)
          for (let imageSetId of experiment.attr.imageSetIds) {
            images[imageSetId] = _.filter(
              urls, u => _.includes(u, imageSetId))
          }
          console.log('> Experiment.mounted images', images)

          let participants = experiment.participants
          for (let participant of participants) {
            participant.consistency = 0
            participant.nComparisonDone = 0
            participant.nRepeatTotal = 0
            for (let state of _.values(participant.states)) {
//              console.log('> Experiment.init state', util.jstr(state))
              participant.nRepeatTotal += state.consistencies.length
              participant.consistency += _.sum(state.consistencies)
              participant.nComparisonDone += state.comparisons.length
            }
          }
          console.log('> Experiment.mounted participants', participants)

          this.$data.experiment = experiment

          this.$data.images = images

        })

    },

    methods: {
      getFullUrl (url) {
        return config.apiUrl + url
      },
      getBaseUrl (url) {
        return path.basename(url)
      },
      downloadResults () {
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
      reformatDate (participant, key) {
        if (key in participant) {
          let date = participant[key]
          return new Date(date).toDateString()
        }
        return ''
      },
      getInviteRoute (participant) {
        return `/participant/${participant.participateId}`
      },
      deleteInvite (participant) {
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
          .rpcRun('publicInviteParticipant', experimentId, 'test@test.com')
          .then((res) => {
            console.log('>> Experiment.makeInvite', res.data)
            participants.push(res.data.participant)
          })
      },
      saveExperimentAttr () {
        let experiment = this.$data.experiment
        rpc
          .rpcRun('saveExperimentAttr', experiment.id, experiment.attr)
          .then((res) => {
          })
      },
      getMturkLink () {
        return `./#/mechanical-turk/${this.$data.experiment.id}`
      }
    }
  }

</script>

