<template>
  <div style="padding-left: 1em; padding-right: 1em;">

    <h2 class="md-display-2">
      Welcome Mechanical Turker
    </h2>

    <p>
      You have been sent here for "<span v-if="experiment">{{experiment.attr.title}}</span>."
    </p>

    <p>
      A new survey has been prepared for you.
    </p>

    <p>
      You will be ranking {{getNImage()}} images,
      with at most {{getMaxComparison()}} image comparisons, of which
      {{Math.ceil(.2*getMaxComparison())}} will be repeated.

    </p>
      A survey code will be issued for you at the end of the survey.

    <br>
    <br>

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

  import $ from 'jquery'
  import draggable from 'vuedraggable'

  import config from '../config'

  import auth from '../modules/auth'
  import util from '../modules/util'
  import rpc from '../modules/rpc'

  export default {
    name: 'experiment',
    data () {
      return {
        experimentId: null,
        experiment: null,
        participateId: null,
      }
    },
    components: {draggable},
    mounted () {
      this.$data.experimentId = this.$route.params.experimentId
      console.log('> MturkParticipant.mounted', this.$data.experimentId)
      rpc
        .rpcRun(
          'getExperiment', this.$data.experimentId)
        .then(res => {
          console.log('> MturkParticipant experiment', res.data)
          this.$data.experiment = res.data.experiment
        })
      rpc
        .rpcRun(
          'inviteParticipant', this.$data.experimentId, 'test@test.com')
        .then((res) => {
          console.log('>> Experiment.makeInvite', res.data)
          this.$data.participateId = res.data.participant.participateId
        })
    },
    methods: {
      startRun () {
        this.$router.push('/participant/' + this.$data.participateId)
      },
      getNImage () {
        if (this.$data.experiment) {
          let images = this.$data.experiment.Images
          return images.length
        }
        return null
      },
      getMaxComparison () {
        let n = this.getNImage()
        if (n > 0) {
          return Math.ceil(n * Math.log2(n))
        }
        return null
      }
    }
  }

</script>

