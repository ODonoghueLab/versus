<template>
  <div>

    <div
      style="padding: 1em"
      v-if="status === 'start'">

      <h2 class="md-display-2">
        Welcome to Versus!
      </h2>

      <p>
        You have been invited to participate in an experiment on Versus.
        <br>
        You will be asked at most {{experimentAttr.maxTreeComparison}} questions,
        of which {{experimentAttr.nRepeat}} will be randomly repeated.
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
          class="md-display-2 done"
          md-align="center"
          md-column
          md-vertical-align="center">

        Your tests are done
        <br>
        Thank you
        <br>
        Your survey code is
        <br>

        <md-whiteframe
          style="padding: 0.5em">
          {{surveyCode}}
        </md-whiteframe>

      </md-layout>

    </div>

    <div
        v-else-if=" status === 'running'">

      <md-layout md-align="center">

        <md-progress
            style="height: 8px"
            :md-progress="progress"/>

        <md-layout
            md-align="center"
            md-flex="100">
          <h2 class="md-display-2">
            {{experimentAttr.title}}
          </h2>
        </md-layout>

        <md-layout
            md-align="center"
            md-flex="100">
          <p> {{experimentAttr.blurb}}</p>
          <br>
        </md-layout>

        <md-layout
            v-if="question"
            md-align="center"
            md-flex="100">
          <img
              style="height: 300px"
              :src="question.fullUrl"/>
        </md-layout>

        <md-layout
            v-for="(choice, i) of choices"
            :key="i"
            md-align="center">

          <md-whiteframe
            md-elevation="5"
            style="margin-right: 1em">

            <div style="height: 12px;">
              <md-progress
                v-if="choice.isClick"
                md-indeterminate/>
            </div>

            <div id="img-a">
              <img :src="choice.fullUrl"/>
            </div>

          </md-whiteframe>

          <div style="
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
</style>

<script>
import _ from 'lodash'
import config from '../config'
import rpc from '../modules/rpc'

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
      console.log('> Participant.handleResponse', result)
      this.status = result.status

      if (this.status === 'start') {
        this.experimentAttr = result.experimentAttr
      } else if (this.status === 'done') {
        this.surveyCode = result.surveyCode
      } else if (this.status === 'running') {
        this.experimentAttr = result.experimentAttr
        this.progress = result.progress
        this.method = result.method

        // clear screen, delay required for page to redraw
        this.question = null
        this.choices.length = 0
        this.isChosen = false
        await delay(200)

        this.isLoading = true

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
        if (result.urls) {
          preloadImages(_.map(result.urls, u => config.apiUrl + u))
        }
        while (!areImagesLoaded(waitToLoadUrls)) {
          await delay(100)
        }

        this.isLoading = false
        this.choices = result.choices
        if (result.question) {
          this.question = result.question
        }

        let repeat = false
        if (this.choices[0].isRepeat) {
          repeat = this.choices[0].isRepeat
        } else if (this.choices[0].comparison) {
          repeat = this.choices[0].comparison.isRepeat
        }
        console.log(
          `> Invite.handleResponse`,
          `status:${this.status}, repeat: ${repeat}`,
          _.cloneDeep(result))
      }
    },

    async choose (choice) {
      choice.isClick = true
      this.isChosen = true
      this.$forceUpdate()
      let participateId = this.$route.params.participateId
      let response = await rpc.rpcRun(
        this.method, participateId, choice)
      return this.handleResponse(response)
    },

    startSurvey () {
      let participateId = this.$route.params.participateId
      return rpc
        .rpcRun('publicSaveParticipantUserDetails', participateId, {})
        .then(this.handleResponse)
    }
  }
}
</script>
