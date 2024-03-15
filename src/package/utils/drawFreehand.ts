/*-------------------------------------------------------
-------------------------------------------
* * 时间：2024年03月14日 17:45:33
* * 作者：Popillon
* * 说明：maplibre自由绘制Bezier
-------------------------------------------
-------------------------------------------------------*/
import { Bezier } from './bezier-js/bezier.js'
const drawFreehand = function (this: any, map) {
  console.log(Bezier, 'BezierBezierBezier')
  this.map = map
  this.layersId = []
  this.sourceId = []
  this.isStart = false
  this.isClick = false
  this.point = []
  this.uuid = ''
  this.fillColor = ''
  this.MGValue = 1
  this.geojson = {
    type: 'Feature',
    properties: {
      fillColor: '',
      MGValue: 1,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[]],
    },
  }
  this.throttledDrawLine = this.throttle(this.redraw.bind(this), 20)
  this.mapClick = this.mapClick.bind(this)
}
drawFreehand.prototype.start = function (color, MGValue) {
  this.isStart = true
  this.setColor(color, MGValue)
  this.map.on('click', this.mapClick)
  this.map.getCanvas().style.cursor = 'crosshair'
}
drawFreehand.prototype.setColor = function (color, MGValue) {
  this.geojson.properties.fillColor = color
  this.geojson.properties.MGValue = MGValue
  this.fillColor = color
  this.MGValue = MGValue
}
drawFreehand.prototype.revoke = function () {
  if (this.layersId.length) {
    this.map.removeLayer(this.layersId[this.layersId.length - 1])
    this.layersId.pop()
  }
}
drawFreehand.prototype.redo = function () {
  if (this.sourceId.length) {
    const num = this.layersId.length - this.sourceId.length
    const addId = this.sourceId.slice(num)
    if (num !== 0 && addId.length) {
      const color = this.map.getSource(addId[0])._data.properties.fillColor
      if (!this.map.getLayer(addId[0])) {
        this.layersId.push(addId[0])
        this.map.addLayer({
          id: addId[0],
          type: 'fill',
          source: addId[0],
          paint: {
            'fill-color': color,
            'fill-opacity': 0.8,
            'fill-outline-color': 'black',
          },
        })
      }
    }
  }
}
drawFreehand.prototype.getFeatures = function () {
  const ids = this.sourceId.slice(0, this.layersId.length)
  const features = [] as any
  ids.forEach((x) => {
    features.push(this.map.getSource(x)._data)
  })
  return features
}
drawFreehand.prototype.clear = function () {
  this.layersId.forEach((e) => this.map.removeLayer(e))
  this.sourceId.forEach((e) => this.map.removeSource(e))
  this.layersId.length = 0
  this.sourceId.length = 0
  this.map.off('click', this.mapClick)
  this.map.getCanvas().style.cursor = 'pointer'
  this.isStart = false
}
drawFreehand.prototype.mapClick = function () {
  this.isClick = !this.isClick
  if (this.isClick) {
    this.uuid = this.generateUUID()
    this.layersId.push(this.uuid)
    this.sourceId.push(this.uuid)
    this.geojson.geometry.coordinates[0].length = 0
    this.point.length = 0
    this.map.addSource(this.uuid, { type: 'geojson', data: this.geojson })
    this.map.scrollZoom.disable()
    this.map.dragPan.disable()
    this.map.doubleClickZoom.disable()
    // addLayer
    this.map.addLayer({
      id: this.uuid,
      type: 'fill',
      source: this.uuid,
      paint: {
        'fill-antialias': true,
        'fill-color': this.fillColor ? this.fillColor : '#ffffff',
        'fill-opacity': 0.8,
        'fill-outline-color': 'black',
      },
    })
    this.map.addLayer({
      id: 'draw' + this.uuid,
      type: 'line',
      source: this.uuid,
      paint: {
        'line-width': 2,
        'line-color': 'black',
      },
    })
    this.map.on('mousemove', this.throttledDrawLine)
  } else {
    this.map.scrollZoom.enable()
    this.map.dragPan.enable()
    this.map.doubleClickZoom.enable()
    this.map.removeLayer('draw' + this.uuid)
    this.map.off('mousemove', this.throttledDrawLine)
    const newPoints = [...this.point.slice(this.point.length / 5), ...this.point.slice(0, this.point.length / 5)]
    const curve = new Bezier(newPoints)
    const newPoint = curve.getLUT(100)
    this.geojson.geometry.coordinates[0].length = 0
    for (let i = 0; i < newPoint.length; i++) {
      const point = this.map.unproject(newPoint[i])
      this.geojson.geometry.coordinates[0].push(point.toArray())
    }
    this.map.getSource(this.uuid).setData(JSON.parse(JSON.stringify(this.geojson)))
    this.getFeatures()
  }
}
drawFreehand.prototype.redraw = function (e) {
  this.point.push(e.point)
  this.geojson.geometry.coordinates[0].push(e.lngLat.toArray())
  this.map.getSource(this.uuid).setData(this.geojson)
}
drawFreehand.prototype.throttle = function (func, delay) {
  let lastCall = 0
  return function (...args) {
    const now = new Date().getTime()
    if (now - lastCall < delay) {
      return
    }
    lastCall = now
    func(...args)
  }
}
drawFreehand.prototype.generateUUID = function () {
  let dt = new Date().getTime()
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (dt + Math.random() * 16) % 16 | 0
    dt = Math.floor(dt / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
  return uuid
}

export default drawFreehand
