<template>
  <div style="padding-left: 1em; text-align: left">
    <h2 class="md-display-2">
      {{ title() }}
    </h2>
    <md-table v-if="experiments.length" class="left-margin">
      <md-table-header>
        <md-table-row>
          <md-table-head>Name</md-table-head>
          <md-table-head></md-table-head>
        </md-table-row>
      </md-table-header>
      <md-table-body>
        <md-table-row v-for="experiment in experiments">
          <md-table-cell style="width: 100%">
            {{experiment.name}}
          </md-table-cell>
          <md-table-cell>
            <md-button class="md-icon-button md-raised"
                       @click="getExperimentRoute(experiment.id)">
              <md-icon>explore</md-icon>
            </md-button>
            &nbsp;
            <md-button class="md-icon-button md-raised"
                       @click="deleteExperiment(experiment)">
              <md-icon>delete</md-icon>
            </md-button>
          </md-table-cell>
        </md-table-row>
      </md-table-body>
    </md-table>

    <div style="padding-top: 2em">
      <md-button
          class="md-button md-raised md-primary"
          @click="createExperiment()">
        Create New Experiment
      </md-button>
    </div>

  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
  .left-margin {
    margin-left: 10px
  }
</style>

<script>
  import axios from 'axios'
  import auth from '../modules/auth'
  import config from '../config'
  import util from '../modules/util'
  import rpc from '../modules/rpc'
  import _ from 'lodash'

  import router from '../router.js'

  export default {
    name: 'experiments',
    data() {
      return {
        experiments: []
      }
    },
    mounted() {
      rpc.rpcRun('getExperiments', auth.user.id)
        .then((res) => {
          this.$data.experiments = res.data.experiments
        })
    },
    methods: {
      title () {
        let user = auth.user
        return `Experiments for: ${user.firstName} ${user.lastName}`
      },
      deleteExperiment(experiment) {
        rpc.rpcRun('deleteExperiment', experiment.id)
          .then((res) => {
            util.removeItem(
              this.$data.experiments, experiment, 'id')
          })
      },
      createExperiment () {
        router.push('/create-experiment')
      },
      getExperimentRoute(experimentId) {
        router.push('experiment/' + experimentId)
      }
    }
  }

</script>

