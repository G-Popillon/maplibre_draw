/*-------------------------------------------------------
-------------------------------------------
* * 时间：2024年03月14日 17:45:33
* * 作者：Popillon
* * 说明：maplibre自由绘制Bezier
-------------------------------------------
-------------------------------------------------------*/
import { GeoJSONSource, Map, MapMouseEvent } from 'maplibre-gl'
import { Bezier } from './bezier-js/bezier.js'

export default function drawFreehand(map: Map) {
  let layersId: string[] = []
  let sourceId: string[] = []
  let isStart = false
  let isClick = false
  let point: any[] = []
  let uuid = ''
  let fillColor = ''
  let geojson: {
    type: 'Feature'
    properties: {
      fillColor: string
      MGValue: number
    }
    geometry: {
      type: 'Polygon'
      coordinates: any[][]
    }
  } = {
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

  const setColor = (color: string, MGValue: number) => {
    geojson.properties.fillColor = color
    geojson.properties.MGValue = MGValue
    fillColor = color
  }
  const start = (color: string, MGValue: number) => {
    isStart = true
    setColor(color, MGValue)
    map.on('click', mapClick)
    map.getCanvas().style.cursor = 'crosshair'
  }
  //ev: MapMouseEvent & Object
  const mapClick = () => {
    isClick = !isClick
    if (isClick) {
      uuid = generateUUID()
      layersId.push(uuid as any)
      sourceId.push(uuid as any)
      geojson.geometry.coordinates[0].length = 0
      point.length = 0
      map.addSource(uuid, { type: 'geojson', data: geojson })
      map.scrollZoom.disable()
      map.dragPan.disable()
      map.doubleClickZoom.disable()
      // addLayer
      map.addLayer({
        id: uuid,
        type: 'fill',
        source: uuid,
        paint: {
          'fill-antialias': true,
          'fill-color': fillColor ? fillColor : '#ffffff',
          'fill-opacity': 0.8,
          'fill-outline-color': 'black',
        },
      })
      map.addLayer({
        id: 'draw' + uuid,
        type: 'line',
        source: uuid,
        paint: {
          'line-width': 2,
          'line-color': 'black',
        },
      })
      map.on('mousemove', throttledRedraw)
    } else {
      map.scrollZoom.enable()
      map.dragPan.enable()
      map.doubleClickZoom.enable()
      map.removeLayer('draw' + uuid)
      map.off('mousemove', throttledRedraw)
      const newPoints = [...point.slice(point.length / 5), ...point.slice(0, point.length / 5)]
      const curve = new Bezier(newPoints)
      const newPoint = curve.getLUT(100)
      geojson.geometry.coordinates[0].length = 0
      for (let i = 0; i < newPoint.length; i++) {
        const point = map.unproject(newPoint[i])
        geojson.geometry.coordinates[0].push(point.toArray())
      }
      const source = map.getSource(uuid) as GeoJSONSource
      if (source !== undefined) {
        source.setData(JSON.parse(JSON.stringify(geojson)))
      }
      // getFeatures()
    }
  }
  const redraw = (e: MapMouseEvent & Object) => {
    point.push(e.point)
    geojson.geometry.coordinates[0].push(e.lngLat.toArray())
    const source = map.getSource(uuid) as GeoJSONSource

    if (source !== undefined) {
      source.setData(geojson)
    }
  }
  const getFeatures = () => {
    const ids = sourceId.slice(0, layersId.length)
    const features = [] as any
    ids.forEach((x: any) => {
      const source = map.getSource(x) as GeoJSONSource
      features.push(source.serialize())
      // features.push(source._data)
    })
    return features
  }
  const clear = () => {
    layersId.forEach((i) => map.removeLayer(i))
    sourceId.forEach((i) => map.removeSource(i))
    layersId.length = 0
    sourceId.length = 0
    map.off('click', mapClick)
    map.getCanvas().style.cursor = 'pointer'
    isStart = false
  }
  const generateUUID = () => {
    let dt = new Date().getTime()
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (dt + Math.random() * 16) % 16 | 0
      dt = Math.floor(dt / 16)
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
    return uuid
  }
  const throttle = (func: (...args: any[]) => void, delay: number) => {
    let lastCall = 0
    return function (...args: any[]) {
      const now = new Date().getTime()
      if (now - lastCall < delay) {
        return
      }
      lastCall = now
      func(...args)
    }
  }
  const throttledRedraw = throttle(redraw, 20)
  const revoke = () => {
    if (layersId.length) {
      map.removeLayer(layersId[layersId.length - 1])
      layersId.pop()
    }
  }
  const redo = () => {
    if (sourceId.length) {
      const num = layersId.length - sourceId.length
      const addId = sourceId.slice(num)
      if (num !== 0 && addId.length) {
        const source = map.getSource(addId[0]) as maplibregl.GeoJSONSource | undefined
        let color = ''
        if (source) {
          const data = source._data as GeoJSON.FeatureCollection
          if (data && data.features && data.features.length > 0) {
            const properties = data.features[0].properties
            if (properties && 'fillColor' in properties) {
              color = properties.fillColor
            }
          }
        }
        if (!map.getLayer(addId[0])) {
          layersId.push(addId[0])
          map.addLayer({
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

  return { isStart, start, getFeatures, clear, revoke, redo }
}
