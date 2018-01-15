<template>
  <div style="text-align: left">

    <div style="padding: 1em" v-if="status === 'start'">
      <h2 class="md-display-2">
        Welcome to Versus!
      </h2>
      <p>
        You have been invited to participate in an experiment on Versus. Experiments on Versus are easy.
      </p>
      <p>
        You will be ranking {{experiment.nImage}} images,
        with at most {{experiment.maxComparisons}} image comparisons, of which
        {{experiment.nRepeat}} will be repeated in a
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
          {{ surveyCode }}
        </md-whiteframe>
      </md-layout>
    </div>

    <div v-else-if="status === 'running'">
      <md-layout md-align="center" v-if="comparison">

        <md-progress :md-progress="progressPercent"/>


        <md-layout md-align="center" md-flex="100">
          <h2 class="md-display-2"> {{heading.title}} </h2>
        </md-layout>

        <md-layout md-align="center" md-flex="100">
          <p> {{heading.blurb}}</p>
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
                @click="choose(comparison.itemA)">
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
                @click="choose(comparison.itemB)">
                Choose
              </md-button>
            </div>
          </md-layout>
        </md-layout>

        <div v-else style="width: 100%; margin-top: 2em; text-align: center">
          Loading images...
          <br>
          <md-spinner :md-size="80" md-indeterminate/>
        </div>

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

  function preloadImage (url) {
    if (!(url in loadedImages)) {
      let img = new Image
      let src = config.apiUrl + url
      img.src = src
      loadedImages[src] = img
      console.log('> Particpant.preloadImage', img.src)
    }
  }

  function isImgLoaded (url) {
    if (url in loadedImages) {
      let image = loadedImages[url]
      return image.complete && image.naturalHeight !== 0
    } else {
      console.log('isImgLoaded not found', url, _.keys(loadedImages))
      return false
    }
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
        experiment: null,
        comparison: null,
        surveyCode: null,
        progress: {},
        heading: {},
      }
    },
    mounted () {
      let participateId = this.$route.params.participateId
      rpc
        .rpcRun('publicGetParticipant', participateId)
        .then(this.handleRes)
    },
    computed: {
      progressPercent () {
        let params = this.heading.params
        let maxComparison = params.maxComparisons + params.nRepeat
        return this.progress.nComparison / maxComparison * 100
      }
    },
    methods: {
      async handleRes (res) {
        console.log('> Invite.handleRes', util.jstr(res.data))
        this.$data.status = ''

        if (res.data.new) {
          console.log('> Invite.handleRes new')
          this.$data.status = 'start'
          this.$data.experiment = res.data.params

        } else if (res.data.done) {
          console.log('> Invite.handleRes done')
          this.$data.status = 'done'
          this.$data.surveyCode = res.data.surveyCode

        } else if (res.data.comparison) {

          this.$data.status = 'running'
          this.$data.heading = res.data.heading
          this.$data.progress = res.data.progress

          // clear screen
          this.$data.imageB = null
          this.$data.imageA = null
          // allow screen to clear
          await delay(200)

          let oldComparison = this.$data.comparison
          let newComparison = res.data.comparison

          if (oldComparison) {
            // swap to match existing choices on screen
            if ((newComparison.itemA.value === oldComparison.itemB.value)
              | (newComparison.itemB.value === oldComparison.itemA.value)) {
              let dummy = newComparison.itemA
              newComparison.itemA = newComparison.itemB
              newComparison.itemB = dummy
            }
          }
          this.$data.comparison = newComparison
          console.log('> Invite.handleRes comparison', newComparison)

          preloadImage(newComparison.itemA.url)
          preloadImage(newComparison.itemB.url)

          _.map(res.data.urls, preloadImage)

          let imageUrlA = this.getImageUrl(newComparison.itemA)
          let imageUrlB = this.getImageUrl(newComparison.itemB)

          while (!isImgLoaded(imageUrlA)
          || !isImgLoaded(imageUrlB)) {
            console.log('> Participant.handleRes waiting', isImgLoaded(imageUrlA), isImgLoaded(imageUrlB))
            await delay(100)
          }

          // turn off loading bars
          this.$data.loadingA = false
          this.$data.loadingB = false

          this.$data.imageA = imageUrlA
          this.$data.imageB = imageUrlB
          console.log(this.getImageUrl(imageUrlA), _.keys(loadedImages))
        }
      },
      choose (item) {
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
        return rpc
          .rpcRun('publicChooseItem', participateId, this.$data.comparison)
          .then(this.handleRes)
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

