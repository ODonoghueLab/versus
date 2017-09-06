<template>
  <div style="padding-left: 1em; padding-right: 1em;">

    <h2 class="md-display-2">
      Experiment:
      <span v-if="experiment.attr">
        {{experiment.attr.name}}
      </span>
    </h2>

    <md-whiteframe v-if="experiment.attr" style="padding: 1em; margin-bottom: 1em">
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

    <md-whiteframe style="padding: 1em; margin-bottom: 1em">

      <h3 class="md-title">Participants</h3>

      <md-button class="md-raised" @click="makeInvite">
        Invite participant
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
              {{ participant.state.surveyCode }}
            </md-table-cell>
            <md-table-cell>
              {{ participant.state.comparisons.length }}
            </md-table-cell>
            <md-table-cell>
              <span v-if="participant.consistency">
                {{ participant.consistency }}/{{ participant.state.repeatComparisonIndices.length}}
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

    <md-whiteframe style="padding: 1em; margin-bottom: 1em">
      <h3 class="md-title">Participant rankings</h3>
      <md-layout md-row>
        <md-card
            style="
            padding: 1em;
            margin-right: 1em;
            box-sizing: content-box;
            width: 220px;
            height: 220px;">
          <md-card-media
              style="
              height: 200px;">
            <canvas id="chart-canvas"></canvas>
          </md-card-media>
        </md-card>
        <md-card
            style="
            padding: 1em;
            box-sizing: content-box;
            width: 220px;
            height: 220px;">
          <md-card-media
              style="
              height: 200px;">
            <canvas id="chart-canvas2"></canvas>
          </md-card-media>
        </md-card>
      </md-layout>
    </md-whiteframe>

    <md-whiteframe style="padding: 1em; margin-bottom: 1em">
      <h3 class="md-title">Image Order (Drag & Sort)</h3>
      <md-layout>
        <draggable
            v-model="baseRanks"
            @end="saveExperimentAttr">
          <md-card
              v-for="(url, index) in baseRanks"
              :key="index"
              style="
              text-align: center;
              padding: 0.5em;
              width: 100%">
            <md-layout md-row md-align="start" md-vertical-align="center">
              <md-button
                  class="md-icon-button md-raised">
                <md-icon>swap_vert</md-icon>
              </md-button>
              <md-layout style="flex: 1">
                <md-card-header style="text-align: left">
                  <p class="body">
                    {{ index + 1 }} -- {{ getBaseUrl(url) }}
                  </p>
                </md-card-header>
              </md-layout>
              <md-whiteframe>
                <img style="height: 100px" :src="getFullUrl(url)"></img>
              </md-whiteframe>
            </md-layout>
          </md-card>
        </draggable>
      </md-layout>
    </md-whiteframe>

  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
</style>

<script>
  import path from 'path'

  import $ from 'jquery'
  import draggable from 'vuedraggable'

  import config from '../config'

  import auth from '../modules/auth'
  import util from '../modules/util'
  import rpc from '../modules/rpc'
  import chartdata from '../modules/chartdata.js'


  function getPartcipantImageOrderDatasets (experiment) {
    let dataSets = []

    let baseOrder = {}
    for (let [i, url] of experiment.attr.baseRanks.entries()) {
      let key = path.basename(url)
      baseOrder[key] = i + 1
    }

    for (let participant of experiment.participants) {
      let state = participant.state

      if ('ranks' in state) {
        let participantOrder = {}
        for (let [i, url] of state.ranks.entries()) {
          let key = path.basename(url)
          participantOrder[key] = i + 1
        }

        console.log('> Experiment.getPartcipantImageOrderDatasets data', baseOrder, participantOrder)

        let xVals = []
        let yVals = []
        for (let key of _.keys(baseOrder)) {
          xVals.push(baseOrder[key])
          yVals.push(participantOrder[key])
        }

        chartdata.addDataset(
          dataSets,
          participant.participateId,
          xVals,
          yVals)
      }
    }

    return dataSets
  }

  function getPartcipantImageWeightDatasets (experiment) {
    let dataSets = []

    for (let participant of experiment.participants) {
      let state = participant.state

      let fractions = state.fractions
      console.log('> Experiment.getPartcipantImageWeightDatasets', state.ranks, fractions)

      if ('ranks' in state) {
        let participantOrder = {}
        let participantWeight = {}
        for (let [i, url] of state.ranks.entries()) {
          let key = path.basename(url)
          participantOrder[key] = i + 1
          participantWeight[key] = fractions[i]
        }

        let xVals = []
        let yVals = []
        for (let key of _.keys(participantWeight)) {
          xVals.push(participantWeight[key])
          yVals.push(participantOrder[key])
        }

        chartdata.addDataset(
          dataSets,
          participant.participateId,
          xVals,
          yVals)
      }
    }

    return dataSets
  }
  export default {
    name: 'experiment',
    data () {
      return {
        experiment: {},
        baseRanks: [],
      }
    },
    components: {draggable},
    mounted () {
      let experimentId = this.$route.params.experimentId
      rpc
        .rpcRun('getExperiment', experimentId)
        .then((res) => {
          let experiment = res.data.experiment

          if (!('baseRanks' in experiment.attr)) {
            experiment.attr.baseRanks = _.map(
              experiment.Images,
              image => image.url
            )
          }

          let participants = experiment.participants
          for (let participant of participants) {
            let state = participant.state
            participant.bestImageKey = path.basename(state.ranks[0])
            if (participant.state.consistencies.length > 0) {
              let c = participant.state.consistencies
              participant.consistency = _.sum(c)
            }
          }

          this.$data.experiment = experiment

          this.$data.baseRanks = experiment.attr.baseRanks

          this.chartData = chartdata.makeLineChartData('image order', 'perceived rank')
          this.chartData.data.datasets = getPartcipantImageOrderDatasets(experiment)
          let canvas = $.find('#chart-canvas')
          this.chart = new Chart(canvas[0], this.chartData)

          this.chartData2 = chartdata.makeLineChartData('fraction votes', 'perceived rank')
          this.chartData2.data.datasets = getPartcipantImageWeightDatasets(experiment)
          canvas = $.find('#chart-canvas2')
          this.chart2 = new Chart(canvas[0], this.chartData2)
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
          .rpcRun('inviteParticipant', experimentId, 'test@test.com')
          .then((res) => {
            console.log('>> Experiment.makeInvite', res.data)
            participants.push(res.data.participant)
          })
      },
      saveExperimentAttr () {
        let experiment = this.$data.experiment
        experiment.attr.baseRanks = this.$data.baseRanks
        rpc
          .rpcRun('saveExperimentAttr', experiment.id, experiment.attr)
          .then((res) => {
            console.log('>> Experiment.saveExperimentAttr.res', res.data)
            let newDatasets = getPartcipantImageOrderDatasets(experiment)
            let datasets = this.chartData.data.datasets
            for (let i = 0; i < newDatasets.length; i += 1) {
              datasets[i].data = newDatasets[i].data
              this.chart.update()
            }
            {
              let newDatasets = getPartcipantImageWeightDatasets(experiment)
              let datasets = this.chartData2.data.datasets
              for (let i = 0; i < newDatasets.length; i += 1) {
                datasets[i].data = newDatasets[i].data
                this.chart2.update()
              }
            }
          })
      },
    }
  }

</script>

