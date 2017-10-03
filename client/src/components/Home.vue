<template>
  <md-layout
      md-align="center"
      style="padding: 1em">
    <md-layout
        md-column
        md-flex="30"
        md-flex-medium="60"
        md-flex-small="80"
        style="width: 500px; text-align: center">
      <h2 class="md-display-2">
        Welcome to Versus
      </h2>
      <p>
        Versus is a tool for testing visual
        quality analysis,
        by allowing "participants" to
        rank a set of images.
      </p>
      <p>
        Currently, we only
        provide a two-alternative forced-choice (2FCA)
        option,
        where a set of images is ranked by
        considering a series of comparison
        between two images.
      </p>
      <p>
        Repository at <a href="https://github.com/ODonoghueLab/versus">https://github.com/ODonoghueLab/versus</a>
      </p>
      <p>
      </p>
      <p>
        To setup a set of images for analysis:
      </p>
      <md-layout
          md-align="center"
          md-vertical-align="center">
        Please
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
  import router from '../router'
  export default {
    name: 'home',
  }
</script>
