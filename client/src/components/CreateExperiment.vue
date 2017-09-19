<template>
  <div style="padding-left: 1em; padding-right: 1em; text-align: left">
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
<!--
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
-->      
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

    <uploader 
        :options="options"
        class="uploader-example"
        v-on:files-submitted="submitFiles"
        v-on:upload-start="startUpload"
        >
      <uploader-unsupport></uploader-unsupport>
      <uploader-drop>
        <p>Drop files here to upload or</p>
        <uploader-btn 
          :directory="true">
          select folder
        </uploader-btn>
      </uploader-drop>
      <uploader-list></uploader-list>
    </uploader>

    <br>

    <md-layout 
        md-row 
        md-vertical-align="center">
      <md-button
          v-on:click.nate="submit"
          :disabled="isUploading"
          class="md-raised md-primary">
        Submit
      </md-button>
      <md-spinner
          md-indeterminate
          :md-size=30
          v-if="isUploading">
      </md-spinner>
    </md-layout>

  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style>
  .uploader-example {
    width: 100%;
    margin: 40px auto 0;
    font-size: 12px;
  }
  .uploader-example .uploader-btn {
    margin-right: 4px;
  }
  .uploader-example .uploader-list {
    max-height: 440px;
    overflow: auto;
    overflow-x: hidden;
    overflow-y: auto;
  }
</style>

<script>
  import axios from 'axios'
  import _ from 'lodash'
  import Vue from 'vue'
  import uploader from 'vue-simple-uploader'
  import auth from '../modules/auth'
  import rpc from '../modules/rpc'

  let root = Vue.use(uploader)

  // console.log('> CreateExperiment.init uploader', uploader)
  // uploader.uploader.on('fileSucess', (rootFile, file, message) => {
  //   console.log('> CreateExperiment.fileSucess', rootFile, file, message)
  // })

  export default {
    name: 'createExperiment',
    data() {
      return {
        files: [],
        fileStr: '',
        dirs: [],
        attr: {
          title: 'Which image looks better?',
          blurb: 'Take your time',
          name: ''
        },
        isUploading: false,
        options: {
          // https://github.com/simple-uploader/Uploader/tree/develop/samples/Node.js
          target: '//localhost:3000/api/rpc-new-upload',
          testChunks: false,

        },
        attrs: {
          accept: 'image/*'
        }
      }
    },
    methods: {
      selectFiles (files) {
        this.$data.files = files
        this.$data.fileStr = `${files.length} files`
      },
      startUpload () {
        console.log('> CreateExperiment.startUpload')
      },
      submitFiles (files, fileList) {
              console.log('> CreateExperiment.submitFiles refs', this.$refs)
        console.log('> CreateExperiment.submitFiles', files, fileList)
        for (let f of files) {
          console.log('> CreateExperiment.submitFiles file', f.name, f.relativePath, f.isComplete())
          this.$data.files.push(f)
        }
        for (let f of fileList) {
          console.log('> CreateExperiment.submitFiles directory', f.name, f.path)
          this.$data.dirs.push(f)
        }
        this.checkUploading()
      },
      checkUploading () {
        this.$data.isUploading = this.isFilesUploading()
        console.log('> CreateExperiment.checkUploading', this.$data.isUploading)
        if (this.$data.isUploading) {
          setTimeout(this.checkUploading, 1000)
        }
      },
      isFilesUploading () {
        if (this.$data.files.length === 0) {
          console.log('> CreateExperiment.isFilesUploading empty')
          return false
        }
        for (let f of this.$data.files) {
          if (!f.isComplete()) {
            console.log('> CreateExperiment.isFilesUploading empty')
            return true
          }
        }
        return false

      },
      submit ($event) {
        console.log('> CreateExperiment.submit isuploding', this.$data.isUploading)
        // this.$data.isUploading = true
        // rpc
        //   .rpcUpload(
        //     'uploadImagesAndCreateExperiment',
        //     this.$data.files, auth.user.id, this.$data.attr)
        //   .then(res => {
        //     this.$data.isUploading = false
        //     console.log('>> CreateExperiment.submit', res.data)
        //     let experimentId = res.data.experimentId
        //     this.$router.push('/experiment/' + experimentId)
        //   })
      }
    }
  }
</script>

