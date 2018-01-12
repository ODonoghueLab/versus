<template>
  <div style="padding-left: 1em; padding-right: 1em;">

    <h2 class="md-display-2">
      Welcome Mechanical Turker
    </h2>

    <p>
      A new survey has been prepared for you.
    </p>

    <p>
      A survey code will be issued for you at the end of the survey.
    </p>

    <md-button
        v-if="participateId"
        class="md-raised md-primary"
        @click="startRun">
      Start survey
    </md-button>

  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
</style>

<script>
  import path from 'path'

  import config from '../config'

  import auth from '../modules/auth'
  import util from '../modules/util'
  import rpc from '../modules/rpc'

  export default {
    name: 'experiment',
    data () {
      return {
        participateId: null,
      }
    },
    mounted () {
      this.$data.experimentId = this.$route.params.experimentId
      console.log('> MturkParticipant.mounted', this.$data.experimentId)
      rpc
        .rpcRun(
          'publicInviteParticipant', this.$data.experimentId, 'test@test.com')
        .then((res) => {
          console.log('> Experiment.makeInvite', res.data)
          this.$data.participateId = res.data.participant.participateId
        })
    },
    methods: {
      startRun () {
        this.$router.push('/participant/' + this.$data.participateId)
      },
    }
  }

</script>

