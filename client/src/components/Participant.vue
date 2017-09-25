<template>
  <div style="padding-left: 1em; text-align: left">

    <div v-if="start">
      <h2 class="md-display-2">
        Welcome to Versus!
      </h2>
      <p>
        You have been invited to participate in an experiment on Versus.
      </p>
      <p>
        Experiments on Versus are easy, all you need to do
        is view the two images and click on the one you believe is better.
      </p>

      <p>
        You will be ranking {{nImage}} images,
        with at most {{getMaxComparison()}} image comparisons, of which
        {{Math.ceil(.2*getMaxComparison())}} will be repeated.

      </p>

      <p>
        To participate in this experiment, enter your age and gender below and click start.
      </p>

      <form v-on:submit.prevent="enterUser">
        <div style="display: flex">
          <md-input-container
              style="width: 3em">
            <label for="age"> Age</label>
            <md-input
                type="number"
                v-model.number="age"
                min="1"
                max="100">
            </md-input>
          </md-input-container>
          <md-input-container
              style="width: 10em; margin-left: 1em;">
            <label for="gender"> Gender</label>
            <md-select
                name="gender"
                v-model="gender"
                id="gender">
              <md-option value="male">male</md-option>
              <md-option value="female">female</md-option>
              <md-option value="other">other</md-option>
            </md-select>
          </md-input-container>
        </div>

        <md-button
            @click="enterUser"
            class="md-raised md-primary"
            style="margin-left: 1em">
          Look at images
        </md-button>
      </form>
    </div>

    <div v-else-if="done" class="done">
      <md-layout
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

    <div v-else>
      <md-layout md-align="center" v-if="comparison">

        <md-layout md-align="center" md-flex="100">
          <h2 class="md-display-2"> {{attr.title}} </h2>
        </md-layout>

        <md-layout md-align="center" md-flex="100">
          <p> {{attr.blurb}}</p>
          <br>
        </md-layout>

        <md-layout>
          <md-layout md-flex="50" md-align="end">
            <md-whiteframe v-if="imageA" md-elevation="5" style="margin-right: 1em">
              <div style="height: 12px;">
                <md-progress
                  v-if="loadingA"
                  md-indeterminate></md-progress>
                </div>
              <md-button
                  class="choice"
                  @click="choose(comparison.itemA)">
                <md-image :md-src="imageA"></md-image>
                <div style="width: 100%; text-align: center; color: #DDD">
                  {{comparison.itemA.value}}
                </div>
              </md-button>
            </md-whiteframe>
          </md-layout>

          <md-layout md-flex="50" md-align="start">
            <md-whiteframe v-if="imageB" md-elevation="5" style="margin-left: 0.7em">
              <div style="height: 12px">
                <md-progress
                    v-if="loadingB"
                    md-indeterminate></md-progress>
              </div>
              <md-button
                  @click="choose(comparison.itemB)"
                  class="choice">
                <md-image :md-src="imageB"></md-image>
                <div style="width: 100%; text-align: center; color: #DDD">
                  {{comparison.itemB.value}}
                </div>
              </md-button>
            </md-whiteframe>
          </md-layout>
        </md-layout>

        <md-layout
            v-if="comparison.isRepeat"
            md-align="center"
            style="padding-top: 1em; color: #DDD"
            md-flex="100">
          repeat
          <br>
        </md-layout>

      </md-layout>
    </div>
  </div>

</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style>
  @import 'https://fonts.googleapis.com/css?family=Lato:300';
</style>

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
  import axios from 'axios'
  import auth from '../modules/auth'
  import config from '../config'
  import util from '../modules/util'
  import rpc from '../modules/rpc'

  function delay (timeMs) {
    return new Promise(resolve => { setTimeout(resolve, timeMs) })
  }

  export default {
    name: 'invite',
    data() {
      return {
        loadingA: false,
        loadingB: false,
        nImage: null,
        imageA: null,
        imageB: null,
        age: 18,
        gender: 'female',
        done: false,
        start: false,
        comparison: null,
        surveyCode: null,
        attr: {},
      }
    },
    mounted() {
      let participateId = this.$route.params.participateId
      rpc
        .rpcRun('publicGetParticipant', participateId)
        .then(this.handleRes)
    },
    methods: {
      handleRes(res) {
        console.log('>> Invite.handleRes received data', util.jstr(res.data))
        this.$data.start = false
        this.$data.done = false
        if (res.data.new) {
          console.log('>> Invite.handleRes new')
          this.$data.start = true
          this.$data.nImage = res.data.nImage
        } else if (res.data.done) {
          console.log('>> Invite.handleRes done')
          this.$data.done = true
          this.$data.surveyCode = res.data.surveyCode
        } else if (res.data.comparison) {
          let comparison = this.$data.comparison
          let newComparison = res.data.comparison
          console.log('>> Invite.handleRes comparison', newComparison)
          if (comparison) {
            // swap to match existing choices on screen
            if ((newComparison.itemA.value == comparison.itemB.value)
              | (newComparison.itemB.value == comparison.itemA.value)) {
              let dummy = newComparison.itemA
              newComparison.itemA = newComparison.itemB
              newComparison.itemB = dummy
            }
          }
          this.$data.comparison = newComparison
          this.$data.attr = res.data.attr
          this.$data.imageB = null
          this.$data.imageA = null

          let newImageA = new Image;
          newImageA.src = this.getImageUrl(newComparison.itemA)
          newImageA.onload = () => {
            this.$data.imageA = this.getImageUrl(newComparison.itemA)
            this.$data.loadingA = false
          }

          let newImageB = new Image;
          newImageB.src = this.getImageUrl(newComparison.itemB)
          newImageB.onload = () => {
            this.$data.imageB = this.getImageUrl(newComparison.itemB)
            this.$data.loadingB = false
          }
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
        delay(1000)
          .then(() => {
            rpc
              .rpcRun('publicChooseItem', participateId, this.$data.comparison)
              .then(this.handleRes)
          })
      },
      getImageUrl (item) {
        return config.apiUrl + item.url
      },
      enterUser() {
        let participateId = this.$route.params.participateId
        let details = {
          age: this.$data.age,
          gender: this.$data.gender
        }
        rpc
          .rpcRun(
            'publicSaveParticipantUserDetails', participateId, details)
          .then(this.handleRes)
      },
      getMaxComparison () {
        let n = this.$data.nImage
        if (n > 0) {
          return Math.ceil(n * Math.log2(n))
        }
        return null
      }

    }
  }
</script>

