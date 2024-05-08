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

const tk = '436ce7e50d27eede2f2929307e6b33c0'
const style = {
  version: 8,
  name: 'vectorLayer',
  metadata: {
    // 'maputnik:license': 'https://github.com/maputnik/osm-liberty/blob/gh-pages/LICENSE.md',
    // 'maputnik:renderer': 'mbgljs',
    // 'openmaptiles:version': '3.x',
  },
  sources: {
    // vec_w: {
    //   type: 'raster',
    //   tiles: Array.from({ length: 8 }, (_, index) => `https://t${index}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${tk}`),
    //   tileSize: 256,
    //   maxzoom: 14,
    // },
  },
  // sprite: 'https://maputnik.github.io/osm-liberty/sprites/osm-liberty',
  glyphs: 'https://dps.cloudtao.com.cn/public/font/glyphs/{fontstack}/{range}.pbf',
  layers: [
    // {
    //   id: '矢量底图',
    //   type: 'raster',
    //   source: 'vec_w',
    //   layout: {
    //     visibility: 'none',
    //   },
    // },
  ],
}
const baseLayers = [
  {
    label: '矢量底图',
    id: 'vec_w',
    tiles: Array.from({ length: 8 }, (_, index) => `https://t${index}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${tk}`),
  },
  {
    label: '影像底图',
    id: 'img_w',
    tiles: Array.from({ length: 8 }, (_, index) => `https://t${index}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${tk}`),
  },
  {
    label: '地形渲染',
    id: 'ter_w',
    tiles: Array.from({ length: 8 }, (_, index) => `https://t${index}.tianditu.gov.cn/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=${tk}`),
  },
]

onMounted(() => {
  const map = new maplibregl.Map({
    container: 'map',
    zoom: 12,
    center: [11.39085, 47.27574],
    pitch: 52,
    hash: true,
    style: style as any,
    // style: 'https://demotiles.maplibre.org/style.json',
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

  map.on('load', function () {
    maplibre.value = map
    isReady.value = true
    const { id, tiles } = baseLayers[0]
    map.addLayer({
      id,
      type: 'raster',
      source: {
        type: 'raster',
        tiles,
        tileSize: 256,
        maxzoom: 14,
      },
    })
  })
})
</script>
