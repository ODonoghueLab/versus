<template>
  <div style="padding-left: 1em; padding-right: 1em; text-align: left">
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
        <label for="file-input" class="button">
          Upload files
        </label>
        {{fileStr}}
      </md-input-container>
      <md-input-container>
        <label>Title</label>
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

      <md-layout md-row md-vertical-align="center">
        <md-button
            type="submit"
            :disabled="isUploading"
            class="md-raised md-primary">
          Submit
        </md-button>
        <md-spinner
            md-indeterminate
            md-size="30"
            v-if="isUploading">
        </md-spinner>
      </md-layout>
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
    data() {
      return {
        files: '',
        fileStr: '',
        attr: {
          title: 'Which image looks better?',
          blurb: 'Click on the image that looks better. Take your time',
          name: ''
        },
        isUploading: false
      }
    },
    methods: {
      selectFiles (files) {
        this.$data.files = files
        this.$data.fileStr = `${files.length} files`
      },
      submit ($event) {
        this.$data.isUploading = true
        rpc
          .rpcUpload(
            'uploadImagesAndCreateExperiment',
            this.$data.files, auth.user.id, this.$data.attr)
          .then(res => {
            this.$data.isUploading = false
            console.log('> CreateExperiment.submit', res.data)
            let experimentId = res.data.experimentId
            this.$router.push('/experiment/' + experimentId)
          })
      }
    }
  }
</script>
