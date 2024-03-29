/*-------------------------------------------------------
-------------------------------------------
* * 时间：2024年03月14日 17:45:33
* * 作者：Popillon
* * 说明：maplibre自由绘制Bezier
-------------------------------------------
-------------------------------------------------------*/
import { GeoJSONSource, GeoJSONSourceSpecification, Map, MapMouseEvent } from 'maplibre-gl'
import { Bezier } from './bezier-js/bezier.js'
import * as turf from '@turf/turf'

export function drawFreehand(map: Map) {
  let count: number = 0
  let layersId: string[] = []
  let sourceId: string[] = []
  let isStart: Boolean = false
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
  let geojsonCenter = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: '面积' },
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
      },
    ],
  }

  const setColor = (color: string, MGValue: number) => {
    geojson.properties.fillColor = color || '#ff0'
    geojson.properties.MGValue = MGValue || 1
    fillColor = color || '#ff0'
  }
  const start = (color: string, MGValue: number) => {
    if (!isStart) {
      isStart = true
      setColor(color || '#ff0', MGValue || 1)
      map.on('click', mapClick)
      map.getCanvas().style.cursor = 'crosshair'
    }
  }
  //ev: MapMouseEvent & Object
  const mapClick = () => {
    isClick = !isClick
    if (isClick) {
      uuid = generateUUID()
      layersId.push(uuid)
      sourceId.push(uuid)
      geojson.geometry.coordinates[0].length = 0
      point.length = 0
      map.addSource(uuid, { type: 'geojson', data: geojson })
      map.addSource(uuid + 'centerPoint', { type: 'geojson', data: geojsonCenter as any })
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
          'fill-color': fillColor,
          'fill-opacity': 0.8,
          'fill-outline-color': 'black',
        },
      })
      map.addLayer({
        id: uuid + 'outline',
        type: 'line',
        source: uuid,
        paint: {
          'line-width': 2,
          'line-color': 'black',
        },
      })
      map.addLayer({
        id: uuid + 'Point',
        type: 'symbol',
        source: uuid + 'centerPoint',
        layout: {
          'text-allow-overlap': true,
          // 'icon-allow-overlap': true,
          'text-ignore-placement': true,
          // 'icon-ignore-placement': true,
          // 'text-field': '123',
          'text-field': ['get', 'name'],
          // 'text-field': '{name}',
          // 'text-anchor': 'left',
          // 'text-offset': [1, 0],
          // 'icon-image': '{code}',
          // 'icon-size': 0.5,
          'text-size': 14,
          'text-font': ['Noto Sans Regular'],
        },
        minzoom: 0,
        maxzoom: 15,
        paint: {
          'text-color': '#0084ff',
        },
      })
      map.on('mousemove', throttledRedraw)
    } else {
      map.scrollZoom.enable()
      map.dragPan.enable()
      map.doubleClickZoom.enable()
      // map.removeLayer(uuid + 'outline')
      map.off('mousemove', throttledRedraw)
      if (isSelfIntersection(point)) {
        //判断是否自相交
        alert('落区自相交，请重画')
        // alert("落区自相交，请编辑或选中删除重画");
        layersId.pop()
        sourceId.pop()
        map.removeLayer(uuid)
        map.removeLayer(uuid + 'outline')
        map.removeSource(uuid)
        return
      }
      //---------------------------转换贝塞尔---------------------------//
      const newPoints = [...point.slice(point.length / 5), ...point.slice(0, point.length / 5)]
      const curve = new Bezier(newPoints)
      const newPoint = curve.getLUT()
      newPoint.push(newPoint[0])
      geojson.geometry.coordinates[0].length = 0
      for (let i = 0; i < newPoint.length; i++) {
        const point = map.unproject(newPoint[i])
        geojson.geometry.coordinates[0].push(point.toArray())
      }
      const source = map.getSource(uuid) as GeoJSONSource
      if (source !== undefined) {
        source.setData(JSON.parse(JSON.stringify(geojson)))
      }
    }
  }
  const redraw = (e: MapMouseEvent & Object) => {
    point.push(e.point)
    if (geojson.geometry.coordinates[0].length != 1) {
      geojson.geometry.coordinates[0].pop()
    }
    geojson.geometry.coordinates[0].push(e.lngLat.toArray())
    geojson.geometry.coordinates[0].push(geojson.geometry.coordinates[0][0])

    // 获取面积
    const area = turf.area(geojson) / 1000000 //km²
    //获取中心点
    var polygon = turf.polygon(geojson.geometry.coordinates)
    // var centroid = turf.centroid(polygon)
    var centroid = turf.centerOfMass(polygon)
    // var centroid = turf.pointOnFeature(polygon)
    geojsonCenter.features[0].geometry.coordinates = centroid.geometry.coordinates
    geojsonCenter.features[0].properties.name = turf.round(area, 2).toString()

    console.log(geojsonCenter, 'geojsonCenter')
    console.log(geojson.geometry.coordinates, 'geojson.geometry.coordinates')
    console.log(centroid, 'centroid')

    const source = map.getSource(uuid) as GeoJSONSource
    const sourceCenter = map.getSource(uuid + 'centerPoint') as GeoJSONSource
    if (source !== undefined) {
      source.setData(geojson)
      sourceCenter.setData(geojsonCenter as any)
    }
  }
  const getFeatures = () => {
    const ids = sourceId.slice(0, layersId.length)
    const features = [] as any
    ids.forEach((x: any) => {
      const source = map.getSource(x) as GeoJSONSource
      features.push(source.serialize().data)
      // features.push(source._data)
    })
    return features
  }
  const clear = () => {
    layersId.forEach((i) => {
      map.removeLayer(i)
      map.removeLayer(i + 'outline')
    })
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
  //---------------------------撤销---------------------------//
  const revoke = () => {
    if (layersId.length) {
      map.removeLayer(layersId[layersId.length - 1])
      map.removeLayer(layersId[layersId.length - 1] + 'outline')
      layersId.pop()
    }
  }
  //---------------------------重做---------------------------//
  const redo = () => {
    if (sourceId.length) {
      const num = layersId.length - sourceId.length
      const addId = sourceId.slice(num)
      if (num !== 0 && addId.length) {
        const source = map.getSource(addId[0]) as maplibregl.GeoJSONSource
        let color = ''
        if (source) {
          const data = source.serialize() as GeoJSONSourceSpecification
          const geojson = data.data.valueOf() as any
          color = geojson.properties.fillColor
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
          map.addLayer({
            id: addId[0] + 'outline',
            type: 'line',
            source: addId[0],
            paint: {
              'line-width': 2,
              'line-color': 'black',
            },
          })
        }
      }
    }
  }
  //--------------------------检查自相交---------------------------//
  const isSelfIntersection = (geo: any) => {
    let result = false
    let border = geo
    let newComp = []
    let oldSize = border.length - 1
    for (let i = 0; i < oldSize; i++) {
      let item1 = border[i]
      let item2 = border[i + 1]
      if (item1.x != item2.x || item1.y != item2.y) {
        newComp.push(item1)
      }
    }
    let newSize = newComp.length - 1
    for (let i = 0; i < newSize; i++) {
      let pt1 = newComp[i]
      let pt2 = newComp[i + 1]
      for (let j = i + 2; j < newSize; j++) {
        let pt3 = newComp[j]
        let pt4 = newComp[j + 1]

        let intersection = calcIntersection(pt1, pt2, pt3, pt4)
        if (intersection == null && pt2.x == pt4.x && pt2.y == pt4.y)
          //节点重合
          intersection = { x: pt2.x, y: pt2.y }
        if (intersection != null) {
          result = true
          break
        }
      }
      if (result) {
        break
      }
    }
    return result
  }
  const calcIntersection = (a: any, b: any, c: any, d: any) => {
    var result = null
    // 三角形abc 面积的2倍
    var area_abc = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x)
    // 三角形abd 面积的2倍
    var area_abd = (a.x - d.x) * (b.y - d.y) - (a.y - d.y) * (b.x - d.x)
    // 面积符号相同则两点在线段同侧,不相交 (对点在线段上的情况,本例当作不相交处理);
    if (area_abc * area_abd >= 0) {
      return result
    }
    // 三角形cda 面积的2倍
    var area_cda = (c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x)
    // 三角形cdb 面积的2倍
    // 注意: 这里有一个小优化.不需要再用公式计算面积,而是通过已知的三个面积加减得出.
    var area_cdb = area_cda + area_abc - area_abd
    if (area_cda * area_cdb >= 0) {
      return result
    }
    //计算交点坐标
    var t = area_cda / (area_abd - area_abc)
    var dx = t * (b.x - a.x),
      dy = t * (b.y - a.y)
    result = { x: a.x + dx, y: a.y + dy }
    return result
  }

  return { isStart, start, getFeatures, clear, revoke, redo, setColor, count }
}
