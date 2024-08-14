/*-------------------------------------------------------
-------------------------------------------
* * 时间：2024年03月14日 17:45:33
* * 作者：Popillon
* * 说明：基于maplibre的量算  目前是draw类部分修改
-------------------------------------------
-------------------------------------------------------*/
import maplibregl, { GeoJSONSource, Map, MapMouseEvent } from 'maplibre-gl'
// import { Bezier } from '../bezier-js/bezier.js'
import * as turf from '@turf/turf'
import { addPointLayer, addLineLayer, addTextLayer, addFillLayer } from '../common/useAddLayer'
// import { isSelfIntersection } from '../common/useIntersect'

export default function (map: Map, callback?: Function) {
  let type = 'free' //量算类型目前支持 point、line、polygon、free、cricle
  let uuid = '' //图层随机id
  let layersId: string[] = [] //暂存的id
  let sourceId: string[] = [] //暂存的id
  let options: any = {} //参数选项,可以设置颜色,线条,大小等。
  let isDraw = false //绘制状态，是否正在绘制
  let isNew = true //判断是否绘制完一次
  let measure = true //是否计算
  let smooth = false //平滑处理
  let point: any[] = [] //平面坐标 用于转换贝塞尔曲线
  //---------------------------json数据---------------------------//
  //点
  let json_point = {
    type: 'FeatureCollection',
    features: [],
  } as any
  //线
  let json_line = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [],
    },
  } as any
  //面
  let json_polygon = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [],
    },
  } as any
  //显示 面积的
  let json_area = {
    type: 'Feature',
    properties: { result: '' },
    geometry: {
      type: 'Point',
      coordinates: [],
    },
  } as any

  const startMeasure = (op: any) => {
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    clearJson()
    if (isDraw) {
      isNew = true
      disableMap(false)
    }
    isDraw = true
    type = op.type || 'point'
    measure = op.measure || false
    smooth = op.smooth || false
    options = op
    json_line.properties = op
    json_polygon.properties = op
    json_area.properties = op
    switch (type) {
      case 'point':
        addUUID()
        clearJson()
        map.addSource(uuid, { type: 'geojson', data: json_point })
        addPointLayer(map, uuid, uuid, options)
        break
      default:
        break
    }
    map.on('click', mapClick)
    map.getCanvas().style.cursor = 'crosshair'
  }
  //---------------------------点---------------------------//
  const drawPoint = (e: MapMouseEvent & Object) => {
    json_point.features.push({
      type: 'Feature',
      properties: options,
      geometry: { type: 'Point', coordinates: e.lngLat.toArray() },
    })
    const source = map.getSource(uuid) as GeoJSONSource
    source.setData(turf.clone(json_point))
  }
  //---------------------------线---------------------------//
  const drawLine = (e: MapMouseEvent & Object) => {
    if (isNew) {
      addUUID()
      clearJson()
      map.addSource(uuid, { type: 'geojson', data: json_line })
      map.addSource(uuid + 'text', { type: 'geojson', data: json_point })
      addLineLayer(map, uuid, uuid)
      addPointLayer(map, uuid + 'point', uuid, options)
      addTextLayer(map, uuid + 'text', uuid + 'text', { visibility: measure })
      isNew = false
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
    }
    json_line.geometry.coordinates.push(e.lngLat.toArray())
    const source = map.getSource(uuid) as GeoJSONSource
    source.setData(json_line)
    //提取最后两个点计算长度
    json_point.features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: e.lngLat.toArray() },
    })
    const source_text = map.getSource(uuid + 'text') as GeoJSONSource
    source_text.setData(json_point as any)
  }
  //---------------------------面---------------------------//
  const drawPolygon = (e: MapMouseEvent & Object) => {
    if (isNew) {
      addUUID()
      clearJson()
      map.addSource(uuid, { type: 'geojson', data: json_polygon })
      map.addSource(uuid + 'area', { type: 'geojson', data: json_area })
      addFillLayer(map, uuid, uuid)
      addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
      addPointLayer(map, uuid + 'point', uuid)
      addTextLayer(map, uuid + 'area', uuid + 'area', { visibility: measure })
      isNew = false
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
    }
    if (json_polygon.geometry.coordinates[0].length >= 3) {
      json_polygon.geometry.coordinates[0].pop()
    }
    json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
    json_polygon.geometry.coordinates[0].push(json_polygon.geometry.coordinates[0][0])
    point.push(e.point)
    const source = map.getSource(uuid) as GeoJSONSource
    source.setData(json_polygon)
    disableMap(true)
  }
  //---------------------------自由---------------------------//
  const drawFree = (e: MapMouseEvent & Object) => {
    if (isNew) {
      addUUID()
      clearJson()
      map.addSource(uuid, { type: 'geojson', data: json_polygon })
      map.addSource(uuid + 'area', { type: 'geojson', data: json_area })
      addFillLayer(map, uuid, uuid, options)
      addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
      addTextLayer(map, uuid + 'area', uuid + 'area', { visibility: measure })
      isNew = false
      json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
      const source = map.getSource(uuid) as GeoJSONSource
      source.setData(json_polygon)
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
      disableMap(true)
    }
  }
  //---------------------------圆---------------------------//
  const drawCircle = (e: MapMouseEvent & Object) => {
    if (isNew) {
      addUUID()
      clearJson()
      map.addSource(uuid, { type: 'geojson', data: json_polygon })
      map.addSource(uuid + 'area', { type: 'geojson', data: json_area })
      map.addSource(uuid + 'point', { type: 'geojson', data: json_point })
      addFillLayer(map, uuid, uuid, options)
      addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
      addPointLayer(map, uuid + 'point', uuid + 'point')
      addTextLayer(map, uuid + 'area', uuid + 'area', { visibility: measure })
      isNew = false
      const pointFeature = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: e.lngLat.toArray() },
      }
      json_point.features.push(turf.clone(pointFeature))
      json_point.features.push(turf.clone(pointFeature))
      json_area.geometry.coordinates = e.lngLat.toArray()
      const source_point = map.getSource(uuid + 'point') as GeoJSONSource
      source_point.setData(json_point)
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
      disableMap(true)
    }
  }
  //生成随机uuid
  const addUUID = () => {
    uuid = generateUUID()
    layersId.push(uuid)
    sourceId.push(uuid)
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
  //禁用地图移动选择缩放
  const disableMap = (state: Boolean) => {
    //设置dragRotate 会默认右键事件
    const interactions = ['scrollZoom', 'boxZoom', 'dragPan', 'keyboard', 'doubleClickZoom', 'touchZoomRotate']
    // const interactions = ['scrollZoom', 'boxZoom', 'dragRotate', 'dragPan', 'keyboard', 'doubleClickZoom', 'touchZoomRotate']
    interactions.forEach((item) => {
      if (state) {
        map[item as keyof maplibregl.Map].disable()
      } else {
        map[item as keyof maplibregl.Map].enable()
      }
    })
  }
  const mapClick = (e: MapMouseEvent & Object) => {
    switch (type) {
      case 'point':
        drawPoint(e)
        break
      case 'line':
        drawLine(e)
        break
      case 'polygon':
        drawPolygon(e)
        break
      case 'free':
        drawFree(e)
        break
      case 'circle':
        drawCircle(e)
        break
    }
  }
  const redraw = (e: MapMouseEvent & Object) => {
    switch (type) {
      case 'line':
        if (json_line.geometry.coordinates.length) {
          if (json_line.geometry.coordinates.length == 1) {
            json_line.geometry.coordinates.push(e.lngLat.toArray())
          }
          json_line.geometry.coordinates[json_line.geometry.coordinates.length - 1] = e.lngLat.toArray()
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_line)
          //--------------------------提取最后两个点计算长度----------------------------//
          const fromPoint = json_line.geometry.coordinates[json_line.geometry.coordinates.length - 2]
          const toPoint = json_line.geometry.coordinates[json_line.geometry.coordinates.length - 1]
          const distance = turf.distance(fromPoint, toPoint, { units: 'kilometers' }) //计算距离
          const midpoint = turf.midpoint(turf.point(fromPoint), turf.point(toPoint)) //提取中心点
          const features = json_point.features[json_point.features.length - 1]
          features.properties.result = turf.round(distance, 4) + 'km'
          features.geometry.coordinates = midpoint.geometry.coordinates
          const source_text = map.getSource(uuid + 'text') as GeoJSONSource
          source_text.setData(turf.clone(json_point))
        }
        break
      case 'polygon':
        const polygon_length = json_polygon.geometry.coordinates[0].length
        if (polygon_length) {
          if (polygon_length == 2) {
            json_polygon.geometry.coordinates[0][polygon_length - 1] = e.lngLat.toArray()
          } else {
            json_polygon.geometry.coordinates[0][polygon_length - 2] = e.lngLat.toArray()
          }
          // 获取面积
          const area = turf.area(json_polygon) / 1000000 //km²
          //获取中心点
          if (polygon_length >= 4) {
            var polygon = turf.polygon(json_polygon.geometry.coordinates)
            var centroid = turf.centerOfMass(polygon)
            json_area.geometry.coordinates = centroid.geometry.coordinates
            json_area.properties.result = turf.round(area, 2) + 'km²'
          }
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_polygon)
          const source2 = map.getSource(uuid + 'area') as GeoJSONSource
          source2.setData(json_area)
        }
        break
      case 'free':
        const free_length = json_polygon.geometry.coordinates[0].length
        if (free_length) {
          point.push(e.point)
          if (json_polygon.geometry.coordinates[0].length != 1) {
            json_polygon.geometry.coordinates[0].pop()
          }
          json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
          json_polygon.geometry.coordinates[0].push(json_polygon.geometry.coordinates[0][0])
          // 获取面积
          const area = turf.area(json_polygon) / 1000000 //km²
          // //获取中心点
          if (free_length >= 4) {
            var polygon = turf.polygon(json_polygon.geometry.coordinates)
            var centroid = turf.centerOfMass(polygon)
            json_area.geometry.coordinates = centroid.geometry.coordinates
            json_area.properties.result = turf.round(area, 2) + 'km²'
          }
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_polygon)
          const source2 = map.getSource(uuid + 'area') as GeoJSONSource
          source2.setData(json_area)
        }
        break
      case 'circle':
        if (json_point.features.length) {
          json_point.features[1].geometry.coordinates = e.lngLat.toArray()
          //计算两点距离
          var from = turf.point(json_point.features[0].geometry.coordinates)
          var to = turf.point(json_point.features[1].geometry.coordinates)
          var radius = turf.distance(from, to, { units: 'miles' })
          //接受一个点，根据给定的半径（以度、弧度、英里或公里为单位）计算圆多边形，并指定精度步数。
          var options = { steps: 500, units: 'miles', properties: { foo: 'bar' } }
          var circle = turf.circle(from, radius, options)
          json_polygon.geometry.coordinates = circle.geometry.coordinates

          // 获取面积
          const area = turf.area(json_polygon) / 1000000 //km²
          json_area.properties.result = turf.round(area, 2) + 'km²'
          const source_point = map.getSource(uuid + 'point') as GeoJSONSource
          const source = map.getSource(uuid) as GeoJSONSource
          const source_area = map.getSource(uuid + 'area') as GeoJSONSource
          source_point.setData(json_point)
          source.setData(json_polygon)
          source_area.setData(json_area)
        }
        break
      default:
        break
    }
  }
  const mapClick_right = (e: MapMouseEvent & Object) => {
    e.preventDefault()
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    isNew = true
    point.push(e.point)
    disableMap(false)
    const source = map.getSource(uuid) as GeoJSONSource
    switch (type) {
      case 'line':
        if (json_line.geometry.coordinates.length) {
          source.setData(turf.clone(json_line))
        }
        break
      case 'polygon':
        if (json_polygon.geometry.coordinates[0].length) {
          source.setData(turf.clone(json_polygon))
        }
        // if (isSelfIntersection(point)) {
        //   //判断是否自相交
        //   alert('落区自相交，请重画')
        //   layersId.pop()
        //   sourceId.pop()
        //   map.removeLayer(uuid)
        //   map.removeLayer(uuid + 'outline')
        //   map.removeLayer(uuid + 'point')
        //   map.removeLayer(uuid + 'area')
        //   return
        // }
        map.setLayoutProperty(uuid + 'point', 'visibility', 'none')
        //---------------------------是否平滑处理---------------------------//
        // if (smooth) {
        //   //线性插值
        //   // const tension = 0.3
        //   // const arr = [...point, point[0]]
        //   // const splinePoints = generateCardinalSplinePoints(arr, tension, 50)
        //   // console.log(splinePoints, 'splinePoints')
        //   //turf 贝塞尔
        //   let polygon = turf.clone(json_polygon)
        //   const line = turf.lineString(polygon.geometry.coordinates[0])
        //   const curved = turf.bezierSpline(line)
        //   polygon.geometry.coordinates[0] = curved.geometry.coordinates
        //   source.setData(turf.clone(polygon))
        //   //更新面积
        //   const area = turf.area(polygon) / 1000000 //km²
        //   polygon.properties.result = turf.round(area, 2) + 'km²'
        //   const sourcearea = map.getSource(uuid + 'area') as GeoJSONSource
        //   sourcearea.setData(turf.clone(polygon))
        // }
        break
      case 'free':
        if (json_polygon.geometry.coordinates[0].length) {
          source.setData(turf.clone(json_polygon))
          // //判断是否自相交
          // if (isSelfIntersection(point)) {
          //   alert('落区自相交，请重画')
          //   layersId.pop()
          //   sourceId.pop()
          //   map.removeLayer(uuid)
          //   map.removeLayer(uuid + 'outline')
          //   map.removeLayer(uuid + 'area')
          //   return
          // }
          //---------------------------是否平滑处理---------------------------//
          // if (smooth) {
          //   const newPoints = [...point.slice(point.length / 5), ...point.slice(0, point.length / 5), point.slice(point.length / 5)[0]]
          //   // 将点数组分成N个子数组
          //   const len = newPoints.length > 10 ? 5 : 3
          //   const chunkSize = Math.ceil(newPoints.length / len)
          //   const pointChunks = []
          //   for (let i = 0; i < newPoints.length; i += chunkSize) {
          //     pointChunks.push(newPoints.slice(i, i + chunkSize))
          //   }
          //   let bezierPoints = [] as any
          //   pointChunks.forEach((arr) => {
          //     if (arr.length > 1) {
          //       const curve = new Bezier(arr)
          //       const newPoint = curve.getLUT()
          //       bezierPoints.push(...newPoint)
          //     } else {
          //       bezierPoints.push(...arr)
          //     }
          //   })
          //   json_polygon.geometry.coordinates[0].length = 0
          //   for (let i = 0; i < bezierPoints.length; i++) {
          //     const point = map.unproject(bezierPoints[i])
          //     json_polygon.geometry.coordinates[0].push(point.toArray())
          //   }
          //   source.setData(turf.clone(json_polygon))
          //   //更新面积
          //   const area = turf.area(json_polygon) / 1000000 //km²
          //   json_area.properties.reas = turf.round(area, 2) + 'km²'
          //   const sourcearea = map.getSource(uuid + 'area') as GeoJSONSource
          //   sourcearea.setData(turf.clone(json_area))
          // }
        }
        break
      case 'circle':
        map.removeLayer(uuid + 'point')
        map.removeSource(uuid + 'point')
        break
    }
    if (callback) {
      callback(getFeatures())
    }
  }
  const getFeatures = () => {
    const ids = layersId
    const features = [] as any
    ids.forEach((x: any) => {
      const source = map.getSource(x) as GeoJSONSource
      features.push(source.serialize().data)
    })
    return features
  }
  const clearMeasure = () => {
    layersId.forEach((i) => {
      map.removeLayer(i)
      if (map.getLayer(i + 'outline')) map.removeLayer(i + 'outline')
      if (map.getLayer(i + 'point')) map.removeLayer(i + 'point')
      if (map.getLayer(i + 'area')) map.removeLayer(i + 'area')
      if (map.getLayer(i + 'text')) map.removeLayer(i + 'text')
    })
    sourceId.forEach((i) => {
      map.removeSource(i)
      if (map.getSource(i + 'point')) map.removeSource(i + 'point')
      if (map.getSource(i + 'text')) map.removeSource(i + 'text')
      if (map.getSource(i + 'area')) map.removeSource(i + 'area')
    })
    layersId.length = 0
    sourceId.length = 0
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    map.getCanvas().style.cursor = 'pointer'
    isDraw = false
    clearJson()
  }
  const stopMeasure = () => {
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    map.getCanvas().style.cursor = 'pointer'
    disableMap(false)
  }
  const clearJson = () => {
    point.length = 0
    json_point.features.length = 0
    json_line.geometry.coordinates.length = 0
    json_polygon.geometry.coordinates.length = 0
    json_polygon.geometry.coordinates[0] = []
    json_polygon.properties.result = ''
    json_area.geometry.coordinates.length = 0
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
  const throttledRedraw = throttle(redraw, 30)

  return { startMeasure, clearMeasure, stopMeasure }
}
