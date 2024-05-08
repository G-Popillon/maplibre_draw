<template>
  <Card style="width: 100%">
    <template #title>绘制</template>
    <template #extra></template>
    <Space>
      <Button type="info" @click="start({ type: 'point' })">点</Button>
      <Button type="info" @click="start({ type: 'line' })">线</Button>
      <Button type="info" @click="start({ type: 'polygon' })">面</Button>
      <Button type="info" @click="start({ type: 'free', compute: true, fillColor: '#f00', MGvalue: 1 })">自由1</Button>
      <Button type="info" @click="start({ type: 'free', compute: true, fillColor: '#f09', MGvalue: 2 })">自由2</Button>
      <Button type="info" @click="start({ type: 'free', compute: true, fillColor: '#f80', MGvalue: 3 })">自由3</Button>
      <Button type="info" @click="start({ type: 'circle', compute: true, fillColor: '#f165' })">圆</Button>
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
import { draw } from '../../lib/main'

// 定义你的回调函数
const afterDraw = (e: any) => {
  console.log(e)
}
const { start, clear, revoke, redo, getFeatures } = draw(props.maplibre as any, afterDraw)

const get = () => {
  console.log(getFeatures())
}
</script>

<style scoped></style>
