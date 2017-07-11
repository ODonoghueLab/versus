<template>
  <div style="padding-left: 1em; text-align: left">

    <div v-if="start">
      <h2 class="md-display-2">
        Welcome to Versus!
      </h2>
      <p>
        You have been invited to participate in , an experiment on Versus.
      </p>
      <p>
        Experiments on Versus are super simple, all you need to do is view the two images and click on the one you beleive is better.
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
            Start Experiment
          </md-button>
      </form>
    </div>

    <div v-else-if="done" class="done">
      Your tests are done. Thank You
    </div>

    <div v-else>
      <div v-if="comparison" class="row">
        <h2 class="md-display-2"> {{comparisonTitle}} </h2>
        <p> {{comparisonText}}</p>
      </div>
      <md-layout>
        <md-layout>
          <img
              class="choice"
              @click="choose(comparison.itemA)"
              v-bind:src="getImageUrl(comparison.itemA)">
          {{comparison.itemA.value}}
          <md-spinner
              v-if="loadingA"
              md-indeterminate
              style="
                position: absolute;
                top: 50%;
                left: 25%;
                transform: translate(-50%, -50%);">
          </md-spinner>
        </md-layout>
        <md-layout
            class="col-sm-6 col-md-6 col-lg-6"
            style="text-align: center">
          <img
              class="choice"
              @click="choose(comparison.itemB)"
              v-bind:src="getImageUrl(comparison.itemB)">
          {{comparison.itemB.value}}
          <md-spinner
              v-if="loadingB"
              md-indeterminate
              style="
                position: absolute;
                top: 50%;
                left: 75%;
                transform: translate(-50%, -50%);">
          </md-spinner>
        </md-layout>
      </md-layout>
    </div>
  </div>

</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style>
  @import 'https://fonts.googleapis.com/css?family=Lato:100';
</style>

<style scoped>
  .done {
    width: calc(100vw - 30px);
    height: 100vh;
    background-image: -webkit-linear-gradient(55deg, #FF5F6D -10%, #FFC371);
    background-image: linear-gradient(35deg, #FF5F6D -10%, #FFC371);
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    -webkit-box-orient: vertical;
    -webkit-box-direction: normal;
    -webkit-flex-direction: column;
    -ms-flex-direction: column;
    flex-direction: column;
    -webkit-box-pack: center;
    -webkit-justify-content: center;
    -ms-flex-pack: center;
    justify-content: center;
    -webkit-box-align: center;
    -webkit-align-items: center;
    -ms-flex-align: center;
    align-items: center;
    color: white;
    text-transform: uppercase;
    font-family: "Lato";
  }

  .done {
    font-size: 70px;
  }

  .choice {
    border: 1px solid rgba(255, 255, 255, 0.0);
  }

  .choice:hover {
    border: 1px solid #EEBBBB;
  }

  .choice:active {
    border: 1px solid #EEBBBB;
    background-color: #FFEEEE;
  }
</style>

<script>
  import axios from 'axios'
  import auth from '../modules/auth'
  import config from '../config'
  import util from '../modules/util'
  import rpc from '../modules/rpc'
  import MdOption from '../../node_modules/vue-material/src/components/mdSelect/mdOption'

  export default {
    components: {MdOption},
    name: 'invite',
    data() {
      return {
        loadingA: false,
        loadingB: false,
        age: 18,
        gender: 'female',
        done: false,
        start: false,
        comparison: null,
        comparisonTitle: 'Choose the better looking image',
        comparisonText: 'Take your time',
      }
    },
    mounted() {
      let participateId = this.$route.params.participateId
      rpc
        .rpcRun('getParticipant', participateId)
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
        } else if (res.data.done) {
          console.log('>> Invite.handleRes done')
          this.$data.done = true
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
          this.$data.loadingA = false
          this.$data.loadingB = false
        }
      },
      choose (item){
        let participateId = this.$route.params.participateId
        if (item.value === this.$data.comparison.itemA.value) {
          this.$data.loadingA = true
        } else {
          this.$data.loadingB = true
        }
        rpc
          .rpcRun('chooseItem', participateId, item.value)
          .then(this.handleRes)
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
            'saveParticipantUserDetails', participateId, details)
          .then(this.handleRes)
      }
    }
  }
</script>

