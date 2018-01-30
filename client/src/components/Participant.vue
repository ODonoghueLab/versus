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
        Experiments on Versus are easy.
      </p>

      <p>
        You will be ranking {{experimentAttr.nImage}} images,
        with at most {{experimentAttr.maxTreeComparison}} image comparisons,
        of which {{experimentAttr.nRepeat}} will be repeated in a
        random order.
      </p>

      <p>
        For each comparison, all you need to do
        is view the two images and click on the one you believe is better.
      </p>

      <form
          v-on:submit.prevent="startSurvey">
        <md-button
            @click="startSurvey"
            class="md-raised md-primary"
            style="margin-left: 1em">
          Look at images
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
        v-else-if="
          status === 'running2afc' ||
          status === 'runningMultiple'">

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
        let img = new Image
        let src = url
        img.src = url
        loadedImages[src] = img
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
        experimentAttr: {},
      }
    },

    mounted () {
      let participateId = this.$route.params.participateId
      rpc
        .rpcRun('publicGetNextChoice', participateId)
        .then(this.handleRes)
    },

    methods: {

      async handleRes (res) {

        this.status = res.data.status
        console.log('> Invite.handleRes status:', this.status)

        if (this.status === 'start') {
          this.experimentAttr = res.data.experimentAttr

        } else if (this.status === 'done') {
          this.surveyCode = res.data.surveyCode

        } else if (this.status === 'running2afc') {

          this.experimentAttr = res.data.experimentAttr
          this.progress = res.data.progress

          // clear screen, delay required for page to redraw
          this.question = null
          this.choices.length = 0
          this.isChosen = false
          await delay(200)

          this.isLoading = true
          let comparison = res.data.comparison
          this.comparison = comparison
          let comparisonUrls = []
          let choices = []
          for (let item of [comparison.itemA, comparison.itemB]) {
            let fullUrl = config.apiUrl + item.url
            choices.push({
              fullUrl,
              isClick: false,
              item
            })
            comparisonUrls.push(fullUrl)
          }

          preloadImages(comparisonUrls)
          preloadImages(_.map(res.data.urls, u => config.apiUrl + u))

          while (!areImagesLoaded(comparisonUrls)) {
            await delay(100)
          }

          this.isLoading = false
          this.choices = choices

        } else if (this.status === 'runningMultiple') {

          this.experimentAttr = res.data.experimentAttr

          // clear screen, delay required for page to redraw
          this.question = null
          this.choices.length = 0
          this.isChosen = false
          await delay(200)

          this.isLoading = true

          for (let choice of res.data.choices) {
            choice.fullUrl = config.apiUrl + choice.url
            choice.isClick = false
          }

          res.data.question.fullUrl = config.apiUrl + res.data.question.url

          let fullUrls = [config.apiUrl + res.data.question.url]
          for (let choice of res.data.choices) {
            choice.fullUrl = config.apiUrl + choice.url
            fullUrls.push(choice.fullUrl)
          }
          preloadImages(fullUrls)

          while (!areImagesLoaded(fullUrls)) {
            await delay(100)
          }

          this.isLoading = false
          this.question = res.data.question
          this.choices = res.data.choices
        }

      },

      async choose (choice) {

        choice.isClick = true
        this.isChosen = true
        this.$forceUpdate()

        let participateId = this.$route.params.participateId

        let res
        let questionType = this.experimentAttr.questionType
        if (questionType === '2afc') {
          if (this.comparison.isRepeat) {
            this.comparison.repeat = choice.item.value
          } else {
            this.comparison.choice = choice.item.value
          }
          res = await rpc.rpcRun(
            'publicChoose2afc', participateId, this.comparison)
        } else if (questionType === 'multiple') {
          res = await rpc.rpcRun(
            'publicChooseMultiple', participateId, this.question, choice)
        }

        return await this.handleRes(res)
      },

      startSurvey () {
        let participateId = this.$route.params.participateId
        return rpc
          .rpcRun('publicSaveParticipantUserDetails', participateId, {})
          .then(this.handleRes)
      },
    }
  }
</script>

