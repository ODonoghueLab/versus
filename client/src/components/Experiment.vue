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
        Download "results.csv"
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
              &nbsp;(<a
              @click="copyInviteRoute(participant)">
              copy
            </a>)
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

  import util from '../modules/util'
  import rpc from '../modules/rpc'

  // https://appendto.com/2017/04/use-javascript-to-export-your-data-as-csv/
  function downloadCSV (csv, filename) {
    filename = filename || 'export.csv'

    if (csv === null) {
      return
    }
    if (!csv.match(/^data:text\/csv/i)) {
      csv = 'data:text/csv;charset=utf-8,' + csv
    }
    let data = encodeURI(csv)

    let link = document.createElement('a')
    link.setAttribute('href', data)
    link.setAttribute('download', filename)
    link.click()
  }

  function makeResultCsv (experiment) {

    let isFoundHeader = false
    let imageSet = {}

    let headerRow = ['participantId', 'surveyCode']
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

      let row = [participant.participateId, participant.attr.surveyCode]

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

  /**
   * https://stackoverflow.com/a/30810322
   * @param text
   */
  function copyTextToClipboard (text) {
    let textArea = document.createElement('textarea')

    //
    // *** This styling is an extra step which is likely not required. ***
    //
    // Why is it here? To ensure:
    // 1. the element is able to have focus and selection.
    // 2. if element was to flash render it has minimal visual impact.
    // 3. less flakyness with selection and copying which **might** occur if
    //    the textarea element is not visible.
    //
    // The likelihood is the element won't even render, not even a flash,
    // so some of these are just precautions. However in IE the element
    // is visible whilst the popup box asking the user for permission for
    // the web page to copy to the clipboard.
    //

    // Place in top-left corner of screen regardless of scroll position.
    textArea.style.position = 'fixed'
    textArea.style.top = 0
    textArea.style.left = 0

    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    textArea.style.width = '2em'
    textArea.style.height = '2em'

    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0

    // Clean up any borders.
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'

    // Avoid flash of white box if rendered for any reason.
    textArea.style.background = 'transparent'

    textArea.value = text

    document.body.appendChild(textArea)

    textArea.select()

    try {
      let successful = document.execCommand('copy')
      let msg = successful ? 'successful' : 'unsuccessful'
      console.log('> copyTextToClipboard', msg)
    } catch (err) {
      console.log('> copyTextToClipboard failed')
    }

    document.body.removeChild(textArea)
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

      let experiment = res.data.experiment
      let urls = _.map(experiment.images, i => i.url)
      this.$data.experiment = experiment

      let imageSetIds = experiment.attr.imageSetIds
      this.$data.imageSetIds = imageSetIds
      console.log('> Experiment.mounted imageSetIds', imageSetIds)

      let images = {}
      for (let imageSetId of experiment.attr.imageSetIds) {
        let containsSetId = u => _.includes(u, imageSetId)
        images[imageSetId] = _.filter(urls, containsSetId)
      }
      console.log('> Experiment.mounted images', images)
      this.$data.images = images

      // calculate consistencies
      let participants = experiment.participants
      for (let participant of participants) {
        participant.consistency = 0
        participant.nComparisonDone = 0
        participant.nRepeatTotal = 0
        for (let state of _.values(participant.states)) {
          participant.nRepeatTotal += state.consistencies.length
          participant.consistency += _.sum(state.consistencies)
          participant.nComparisonDone += state.comparisons.length
        }
      }
      console.log('> Experiment.mounted participants', participants)
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
        downloadCSV(csv, 'results.csv')
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
        copyTextToClipboard(`${host}/participant/${participant.participateId}`)
      },
      deleteInvite (participant) {
        rpc
          .rpcRun('deleteParticipant', participant.participateId)
          .then((res) => {
            console.log('> Experiment.deleteInvite', res.data)
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
            console.log('> Experiment.makeInvite', res.data)
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

