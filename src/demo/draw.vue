<template>
  <Card style="width: 100%">
    <template #title>量算</template>
    <template #extra></template>
    <Space>
      <Button type="info" @click="startMeasure({ type: 'point' })">点</Button>
      <Button type="info" @click="startMeasure({ type: 'line', measure: true })">线</Button>
      <Button type="info" @click="startMeasure({ type: 'polygon', measure: true })">面</Button>
      <Button type="info" @click="startMeasure({ type: 'circle', measure: true, fillColor: '#f165' })">圆</Button>
      <Button type="info" @click="startMeasure({ type: 'free', measure: true, 'line-color': '#f80' })">画</Button>
      <Button type="error" @click="clearMeasure">清空</Button>
      <Button type="error" @click="stopMeasure">停止</Button>
    </Space>
  </Card>
  <Card style="width: 100%">
    <template #title>订正</template>
    <template #extra></template>
    <Space>
      <Button type="info" @click="startDraw({ type: 'polygon', smooth: false, showLayer: true })">面</Button>
      <Button type="info" @click="startDraw({ type: 'polygon', smooth: true, showLayer: true })">面（贝塞尔）</Button>
      <Button type="info" @click="startDraw({ type: 'free', smooth: false, 'line-color': '#f19', MGvalue: 1, showLayer: true })">画</Button>
      <Button type="info" @click="startDraw({ type: 'free', smooth: true, 'line-color': '#f19', MGvalue: 1, showLayer: true })">画(贝塞尔)</Button>
      <Button type="info" @click="startDraw({ type: 'brush', fillColor: '#f165' })">刷</Button>
      <Button type="warning" @click="revoke">撤销（矢量）</Button>
      <Button type="warning" @click="redo">重做（矢量）</Button>
      <Button type="success" @click="get">获取数据（控制台）</Button>
      <Button type="error" @click="clearDraw">清空</Button>
      <Button type="error" @click="stopDraw">停止</Button>
    </Space>
  </Card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  maplibre: Object,
})
import { draw, measure } from '../../lib/main'

// 定义你的回调函数
const afterDraw = (e: any) => {
  console.log(e,'callback')
}
const { startDraw, revoke, redo, getFeaturesFromDraw, clearDraw, stopDraw } = draw(props.maplibre as any, afterDraw)
const { startMeasure, clearMeasure, stopMeasure } = measure(props.maplibre as any, afterDraw)

const get = () => {
  console.log(getFeaturesFromDraw())
}
</script>

<style scoped></style>
