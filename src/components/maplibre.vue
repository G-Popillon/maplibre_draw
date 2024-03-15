<template>
  <div id="map" style="width: 100%; height: 80%"></div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// import testUi from 'draw-freehand'
import testUi from '../package/index.ts'

onMounted(() => {
  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 0],
    zoom: 1,
  })
  const draw = new testUi.drawFreehand(map)
  console.log(draw, 'draw')
  draw.start('#ff0', 1)
})
</script>

<style scoped></style>
