<template>
  <div style="padding-left: 1em; padding-right: 1em;">

    <h2 class="md-display-2">
      Creating new participant
    </h2>

    <p v-if="!error">
      Will redirect when created...
    </p>

    <p v-if="error">
      {{ error }}
    </p>
  </div>
</template>

<script>
import rpc from '../modules/rpc'

export default {
  name: 'experiment',
  data () {
    return {
      error: '',
      participateId: null
    }
  },
  async mounted () {
    this.$data.experimentId = this.$route.params.experimentId
    console.log('> MturkParticipant.mounted', this.$data.experimentId)
    let response = await rpc.rpcRun(
      'publicInviteParticipant', this.$data.experimentId, 'test@test.com')
    if (response.result) {
      console.log('> Experiment.makeInvite', response)
      this.participateId = response.result.participant.participateId
      this.$router.push('/participant/' + this.participateId)
    } else {
      this.error = response.error.message
    }
  }
}
</script>
