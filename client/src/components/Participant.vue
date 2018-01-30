<template>
  <div style="text-align: left">

    <div style="padding: 1em" v-if="status === 'start'">

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

      <form v-on:submit.prevent="enterUser">
        <md-button
          @click="enterUser"
          class="md-raised md-primary"
          style="margin-left: 1em">
          Look at images
        </md-button>
      </form>

    </div>

    <div v-else-if="status === 'done'" class="done">

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

    <div v-else-if="status === 'running2afc'">
      <md-layout md-align="center" v-if="comparison">

        <md-progress style="height: 8px" :md-progress="progress"/>

        <md-layout md-align="center" md-flex="100">
          <h2 class="md-display-2"> {{experimentAttr.title}} </h2>
        </md-layout>

        <md-layout md-align="center" md-flex="100">
          <p> {{experimentAttr.blurb}}</p>
          <br>
        </md-layout>

        <md-layout v-if="imageA && imageB">
          <md-layout md-flex="50" md-align="end">

            <md-whiteframe md-elevation="5" style="margin-right: 1em">
              <div style="height: 12px;">
                <md-progress
                  v-if="loadingA"
                  md-indeterminate/>
              </div>
              <div id="img-a">
                <img :src="imageA"/>
              </div>
            </md-whiteframe>

            <div style="width: 100%; padding-top: 1em; text-align: center;">
              <md-button
                :disabled="loadingA || loadingB"
                class="md-raised choice"
                @click="choose2afc(comparison.itemA)">
                Choose
              </md-button>
            </div>

          </md-layout>

          <md-layout md-flex="50" md-align="start">
            <md-whiteframe md-elevation="5" style="margin-left: 0.7em">
              <div style="height: 12px">
                <md-progress
                  v-if="loadingB"
                  md-indeterminate/>
              </div>
              <div id="img-b">
                <img :src="imageB"/>
              </div>
            </md-whiteframe>
            <div style="width: 100%; padding-top: 1em; text-align: center;">
              <md-button
                :disabled="loadingA || loadingB"
                class="md-raised choice"
                @click="choose2afc(comparison.itemB)">
                Choose
              </md-button>
            </div>
          </md-layout>
        </md-layout>

        <div
          v-else
          style="
              width: 100%;
              margin-top: 2em;
              text-align: center">
          Loading images...
          <br>
          <md-spinner :md-size="80" md-indeterminate/>
        </div>

      </md-layout>
    </div>

    <div v-else-if="status === 'runningMultiple'">

      <md-layout md-align="center">

        <md-progress
          style="height: 8px"
          :md-progress="progress"/>

        <md-layout
          md-align="center"
          md-column
          md-flex="100"
          style="text-align: center">

          <h2 class="md-display-2">
            {{experimentAttr.title}}
          </h2>

          <p>
            {{experimentAttr.blurb}}
          </p>
        </md-layout>

        <md-layout md-flex="100" md-align="center">
            <img
              v-if="question"
              style="height: 250px; width: auto"
              :src="question.url"/>
        </md-layout>

        <br>

        <md-layout
          md-row
          v-for="(choice, i) in choices"
          :key="i">

          <md-layout md-align="end">

            <md-whiteframe
              md-elevation="5"
              style="margin-right: 1em">

              <div style="height: 12px;">
                <md-progress
                  v-if="choice.isClick"
                  md-indeterminate/>
              </div>

              <img v-if="choice" :src="choice.url"/>

            </md-whiteframe>

            <div
              style="
                width: 100%;
                padding-top: 1em;
                text-align: center;">

              <md-button
                :disabled="isChosen"
                class="md-raised choice"
                @click="chooseMultiple(choice)">
                Choose
              </md-button>

            </div>

          </md-layout>

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
        loadingA: true,
        loadingB: true,
        imageA: null,
        imageB: null,
        comparison: null,
        surveyCode: null,
        progress: 0,
        question: null,
        choices: [],
        imageSize: 0,
        isChosen: false,
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
        console.log('> Invite.handleRes', util.jstr(res.data))
        this.$data.status = res.data.status

        if (res.data.status === 'start') {
          console.log('> Invite.handleRes new')
          this.$data.experimentAttr = res.data.experimentAttr

        } else if (res.data.status === 'done') {
          console.log('> Invite.handleRes done')
          this.$data.surveyCode = res.data.surveyCode

        } else if (res.data.status === 'running2afc') {

          this.$data.experimentAttr = res.data.experimentAttr
          this.$data.progress = res.data.progress

          // clear screen, delay required for page to redraw
          this.$data.imageB = null
          this.$data.imageA = null
          await delay(200)

          let comparison = res.data.comparison

          let comparisonUrls = []
          comparisonUrls.push(config.apiUrl + comparison.itemA.url)
          comparisonUrls.push(config.apiUrl + comparison.itemB.url)
          preloadImages(comparisonUrls)

          preloadImages(_.map(res.data.urls, u => config.apiUrl + u))

          let imageUrlA = this.getImageUrl(comparison.itemA)
          let imageUrlB = this.getImageUrl(comparison.itemB)
          while (!areImagesLoaded(comparisonUrls)) {
            await delay(100)
          }

          this.$data.loadingA = false
          this.$data.loadingB = false
          this.$data.imageA = imageUrlA
          this.$data.imageB = imageUrlB
          this.$data.comparison = comparison
          console.log('> Invite.handleRes comparison', comparison)

        } else if (res.data.status === 'runningMultiple') {

          this.$data.experimentAttr = res.data.experimentAttr

          // clear screen, delay required for page to redraw
          this.$data.question = null
          this.$data.choices.length = 0
          this.$data.isChosen = false
          await delay(200)

          let urls = [config.apiUrl + res.data.question.url]
          for (let choice of res.data.choices) {
            urls.push(config.apiUrl + choice.url)
          }
          preloadImages(urls)

          this.$data.question = res.data.question
          this.$data.question.url = config.apiUrl + res.data.question.url
          for (let choice of res.data.choices) {
            let fullUrl = config.apiUrl + choice.url
            this.$data.choices.push({
              url: fullUrl,
              value: choice.value,
              isClick: false,
            })
          }

          this.$data.imageSize = 100 / this.$data.choices.length - 5
        }

      },

      async chooseMultiple(choice) {
        choice.isClick = true
        this.$data.isChosen = true
        this.$forceUpdate()
        let participateId = this.$route.params.participateId
        let params = [participateId, this.question, choice]
        let res = await rpc.rpcRun('publicChooseMultiple', ...params)
        return await this.handleRes(res)
      },

      async choose2afc (item) {
        if (this.$data.loadingA || this.$data.loadingB) {
          return
        }
        let participateId = this.$route.params.participateId
        if (item.value === this.$data.comparison.itemA.value) {
          this.$data.loadingA = true
        } else {
          this.$data.loadingB = true
        }
        if (this.$data.comparison.isRepeat) {
          this.$data.comparison.repeat = item.value
        } else {
          this.$data.comparison.choice = item.value
        }
        let params = [participateId, this.$data.comparison]
        let res = await rpc.rpcRun('publicChooseItem', ...params)
        return await this.handleRes(res)
      },

      getImageUrl (item) {
        return config.apiUrl + item.url
      },

      enterUser () {
        let participateId = this.$route.params.participateId
        let user = {}
        return rpc
          .rpcRun(
            'publicSaveParticipantUserDetails', participateId, user)
          .then(this.handleRes)
      },
    }
  }
</script>

