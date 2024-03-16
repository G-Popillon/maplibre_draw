<template>
  <div id="map" style="width: 100%; height: 80%"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// import DrawFreehand from 'draw-free'
// console.log(DrawFreehand,'DrawFreehand')
// const { drawFreehand } = DrawFreehand as any
import drawFreehand from '../package/index.ts'
// const { DrawFreehand } = testUi()

onMounted(() => {
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 0],
    zoom: 1,
  })
  const draw = new drawFreehand(map)
  console.log(draw, 'draw')
  draw.start('#ff0', 1)
  setTimeout(() => {
    console.log(draw.getFeatures())
  }, 5000)
})
</script>

<style scoped></style>
