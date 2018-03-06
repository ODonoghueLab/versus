<template>
  <div
    style="
       padding-left: 1em;
       padding-right: 1em;
       text-align: left">
    <h2 class="md-display-2">
      Create Experiment
    </h2>

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
    <div
      style="
        font-size: 1em;
        color: #999;
        margin-top: -1.5em;
        line-height: 1.2em">
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

    <div>
      <md-radio
        v-model="attr.questionType"
        md-value="2afc">
        2 alternative forced choice
      </md-radio>
      <md-radio
        v-model="attr.questionType"
        md-value="multiple">
        multiple choice
      </md-radio>
    </div>

    <md-input-container style="width: 130px">
      <label>Probability of Repeat</label>
      <md-input
        type="number"
        v-model="attr.probRepeat"/>
    </md-input-container>

    <md-layout
      md-row
      md-vertical-align="center">
      <md-button
        type="submit"
        :disabled="isUploading"
        class="md-raised md-primary"
        @click="submit">
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
        color: red">
      {{error}}
    </span>
  </div>
</template>

<script>
import _ from 'lodash'
import rpc from '../modules/rpc'
import auth from '../modules/auth'
import util from '../modules/util'

/**
 * Key function to return imageSetId from a path name, else empty string
 * These function should be used to allow unique imageSetIds to be
 * extracted across the app.
 */
/**
 * @returns error string on error, otherwise empty string
 */
function checkFilelistError (filelist, questionType) {
  for (let f of filelist) {
    let path = f.name
    let ext = _.last(path.split('.')).toLowerCase()
    console.log(path, ext)
    let isExt = _.includes(['png', 'gif', 'jpg', 'jpeg'], ext)
    if (!isExt) {
      return 'only .png, .jpg, .gif allowed'
    }
    // size checking
    // if (f.size / 1000000 > 2) {
    //   return 'only images under 2MB allowed'
    // }
  }
  if (questionType === '2afc') {
    let imageSetIds = []
    let nImageById = {}
    for (let f of filelist) {
      let path = f.name
      let imageSetId = util.extractId(path)
      if (!_.includes(imageSetIds, imageSetId)) {
        imageSetIds.push(imageSetId)
        nImageById[imageSetId] = 0
      }
      nImageById[imageSetId] += 1
    }
    for (let [imageSetId, nImage] of _.toPairs(nImageById)) {
      console.log(imageSetId, nImage)
      if (nImage < 2) {
        return `minimum two images for ${imageSetId}`
      }
    }
  }
  return ''
}

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
        questionType: '2afc',
        probRepeat: 0.2
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
      let error = checkFilelistError(
        this.$data.files, this.$data.attr.questionType)
      if (!this.attr.name) {
        error = 'must have experiment name'
      }
      this.attr.probRepeat = parseFloat(this.attr.probRepeat)
      if (error) {
        this.$data.error = 'Error: ' + error
        return
      }

      this.$data.isUploading = true

      console.log('> CreateExperiment.submit attr', _.cloneDeep(this.attr))

      let response = await rpc.rpcUpload(
        'uploadImagesAndCreateExperiment',
        this.files, auth.user.id, _.cloneDeep(this.attr))

      console.log('> CreateExperiment.submit response', response)

      if (response.result) {
        let experimentId = response.result.experimentId
        this.$router.push('/experiment/' + experimentId)
      } else {
        this.error = response.error.message
      }
    }
  }
}
</script>
