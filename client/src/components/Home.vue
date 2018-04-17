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
            width: 100%"
          src="../../static/logo.png">
      </div>

      <p>
        Versus is a tool to facilitate the complete
        ranking of a set of images for visual
        quality analysis. It is designed to work both
        locally and with
        <a href="https://requester.mturk.com/">Mechanical Turk</a>.
      </p>

      <p>
        Currently, we
        provide:
        <ol>
          <li> two-alternative forced-choice (2FCA)
            option, whereby images a ranked via a series of comparisons
            between two images.
          </li>
          <li> multiple choice option with a qualification round
          </li>
        </ol>
      </p>

      <p>
        Repository and further instructions at <a href="https://github.com/ODonoghueLab/versus">https://github.com/ODonoghueLab/versus</a>
      </p>

      <p>
      </p>

      <p>
        To setup a set of images for analysis:
      </p>

      <md-layout
          md-align="left"
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
export default {
  name: 'home'
}
</script>
