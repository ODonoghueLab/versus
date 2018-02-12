<template>
  <div style="padding: 1em;">

    <h2 class="md-display-2">
      {{ title() }}
    </h2>

    <md-table
      v-if="experiments.length"
      style="margin-left: 10px">

      <md-table-header>
        <md-table-row>

          <md-table-head>Name</md-table-head>

          <md-table-head/>

        </md-table-row>
      </md-table-header>

      <md-table-body>
        <md-table-row
          v-for="(experiment, index) in experiments"
          :key="index">

          <md-table-cell style="width: 100%">
            <a @click="getExperimentRoute(experiment.id)">
              {{experiment.attr.name}}
            </a>
          </md-table-cell>

          <md-table-cell>
            <md-button
              class="md-icon-button md-raised"
              @click="deleteExperiment(experiment)">
              <md-icon>delete</md-icon>
            </md-button>
          </md-table-cell>

        </md-table-row>
      </md-table-body>

    </md-table>

    <md-button
      style="margin-top: 2em"
      class="md-button md-raised md-primary"
      @click="createExperiment()">
      Create New Experiment
    </md-button>

  </div>
</template>

<script>
import auth from '../modules/auth'
import util from '../modules/util'
import rpc from '../modules/rpc'
import router from '../router.js'

export default {
  name: 'userExperiments',
  data () {
    return {
      experiments: []
    }
  },
  async mounted () {
    let response = await rpc.rpcRun('getExperimentSummaries', auth.user.id)
    if (response.result) {
      this.$data.experiments = response.result.experiments
    }
  },
  methods: {
    title () {
      let user = auth.user
      return `Experiments created by user: ${user.name}`
    },
    async deleteExperiment (experiment) {
      await rpc.rpcRun('deleteExperiment', experiment.id)
      util.removeItem(this.$data.experiments, experiment, 'id')
    },
    createExperiment () {
      router.push('/create-experiment')
    },
    getExperimentRoute (experimentId) {
      router.push('experiment/' + experimentId)
    }
  }
}
</script>
