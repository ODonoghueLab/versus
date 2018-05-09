<template>
  <md-layout
      md-align="center"
      style="padding: 1em">

    <md-layout
        md-column
        md-flex="30"
        md-flex-medium="50"
        md-flex-small="80"
        style="
          width: 400px;
          text-align: left">

      <div
        style="
          padding-top: 4em;
          padding-bottom: 2em;">
        <img
          style="
            width: 350px"
          src="../../static/logo.png">
      </div>

      <p>
        Versus is a tool to facilitate visual analytics studies.
        It is designed to work both as a standalone tool or to
        use in conjunction with
        <a href="https://requester.mturk.com/">Mechanical Turk</a>
        as a survey link.
      </p>

      <p>
        Currently, we provide 2 options:
      <ol>
          <li>
            Two-alternative forced-choice (2FCA) methodology to achieve a
            full-set image ranking by comparing image pairs in several rounds.
          </li>
          <li>
            Multiple choice survey with a possible qualification
            round to record participant answers.
          </li>
        </ol>
      </p>

      <p>
        Repository and further instructions at <a href="https://github.com/ODonoghueLab/versus">https://github.com/ODonoghueLab/versus</a>
      </p>

      <p>
      </p>

      <md-layout
          v-if="!user.authenticated"
          md-align="le"
          md-vertical-align="center">
        <router-link
            to="/login"
            tag="md-button"
            class="md-raised md-primary">
          login
        </router-link>
         or
        <router-link
            to="/register"
            tag="md-button"
            class="md-button md-raised">
          register
        </router-link>
      </md-layout>

    </md-layout>

  </md-layout>
</template>

<script>
import auth from '../modules/auth'

export default {
  name: 'home',
  data () {
    return {
      user: auth.user
    }
  }
}
</script>
