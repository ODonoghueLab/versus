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

      <div>
        <md-radio v-model="experiment.attr.questionType" id="my-test1" name="my-test-group1" md-value="2afc">2
          alternative forced choice
        </md-radio>
        <md-radio v-model="experiment.attr.questionType" id="my-test2" name="my-test-group1" md-value="multiple">
          multiple choice
        </md-radio>
      </div>

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
        Download "results.csv"
      </md-button>

      <md-table v-if="experiment.participants">

        <md-table-header>
          <md-table-row>
            <md-table-head>Invite</md-table-head>
            <md-table-head>SurveyCode</md-table-head>
            <md-table-head>Comparisons</md-table-head>
            <md-table-head>Time</md-table-head>
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
              &nbsp;<a
                @click="copyInviteRoute(participant)">
                copy
              </a>
            </md-table-cell>
            <md-table-cell>
              {{ participant.attr.surveyCode }}
            </md-table-cell>
            <md-table-cell>
              {{ participant.attr.nComparisonDone }}
            </md-table-cell>
            <md-table-cell>
              {{ participant.attr.time }}
            </md-table-cell>
            <md-table-cell>
              <span v-if="participant.attr.consistency">
                {{ participant.attr.consistency }}/{{ participant.attr.nRepeatTotal}}
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

      <div
        v-for="(imageSetId, index) in imageSetIds"
        :key="index"
        style="
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
      </div>

    </md-whiteframe>


  </div>
</template>


<script>
  import path from 'path'
  import config from '../config'
  import util from '../modules/util'
  import rpc from '../modules/rpc'

  function makeResultCsv (experiment) {

    let isFoundHeader = false
    let imageSet = {}

    let headerRow = ['participantId', 'surveyCode', 'time']
    let rows = []

    for (let participant of experiment.participants) {

      if (!isFoundHeader) {
        for (let [imageSetId, state] of _.toPairs(participant.states)) {
          imageSet[imageSetId] = {
            imageUrls: state.imageUrls,
            iImage: {}
          }
          headerRow = _.concat(headerRow, state.imageUrls)
          _.each(state.imageUrls, (url, i) => {
            imageSet[imageSetId].iImage[url] = i
          })
        }
        isFoundHeader = true
        console.log('> makeResultCsv header', headerRow)
      }

      let row = [
        participant.participateId,
        participant.attr.surveyCode,
        participant.time
      ]

      for (let [imageSetId, state] of _.toPairs(participant.states)) {
        let thisRow = util.makeArray(state.rankedImageUrls.length, '')
        if (!_.isUndefined(state.rankedImageUrls) && (state.rankedImageUrls.length > 0)) {
          _.each(state.rankedImageUrls, (url, iRank) => {
            thisRow[imageSet[imageSetId].iImage[url]] = iRank
          })
        }
        row = _.concat(row, thisRow)
      }

      console.log('> makeResultCsv row', row)

      rows.push(row)
    }

    headerRow = _.map(headerRow, h => path.basename(h))
    let result = headerRow.join(',') + '\n'
    for (let row of rows) {
      result += row.join(',') + '\n'
    }

    return result
  }

  export default {
    name: 'experiment',
    data () {
      return {
        experiment: {},
        images: {},
        imageSetIds: [],
      }
    },
    async mounted () {
      let experimentId = this.$route.params.experimentId

      let res = await rpc.rpcRun('getExperiment', experimentId)

      let experiment = res.result.experiment
      this.experiment = experiment

      console.log('> Experiment.mounted', util.jstr(experiment.attr))

      let imageSetIds = experiment.attr.imageSetIds
      this.$data.imageSetIds = imageSetIds

      let images = {}
      let urls = _.map(experiment.images, i => i.url)
      for (let imageSetId of experiment.attr.imageSetIds) {
        images[imageSetId] = _.filter(
          urls, url => util.extractId(url) === imageSetId)
      }
      console.log('> Experiment.mounted images', _.clone(images))
      this.$data.images = images
    },

    methods: {
      getFullUrl (url) {
        return config.apiUrl + url
      },
      getBaseUrl (url) {
        return path.basename(url)
      },
      downloadResults () {
        let csv = makeResultCsv(this.$data.experiment)
        util.downloadCSV(csv, 'results.csv')
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
      copyInviteRoute (participant) {
        let href = window.location.href
        let iLast = href.indexOf('#')
        let host = href.substring(0, iLast + 1)
        util.copyTextToClipboard(`${host}/participant/${participant.participateId}`)
      },
      deleteInvite (participant) {
        rpc
          .rpcRun('deleteParticipant', participant.participateId)
          .then((res) => {
            console.log('> Experiment.deleteInvite', res)
            if (!res.error) {
              let participants = this.$data.experiment.participants
              util.removeItem(participants, participant, 'participateId')
            }
          })
      },
      makeInvite () {
        let experimentId = this.$route.params.experimentId
        let participants = this.$data.experiment.participants
        rpc
          .rpcRun('publicInviteParticipant', experimentId, 'test@test.com')
          .then((res) => {
            console.log('> Experiment.makeInvite', res)
            participants.push(res.result.participant)
          })
      },
      saveExperimentAttr () {
        let experiment = this.$data.experiment
        rpc
          .rpcRun('saveExperimentAttr', experiment.id, experiment.attr)
      },
      getMturkLink () {
        return `./#/mechanical-turk/${this.$data.experiment.id}`
      }
    }
  }

</script>

