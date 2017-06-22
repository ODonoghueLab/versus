<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12 col-md-12 col-lg-12">
        <h1> Create Experiment </h1>
        <form v-on:submit.prevent="">
          <label>Name</label>
          <input 
              type="text"
              name="experiment[name]"
              v-model="name">
              </input>
          <input 
              type="file" 
              enctype="multipart/form-data"
              name="experiment[images]"
              id="file-input"
              multiple
              @change="filesChange($event)">
              </input>
          <label for="file-input" class="button">
            Upload files
          </label>          
          {{fileStr}}
          <br>
          <button type="submit" @click="submit">Submit</button>
        </form>
      </div>
    </div>
  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
</style>

<script>
import axios from 'axios'
import config from '../config'
import auth from '../modules/auth'
import util from '../modules/util'
import _ from 'lodash'

export default {
  name: 'createExperiment',
  data() {
    return {
      name: '',
      files: '',
      fileStr: ''
    }
  },
  methods: {
    filesChange ($event) {
      this.$data.files = $event.target.files
      this.$data.targetNname = $event.target.name
      this.$data.fileStr = `${this.$data.files.length} files`
    },
    submit () {
      let formData = new FormData()
      formData.append("experiment[name]", this.$data.name)
      formData.append("userId", auth.user.id)
      _.each(this.$data.files, file => {
        formData.append(this.$data.targetNname, file, file.name)
      })
      const url = `${config.api}/create-experiment`
      console.log('>> CreateExperiment.submit url', url)
      return axios
        .post(url, formData)
        .then(res => {
          console.log('>> CreateExperiment.submit', res.data)
          let experimentId = res.data.experimentId
          this.$router.push('/experiment/' + experimentId)
        })
    }
  }
}

</script>

