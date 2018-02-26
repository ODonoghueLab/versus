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
        <md-input v-model="experiment.attr.title"/>
      </md-input-container>

      <md-input-container>
        <label>Blurb</label>
        <md-textarea v-model="experiment.attr.blurb"/>
      </md-input-container>

      <div>
        <md-radio
          v-model="experiment.attr.questionType"
          id="my-test1"
          name="my-test-group1"
          md-value="2afc">
          2 alternative forced choice
        </md-radio>
        <md-radio
          v-model="experiment.attr.questionType"
          id="my-test2"
          name="my-test-group1"
          md-value="multiple">
          multiple choice
        </md-radio>
      </div>

      <md-input-container style="width: 130px">
        <label>Probability of Repeat</label>
        <md-input
          type="number"
          v-model="experiment.attr.probRepeat"/>
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
        Download "results.csv"
      </md-button>

      <md-table v-if="experiment.participants">

        <md-table-header>
          <md-table-row>
            <md-table-head>Invite</md-table-head>
            <md-table-head>Code</md-table-head>
            <md-table-head>Answers</md-table-head>
            <md-table-head>Time (s)</md-table-head>
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
              {{ participant.attr.nAnswer }}
            </md-table-cell>
            <md-table-cell>
              <span v-if="participant.attr.time">
                {{ participant.attr.time.toFixed(1) }}
              </span>
            </md-table-cell>
            <md-table-cell>
              <span v-if="participant.attr.nConsistentAnswer">
                {{ participant.attr.nConsistentAnswer }}/{{ participant.attr.nRepeatAnswer}}
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
import _ from 'lodash'
import config from '../config'
import util from '../modules/util'
import rpc from '../modules/rpc'

export default {
  name: 'experiment',
  data () {
    return {
      experiment: {},
      images: {},
      imageSetIds: []
    }
  },
  async mounted () {
    let experimentId = this.$route.params.experimentId

    let response = await rpc.rpcRun('getExperiment', experimentId)

    let experiment = response.result.experiment
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
    async downloadResults () {
      await rpc.rpcDownload('downloadResults', this.$route.params.experimentId)
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
        .then((response) => {
          console.log('> Experiment.deleteInvite', response)
          if (!response.error) {
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
        .then((response) => {
          console.log('> Experiment.makeInvite', response)
          participants.push(response.result.participant)
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
