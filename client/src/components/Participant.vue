<template>
  <div>

    <div
      v-if="status === 'qualificationStart'"
      style="padding: 1em">

      <h2 class="md-display-1">
        {{ experimentAttr.text.sections.qualificationStart.header }}
      </h2>

      <p>
        {{ experimentAttr.text.sections.qualificationStart.blurb }}
      </p>

      <form
        v-on:submit.prevent="startSurvey">
        <md-button
          @click="startQualification"
          class="md-raised md-primary"
          style="margin-left: 1em">
          Begin
        </md-button>
      </form>

    </div>

    <div
      v-if="status === 'start'"
      style="padding: 1em">

      <h2 class="md-display-1">
        {{ experimentAttr.text.sections.start.header }}
      </h2>

      <p>
        {{ experimentAttr.text.sections.start.blurb }}
      </p>

      <form
        v-on:submit.prevent="startSurvey">
        <md-button
            @click="startSurvey"
            class="md-raised md-primary"
            style="margin-left: 1em">
          Begin
        </md-button>
      </form>

    </div>

    <div
      v-else-if="status === 'done'"
      class="done">

      <md-layout
        style="padding: 1em"
        class="md-display-1 done"
        md-align="center"
        md-column
        md-vertical-align="center">

        <h2 class="md-display-2">
          {{ experimentAttr.text.sections.done.header }}
        </h2>

        <p>
          {{ experimentAttr.text.sections.done.blurb }}
        </p>

        <md-whiteframe
          style="padding: 0.5em">
          {{surveyCode}}
        </md-whiteframe>

      </md-layout>

    </div>

    <div
      v-else-if="status === 'qualificationFailed'"
      class="done">

      <md-layout
        style="padding: 1em"
        class="md-display-1 done"
        md-align="center"
        md-column
        md-vertical-align="center">

        <h2 class="md-display-2">
          {{ experimentAttr.text.sections.qualificationFailed.header }}
        </h2>

        <p>
          {{ experimentAttr.text.sections.qualificationFailed.blurb }}
        </p>

      </md-layout>

    </div>

    <div
      v-else-if="(status === 'running') || (status === 'qualifying')">

      <md-progress
        style="height: 8px"
        :md-progress="progress"/>

      <md-layout
        md-align="center"
        style="padding: 1em">

        <h2
          class="md-display-1"
          style="text-align: center">
          {{experimentAttr.text.sections.running.header}}
        </h2>

        <div
          style="width: 100%; text-align: center; margin-bottom: 1em">
          {{experimentAttr.text.sections.running.blurb}}
        </div>

        <div
          v-if="isLoading">
          <md-spinner
            style="margin-top: 3em"
            :md-size="150"
            md-indeterminate/>
          <div style="text-align: center">
            Loading...
          </div>
        </div>

        <md-layout
          v-if="question"
          md-align="center"
          md-flex="100">
          {{ question.imageSetId }}
          <span v-if="question.isRepeat">
            &nbsp; - repeat
          </span>
        </md-layout>

        <md-layout
          v-if="!isLoading && question"
          md-align="center"
          md-flex="100">
          <img
            style="height: 300px"
            :src="question.fullUrl"/>
        </md-layout>

        <md-layout
          v-if="!isLoading"
          v-for="(choice, i) of choices"
          :key="i"
          md-align="center">

          <md-whiteframe
            md-elevation="5"
            style="
              margin-left: 1em;
              margin-right: 1em">

            <div style="height: 12px;">
              <md-progress
                v-if="choice.isClick"
                md-indeterminate/>
            </div>

            <div id="img-a">
              <img :src="choice.fullUrl"/>
            </div>

          </md-whiteframe>

          <div
            style="
              width: 100%;
              padding-top: 1em;
              text-align: center;">
            <md-button
              :disabled="isChosen"
              class="md-raised choice"
              @click="choose(choice)">
              Choose
            </md-button>
          </div>

        </md-layout>

      </md-layout>

    </div>

  </div>

</template>

<style>
  @import 'https://fonts.googleapis.com/css?family=Lato:300';
</style>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
  .done {
    width: 100vw;
    height: 100vh;
    margin-left: -14px;
    background-image: linear-gradient(35deg, #FF5F6D -10%, #FFC371);
    color: white;
    text-transform: uppercase;
    font-weight: lighter;
    text-align: center;
  }
  .done h1, .done h2, .done h3, .done h4, .done h5 {
    color: white
  }
</style>

<script>
import _ from 'lodash'
import config from '../config'
import rpc from '../modules/rpc'
import util from '../modules/util'

function delay (timeMs) {
  return new Promise(resolve => { setTimeout(resolve, timeMs) })
}

let loadedImages = {}

function preloadImages (urls) {
  for (let url of urls) {
    if (!(url in loadedImages)) {
      let img = new Image()
      img.src = url
      loadedImages[url] = img
      console.log('> Particpant.preloadImage', img.src)
    }
  }
}

function areImagesLoaded (urls) {
  for (let url of urls) {
    if (url in loadedImages) {
      let image = loadedImages[url]
      let isLoaded = image.complete && image.naturalHeight !== 0
      if (!isLoaded) {
        return false
      }
    } else {
      console.log(`> isImagesLoaded warning: ${url} not found in ${_.keys(loadedImages)}`)
      return false
    }
  }
  return true
}

export default {

  name: 'invite',

  data () {
    return {
      status: null,
      surveyCode: null,
      progress: 0,
      question: null,
      choices: [],
      isChosen: false,
      isLoading: true,
      experimentAttr: {}
    }
  },

  mounted () {
    let participateId = this.$route.params.participateId
    rpc
      .rpcRun('publicGetNextChoice', participateId)
      .then(this.handleResponse)
  },

  methods: {

    async handleResponse (response) {
      let result = response.result
      console.log(`> Participant.handleResponse status=${result.status}`, result)
      this.status = result.status
      this.experimentAttr = result.experimentAttr

      if (this.status === 'start') {
      } else if (this.status === 'done') {
        this.surveyCode = result.surveyCode
      } else if (_.includes(['running', 'qualifying'], this.status)) {
        this.experimentAttr = result.experimentAttr
        this.progress = result.progress
        this.method = result.method

        // clear screen, delay required for page to redraw
        this.question = null
        this.choices.length = 0
        this.isChosen = false
        this.isLoading = true

        await delay(200)

        let waitToLoadUrls = []
        if (result.question) {
          result.question.fullUrl = config.apiUrl + result.question.url
          waitToLoadUrls.push(config.apiUrl + result.question.url)
        }
        for (let choice of result.choices) {
          choice.fullUrl = config.apiUrl + choice.url
          choice.isClick = false
          waitToLoadUrls.push(choice.fullUrl)
        }

        preloadImages(waitToLoadUrls)
        while (!areImagesLoaded(waitToLoadUrls)) {
          await delay(100)
        }

        this.isLoading = false
        this.choices = _.shuffle(result.choices)
        if (result.question) {
          this.question = result.question
        }

        let repeat = false
        if (this.choices[0].isRepeat) {
          repeat = this.choices[0].isRepeat
        } else if (this.choices[0].comparison) {
          repeat = this.choices[0].comparison.isRepeat
        }

        if (result.urls) {
          preloadImages(_.map(result.urls, u => config.apiUrl + u))
        }

        let setId = util.extractId(waitToLoadUrls[0])
        console.log(
          `> Invite.handleResponse running setid=${setId}, repeat=${repeat} `)
      }
    },

    async choose (choice) {
      choice.isClick = true
      this.isChosen = true
      this.$forceUpdate()
      let participateId = this.$route.params.participateId
      let method = this.method
      let response = await rpc.rpcRun(method, participateId, choice)
      return this.handleResponse(response)
    },

    startSurvey () {
      let participateId = this.$route.params.participateId
      return rpc
        .rpcRun('publicSaveParticipantUserDetails', participateId, {isQualified: true})
        .then(this.handleResponse)
    },

    startQualification () {
      let participateId = this.$route.params.participateId
      return rpc
        .rpcRun('publicSaveParticipantUserDetails', participateId, {isQualified: false})
        .then(this.handleResponse)
    }
  }
}
</script>
