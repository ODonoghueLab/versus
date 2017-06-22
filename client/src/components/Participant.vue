<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12 col-md-12 col-lg-12">
        <div v-if="start">
          <h2>Welcome to Versus!</h2>
          <p>
            You have been invited to participate in , an experiment on Versus.
          </p>
          <p>
            Experiments on Versus are super simple, all you need to do is view the two images and click on the one you beleive is better.
          </p>
          To participate in this experiment, enter your age and gender below and click start.
          </p>
          <br>
          <form v-on:submit.prevent="enterUser">
            <label> Age</label>
            <input 
                type="number"
                v-model.number="age"
                min="1"
                max="100">
            </input>
            <label> Gender</label>
            <select v-model="gender">
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="other">other</option>
            </select>
            <button @click="enterUser">
              Start Experiment
            </button>
          </form>
        </div>
        <div v-else-if="done" class="done">
          Your tests are done. Thank You
        </div>
        <div v-else>
          <div v-if="comparison" class="row">
            <h1> Participant </h1>
            <div
                class="col-sm-6 col-md-6 col-lg-6"
                style="text-align: center">
              <img 
                  class="choice" 
                  @click="choose(comparison.itemA)"
                  v-bind:src="getImageUrl(comparison.itemA)">
              {{comparison.itemA.value}}
            </div>
            <div 
                class="col-sm-6 col-md-6 col-lg-6"
                style="text-align: center">
              <img 
                  class="choice" 
                  @click="choose(comparison.itemB)"
                  v-bind:src="getImageUrl(comparison.itemB)">
              {{comparison.itemB.value}}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
@import 'https://fonts.googleapis.com/css?family=Lato:100';
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
export default {
  name: 'invite',
  data() {
    return {
      age: 18,
      gender: 'female',
      done: false,
      start: false,
      comparison: null
    }
  },
  mounted() {
    let inviteId = this.$route.params.inviteId
    axios
      .post(`${config.api}/participate/${inviteId}`)
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
      } 
    },
    choose (item){
      let inviteId = this.$route.params.inviteId
      let url = `${config.api}/participate-choose/${inviteId}`
      let payload = { return: item.value }
      console.log('>> Invite.handleRes send', util.jstr(payload))
      axios
        .post(url, payload)
        .then(this.handleRes)
    },
    getImageUrl (item) {
      return config.apiUrl + item.url
    },
    enterUser() {
      let inviteId = this.$route.params.inviteId
      let url = `${config.api}/participate-user/${inviteId}`
      let payload = {
        age: this.$data.age,
        gender: this.$data.gender
      }
      console.log('>> Invite.handleRes new user', payload)
      axios
        .post(url, payload)
        .then(this.handleRes)
    }
  }
}
</script>

