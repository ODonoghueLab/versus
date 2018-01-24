<template>
  <div
    style="
       padding-left: 1em;
       padding-right: 1em;
       text-align: left">
    <h2 class="md-display-2">
      Create Experiment
    </h2>

    <form v-on:submit.prevent="submit">

      <md-input-container>
        <label>Name</label>
        <md-input
          type="text"
          name="uploadFiles"
          v-model="attr.name">
        </md-input>
      </md-input-container>

      <md-input-container>
        <md-file
          id="file-input"
          multiple
          @selected="selectFiles">
        </md-file>
        <label
          for="file-input"
          class="button">
          Upload files
        </label>
      </md-input-container>
      <div style="font-size: 1em; color: #999; margin-top: -1.5em; line-height: 1.2em">
        Images are .png, .jpg, or .gif.
        <br>
        An image set is defined by an underscore, eg `imageset_*.png`.
        <br>
        Each image set must have at least 2 images.
        <br>
        <br>
      </div>

      <md-input-container>
        <label>Question</label>
        <md-input
          type="text"
          v-model="attr.title">
        </md-input>
      </md-input-container>

      <md-input-container>
        <label>Blurb</label>
        <md-textarea
          type="text"
          name="blurb"
          v-model="attr.blurb">
        </md-textarea>
      </md-input-container>
      <br>

      <div>
        <md-radio v-model="attr.questionType" id="my-test1" name="my-test-group1" md-value="2afc">2 alternative forced choice</md-radio>
        <md-radio v-model="attr.questionType" id="my-test2" name="my-test-group1" md-value="multiple">multiple choice</md-radio>
      </div>

      </md-switch>

      <md-layout
          md-row
          md-vertical-align="center">
        <md-button
          type="submit"
          :disabled="isUploading"
          class="md-raised md-primary">
          Submit
        </md-button>
        <md-spinner
          md-indeterminate
          :md-size="30"
          v-if="isUploading">
        </md-spinner>
      </md-layout>

      <span
          v-if="error"
          style="
            padding-top: 1em;
            padding-left: 1em;
            color: red" >
        {{error}}
      </span>
    </form>
  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
</style>

<script>
  import auth from '../modules/auth'
  import rpc from '../modules/rpc'

  export default {
    name: 'createExperiment',
    data () {
      return {
        files: '',
        fileStr: '',
        attr: {
          title: 'Which image looks better?',
          blurb: 'Click on the image that looks better. Take your time',
          name: '',
          questionType: '2afc'
        },
        isUploading: false,
        error: ''
      }
    },
    methods: {
      selectFiles (files) {
        this.$data.files = files
        this.$data.fileStr = `${files.length} files`
      },
      async submit () {
        this.$data.isUploading = true

        let res = await rpc.rpcUpload(
          'uploadImagesAndCreateExperiment',
          this.$data.files, auth.user.id, this.$data.attr)

        this.$data.isUploading = false

        if (res.data.success) {
          console.log('> CreateExperiment.submit', res.data)
          let experimentId = res.data.experimentId
          this.$router.push('/experiment/' + experimentId)
        } else {
          this.error = res.data.error
        }
      }
    }
  }
</script>
