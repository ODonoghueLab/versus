<template>
  <div class="container">
    <div class="row">
      <div class="col-sm-12 col-md-12 col-lg-12">
        <h1>
          Experiments created by user
        </h1>
      </div>
      <div class="col-sm-12 col-md-12 col-lg-12">
        <table>
          <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>View</th>
            <th>Results</th>
            <th>Invite</th>
            <th>Delete</th>
          </tr>
          </thead>
          <tr v-for="experiment in experiments">
            <td>{{experiment.name}}</td>
            <td>{{experiment.description}}</td>
            <td></td>
            <td></td>
            <td></td>
            <td>
              <button>X</button>
            </td>
          </tr>
          <tr>
            <td colspan="6">
              <button>Create New Experiment</button>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
</style>

<script>
import axios from 'axios'
import auth from '../modules/auth'

export default {
  name: 'experiments',
  data() {
    return {
      experiments: []
    }
  },
  mounted() {
    axios
      .post(
        'http://localhost:3000/api/experiments',
        { userId: auth.user.id })
      .then((res) => {
        this.$data.experiments = res.data.experiments
      })
  }
}

</script>

