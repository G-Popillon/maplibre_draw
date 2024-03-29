<template>
  <draw v-if="isReady" :maplibre="maplibre"></draw>
  <div id="map" style="width: 100%; height: 80%"></div>
</template>
<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import draw from './draw.vue'

const isReady = ref(false)
const maplibre = shallowRef({})

onMounted(() => {
  const map = new maplibregl.Map({
    container: 'map',
    zoom: 12,
    center: [11.39085, 47.27574],
    pitch: 52,
    hash: true,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap Contributors',
          maxzoom: 19,
        },
        // Use a different source for terrain and hillshade layers, to improve render quality

        // hillshadeSource: {
        //   type: 'raster-dem',
        //   url: 'http://218.6.244.186:10088/maps/terrain12p5/layer.json',
        //   tileSize: 256,
        // },
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
        },
        // {
        //   id: 'hills',
        //   type: 'hillshade',
        //   source: 'hillshadeSource',
        //   layout: { visibility: 'visible' },
        //   paint: { 'hillshade-shadow-color': '#473B24' },
        // },
      ],
      // terrain: {
      //   source: 'mapbox-dem',
      //   exaggeration: 1.5,
      // },
      // terrain: {
      //   source: 'terrainSource',
      //   exaggeration: 1,
      // },
    },
    maxZoom: 18,
    maxPitch: 85,
  })

  map.addControl(
    new maplibregl.NavigationControl({
      visualizePitch: true,
      showZoom: true,
      showCompass: true,
    })
  )

  map.addControl(
    new maplibregl.TerrainControl({
      source: 'terrainSource',
      exaggeration: 1,
    })
  )

  map.on('load', function () {
    maplibre.value = map
    isReady.value = true
  })
})
</script>
