<template>
  <Card style="width: 100%">
    <template #title>绘制</template>
    <template #extra></template>
    <Space>
      <Button type="info" @click="start({ type: 'point' })">点</Button>
      <Button type="info" @click="start({ type: 'line' })">线</Button>
      <Button type="info" @click="start({ type: 'polygon' })">面</Button>
      <Button type="info" @click="start({ type: 'free', compute: true, fillColor: '#f00', MGvalue: 1 })">自由</Button>
      <Button type="warning" @click="revoke">撤销（自由）</Button>
      <Button type="warning" @click="redo">重做（自由）</Button>
      <Button type="success" @click="get">获取数据（控制台）</Button>
      <Button type="error" @click="clear">清空</Button>
    </Space>
  </Card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps({
  maplibre: Object,
})
// import draw from 'draw-gs'
import draw from '../../lib/main'
console.log(draw, 'draw')
const { start, clear, revoke, redo, getFeatures } = draw(props.maplibre as any)

const get = () => {
  console.log(getFeatures())
  // console.log(JSON.stringify(getFeatures()[0]))
}
</script>

<style scoped></style>
