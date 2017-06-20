<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12 col-md-12 col-lg-12">
        <h1>
          Experiments created by user
        </h1>
      </div>
      <div class="col-sm-12 col-md-12 col-lg-12">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>View</th>
              <th>Results</th>
              <th>Invite</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tr v-for="experiment in experiments">
            <td>
              {{experiment.name}}
            </td>
            <td>{{experiment.description}}</td>
            <td>
              <router-link 
                  class="button"
                  v-bind:to="getExperimentRoute(experiment.id)">
                view
              </router-link>
            </td>
            <td></td>
            <td></td>
            <td>
              <button @click="deleteExperiment(experiment)">X</button>
            </td>
          </tr>
          <tr>
            <td colspan="6">
              <router-link 
                  class="button"
                  to='/create-experiment'>
                Create New Experiment
              </router-link>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>

</style>

<script>
import axios from 'axios'
import auth from '../modules/auth'
import config from '../config'
import util from '../modules/util'

// really important for using with passport.js 
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

export default {
  name: 'experiments',
  data() {
    return {
      experiments: []
    }
  },
  mounted() {
    let payload = { 
      userId: auth.user.id, 
    }
    console.log('>> UserExperiments.mounted', payload)
    axios
      .post(config.api + '/experiments', payload)
      .then((res) => {
        this.$data.experiments = res.data.experiments
      })
  },
  methods: {
    deleteExperiment(experiment) {
      console.log('>> UserExperiments.deleteExperiment', experiment)
      axios
        .post(
          `${config.api}/delete-experiment/${experiment.id}`,
          { withCredentials: true})
        .then((res) => {
          util.removeItem(this.$data.experiments, experiment, 'id')
        })
    },
    getExperimentRoute(experimentId) {
      return 'experiment/' + experimentId
    }
  }
}

</script>

