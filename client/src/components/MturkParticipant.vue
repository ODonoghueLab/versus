<template>
  <div style="padding-left: 1em; padding-right: 1em;">

    <h2 class="md-display-2">
      Welcome Mechanical Turker
    </h2>

    <p>
      A new survey will be prepared for you.
    </p>

    <p>
      A survey code will be issued for you on completion of the survey.
    </p>

    <md-button
        v-if="participateId"
        class="md-raised md-primary"
        @click="startRun">
      Create survey
    </md-button>

  </div>
</template>

<script>
import rpc from '../modules/rpc'

export default {
  name: 'experiment',
  data () {
    return {
      participateId: null
    }
  },
  mounted () {
    this.$data.experimentId = this.$route.params.experimentId
    console.log('> MturkParticipant.mounted', this.$data.experimentId)
    rpc
      .rpcRun(
        'publicInviteParticipant', this.$data.experimentId, 'test@test.com')
      .then((response) => {
        console.log('> Experiment.makeInvite', response)
        this.$data.participateId = response.result.participant.participateId
      })
  },
  methods: {
    startRun () {
      this.$router.push('/participant/' + this.$data.participateId)
    }
  }
}
</script>
