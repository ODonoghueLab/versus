<template>
  <div style="padding: 1em">
    <md-layout
        md-column
        md-align="center"
        style="text-align: center">
      <h2 class="md-display-2">
        Welcome to Versus
      </h2>
      <p>
        Versus is a tool to enable you to do simple visual quality analysis.
      </p>
      <p>
        We have a simple 2FCA option.
      </p>
      <p></p>
      <p></p>
      <p></p>
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
  </div>
</template>

<script>
  import router from '../router'
  export default {
    name: 'home',
  }
</script>
