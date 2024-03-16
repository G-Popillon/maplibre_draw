<template>
  <div id="map" style="width: 100%; height: 80%"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// console.log(drawFreehand, 'drawFreehand')
// import drawFree from '../../dist/index.es'
import drawFree from '../package/index.ts'
const { drawFreehand } = drawFree
console.log(drawFree, 'drawFreehand')

onMounted(() => {
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 0],
    zoom: 1,
  })
  const draw = drawFreehand(map)
  console.log(draw, 'drawddd')
  draw.start('#ff0', 1)
  // setTimeout(() => {
  //   console.log(draw.getFeatures())
  // }, 5000)
})
</script>

<style scoped></style>
