/*-------------------------------------------------------
-------------------------------------------
* * 时间：2024年03月14日 17:45:33
* * 作者：Popillon
* * 说明：基于maplibre的网格订正
-------------------------------------------
-------------------------------------------------------*/
import maplibregl, { GeoJSONSource, GeoJSONSourceSpecification, Map, MapMouseEvent } from 'maplibre-gl'
import { Bezier } from '../bezier-js/bezier.js'
import * as turf from '@turf/turf'
import { addPointLayer, addLineLayer, addFillLayer } from '../common/useAddLayer'
import { isSelfIntersection } from '../common/useIntersect'

export default function (map: Map, callback: Function) {
  let type = 'free' //量算类型目前支持 polygon、free、brush
  let uuid = '' //图层随机id
  let layersId: string[] = [] //暂存的id
  let sourceId: string[] = [] //暂存的id
  let options: any = {} //参数选项,可以设置颜色,线条,大小等。
  let isDraw = false //绘制状态，是否正在绘制
  let isNew = true //判断是否绘制完一次
  let smooth = false //平滑处理
  let showLayer = true
  let point: any[] = [] //平面坐标 用于转换贝塞尔曲线

  let rectSize = 50000 //1000=1KM
  let startBrush = false
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
  //节流
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

  const startDraw = (op: any) => {
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    clearBrush()
    clearJson()
    if (isDraw) {
      isNew = true
      disableMap(false)
    }
    isDraw = true
    type = op.type || 'point'
    smooth = op.smooth || false
    rectSize = op.rectSize || 20000
    options = op
    showLayer = op.showLayer //网格订正不显示layer
    json_line.properties = op
    json_polygon.properties = op
    switch (type) {
      case 'point':
        // addUUID()
        // clearJson()
        // map.addSource(uuid, { type: 'geojson', data: json_point })
        // addPointLayer(map, uuid, uuid, options)
        break
      //刷 默认添加矩形
      case 'brush':
        addEventListener()
        // addUUID()
        // clearJson()
        // map.addSource(uuid, { type: 'geojson', data: json_point })
        // addPointLayer(map, uuid, uuid, options)
        break
      default:
        break
    }
    map.on('click', mapClick)
    map.getCanvas().style.cursor = type == 'brush'? 'move' :'crosshair'
  }
  //---------------------------面---------------------------//
  const drawPolygon = (e: MapMouseEvent & Object) => {
    if (isNew) {
      addUUID()
      clearJson()
      map.addSource(uuid, { type: 'geojson', data: json_polygon })
      addFillLayer(map, uuid, uuid)
      addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
      addPointLayer(map, uuid + 'point', uuid)
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
      addFillLayer(map, uuid, uuid, options)
      addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
      isNew = false
      json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
      const source = map.getSource(uuid) as GeoJSONSource
      source.setData(json_polygon)
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
      disableMap(true)
    }
  }
  //---------------------------刷---------------------------//
  /*
  ---开刷思路--- 
  1、开启事件监听 
  2、鼠标进入地图添加矩形 
  3、矩形联动鼠标 
  4、按住左右键开刷，设置节流获取矩形
  5、松开左右键，停止获取矩形
  6、鼠标离开地图清理source和layer
  */
  //开启事件
  const addEventListener = () => {
    map.on('mousedown', onMouseDown)
    map.on('mouseup', onMouseUp)
    map.on('mousemove', redrawBrush)
    map.on('mouseover', onMouseover)
    map.on('mouseout', onMouseout)
  }
  //添加矩形layer
  const addBrush = () => {
    addUUID()
    clearJson()
    map.addSource(uuid, { type: 'geojson', data: json_polygon })
    addFillLayer(map, uuid, uuid)
    addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
  }
  // 生成矩形
  const createRectangle = (center: maplibregl.LngLat, size: number) => {
    const centerPoint = turf.point([center.lng, center.lat])
    // 计算矩形的半径（单位为度）
    const radius = size / 2 / 111320 // 1度经度大约等于111320米
    const bbox = turf.bbox(turf.circle(centerPoint, radius, { units: 'degrees' }))
    const rectangle = turf.bboxPolygon(bbox)
    return rectangle
  }
  //刷新矩形位置
  const refresh = (center: maplibregl.LngLat, size: number) => {
    const rectangle = createRectangle(center, size)
    // const rectangle = createRectangle({ lng: 103.13762438973936, lat: 33.832285447084274 } as any, 50000) //17.79537816047815, 58.37294405111962
    json_polygon.geometry = rectangle.geometry
    const source = map.getSource(uuid) as GeoJSONSource
    source.setData(json_polygon)
  }
  //开刷 获取json
  const getBrushData = () => {
    const id = uuid
    const source = map.getSource(id) as GeoJSONSource
    const data = source.serialize().data
    if (callback) {
      callback(data)
    }
    // console.log(data)
    // return features
    // console.log(13)
  }
  //清除事件
  const clearBrush = () => {
    map.off('mousedown', onMouseDown)
    map.off('mouseup', onMouseUp)
    map.off('mousemove', redrawBrush)
    map.off('mouseover', onMouseover)
    map.off('mouseout', onMouseout)
    // if (map.getLayer(uuid)) map.removeLayer(uuid)
    // if (map.getLayer(uuid + 'outline')) map.removeLayer(uuid + 'outline')
    // if (map.getSource(uuid)) map.removeSource(uuid)
  }

  // //---------------------------圆---------------------------//
  // const drawCircle = (e: MapMouseEvent & Object) => {
  //   if (isNew) {
  //     addUUID()
  //     clearJson()
  //     map.addSource(uuid, { type: 'geojson', data: json_polygon })
  //     map.addSource(uuid + 'area', { type: 'geojson', data: json_area })
  //     map.addSource(uuid + 'point', { type: 'geojson', data: json_point })
  //     addFillLayer(map, uuid, uuid, options)
  //     addLineLayer(map, uuid + 'outline', uuid, { 'line-color': 'black', 'line-width': 2, ...options })
  //     addPointLayer(map, uuid + 'point', uuid + 'point')
  //     addTextLayer(map, uuid + 'area', uuid + 'area', { visibility: measure })
  //     isNew = false
  //     const pointFeature = {
  //       type: 'Feature',
  //       properties: {},
  //       geometry: { type: 'Point', coordinates: e.lngLat.toArray() },
  //     }
  //     json_point.features.push(turf.clone(pointFeature))
  //     json_point.features.push(turf.clone(pointFeature))
  //     json_area.geometry.coordinates = e.lngLat.toArray()
  //     const source_point = map.getSource(uuid + 'point') as GeoJSONSource
  //     source_point.setData(json_point)
  //     map.on('mousemove', throttledRedraw)
  //     map.on('contextmenu', mapClick_right)
  //     disableMap(true)
  //   }
  // }
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
      // case 'point':
      //   drawPoint(e)
      //   break
      // case 'line':
      //   drawLine(e)
      //   break
      case 'polygon':
        drawPolygon(e)
        break
      case 'free':
        drawFree(e)
        break
      // case 'circle':
      //   drawCircle(e)
      //   break
    }
  }
  const redraw = (e: MapMouseEvent & Object) => {
    // console.log(e,'e')
    switch (type) {
      // case 'line':
      //   if (json_line.geometry.coordinates.length) {
      //     if (json_line.geometry.coordinates.length == 1) {
      //       json_line.geometry.coordinates.push(e.lngLat.toArray())
      //     }
      //     json_line.geometry.coordinates[json_line.geometry.coordinates.length - 1] = e.lngLat.toArray()
      //     const source = map.getSource(uuid) as GeoJSONSource
      //     source.setData(json_line)
      //     //--------------------------提取最后两个点计算长度----------------------------//
      //     const fromPoint = json_line.geometry.coordinates[json_line.geometry.coordinates.length - 2]
      //     const toPoint = json_line.geometry.coordinates[json_line.geometry.coordinates.length - 1]
      //     const distance = turf.distance(fromPoint, toPoint, { units: 'kilometers' }) //计算距离
      //     const midpoint = turf.midpoint(turf.point(fromPoint), turf.point(toPoint)) //提取中心点
      //     const features = json_point.features[json_point.features.length - 1]
      //     features.properties.result = turf.round(distance, 4) + 'km'
      //     features.geometry.coordinates = midpoint.geometry.coordinates
      //     const source_text = map.getSource(uuid + 'text') as GeoJSONSource
      //     source_text.setData(turf.clone(json_point))
      //   }
      //   break
      case 'polygon':
        const polygon_length = json_polygon.geometry.coordinates[0].length
        if (polygon_length) {
          if (polygon_length == 2) {
            json_polygon.geometry.coordinates[0][polygon_length - 1] = e.lngLat.toArray()
          } else {
            json_polygon.geometry.coordinates[0][polygon_length - 2] = e.lngLat.toArray()
          }
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_polygon)
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
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_polygon)
        }
        break
      // case 'circle':
      //   if (json_point.features.length) {
      //     json_point.features[1].geometry.coordinates = e.lngLat.toArray()
      //     //计算两点距离
      //     var from = turf.point(json_point.features[0].geometry.coordinates)
      //     var to = turf.point(json_point.features[1].geometry.coordinates)
      //     var radius = turf.distance(from, to, { units: 'miles' })
      //     //接受一个点，根据给定的半径（以度、弧度、英里或公里为单位）计算圆多边形，并指定精度步数。
      //     var options = { steps: 500, units: 'miles', properties: { foo: 'bar' } }
      //     var circle = turf.circle(from, radius, options)
      //     json_polygon.geometry.coordinates = circle.geometry.coordinates

      //     // 获取面积
      //     const area = turf.area(json_polygon) / 1000000 //km²
      //     json_area.properties.result = turf.round(area, 2) + 'km²'
      //     const source_point = map.getSource(uuid + 'point') as GeoJSONSource
      //     const source = map.getSource(uuid) as GeoJSONSource
      //     const source_area = map.getSource(uuid + 'area') as GeoJSONSource
      //     source_point.setData(json_point)
      //     source.setData(json_polygon)
      //     source_area.setData(json_area)
      //   }
      //   break
      default:
        break
    }
  }
  const redrawBrush = (e: MapMouseEvent & Object) => {
    refresh(e.lngLat, rectSize)
    //是否开刷 获取json
    if (startBrush) {
      throttledBrush()
    }
  }
  const throttledBrush = throttle(getBrushData, 100)
  const mapClick_right = (e: MapMouseEvent & Object) => {
    e.preventDefault()
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    isNew = true
    point.push(e.point)
    disableMap(false)
    const source = map.getSource(uuid) as GeoJSONSource
    switch (type) {
      // case 'line':
      //   if (json_line.geometry.coordinates.length) {
      //     source.setData(turf.clone(json_line))
      //   }
      //   break
      case 'polygon':
        if (json_polygon.geometry.coordinates[0].length) {
          source.setData(turf.clone(json_polygon))
        }
        if (isSelfIntersection(point)) {
          //判断是否自相交
          alert('落区自相交，请重画')
          layersId.pop()
          sourceId.pop()
          map.removeLayer(uuid)
          map.removeLayer(uuid + 'outline')
          map.removeLayer(uuid + 'point')
          return
        }
        //---------------------------是否显示layer  网格订正用---------------------------//
        if (!showLayer) {
          map.setLayoutProperty(uuid, 'visibility', 'none')
          map.setLayoutProperty(uuid + 'outline', 'visibility', 'none')
        }
        map.setLayoutProperty(uuid + 'point', 'visibility', 'none')
        //---------------------------是否平滑处理---------------------------//
        if (smooth) {
          //线性插值
          // const tension = 0.3
          // const arr = [...point, point[0]]
          // const splinePoints = generateCardinalSplinePoints(arr, tension, 50)
          // console.log(splinePoints, 'splinePoints')
          //turf 贝塞尔
          let polygon = turf.clone(json_polygon)
          const line = turf.lineString(polygon.geometry.coordinates[0])
          const curved = turf.bezierSpline(line)
          polygon.geometry.coordinates[0] = curved.geometry.coordinates
          source.setData(turf.clone(polygon))
        }
        break
      case 'free':
        if (json_polygon.geometry.coordinates[0].length) {
          source.setData(turf.clone(json_polygon))
          //判断是否自相交
          if (isSelfIntersection(point)) {
            alert('落区自相交，请重画')
            layersId.pop()
            sourceId.pop()
            map.removeLayer(uuid)
            map.removeLayer(uuid + 'outline')
            return
          }
          //---------------------------是否显示layer  网格订正用---------------------------//
          if (!showLayer) {
            map.setLayoutProperty(uuid, 'visibility', 'none')
            map.setLayoutProperty(uuid + 'outline', 'visibility', 'none')
          }
          //---------------------------是否平滑处理---------------------------//
          if (smooth) {
            const newPoints = [...point.slice(point.length / 5), ...point.slice(0, point.length / 5), point.slice(point.length / 5)[0]]
            // 将点数组分成N个子数组
            const len = newPoints.length > 10 ? 5 : 3
            const chunkSize = Math.ceil(newPoints.length / len)
            const pointChunks = []
            for (let i = 0; i < newPoints.length; i += chunkSize) {
              pointChunks.push(newPoints.slice(i, i + chunkSize))
            }
            let bezierPoints = [] as any
            pointChunks.forEach((arr) => {
              if (arr.length > 1) {
                const curve = new Bezier(arr)
                const newPoint = curve.getLUT()
                bezierPoints.push(...newPoint)
              } else {
                bezierPoints.push(...arr)
              }
            })
            json_polygon.geometry.coordinates[0].length = 0
            for (let i = 0; i < bezierPoints.length; i++) {
              const point = map.unproject(bezierPoints[i])
              json_polygon.geometry.coordinates[0].push(point.toArray())
            }
            source.setData(turf.clone(json_polygon))
          }
        }
        break
      // case 'circle':
      //   map.removeLayer(uuid + 'point')
      //   map.removeSource(uuid + 'point')
      //   break
    }
    if (callback) {
      callback(getFeaturesFromDraw())
    }
  }
  const onMouseDown = (e: MapMouseEvent & Object) => {
    console.log('start')
    map.dragPan.disable()
    map.dragRotate.disable()
    startBrush = true
    getBrushData() //点击也认定为刷
  }
  const onMouseUp = (e: MapMouseEvent & Object) => {
    console.log('stop')
    map.dragPan.enable()
    map.dragRotate.enable()
    startBrush = false
  }
  // 监听鼠标进入事件
  const onMouseover = (e: MapMouseEvent & Object) => {
    addBrush()
  }
  // 监听鼠标离开事件
  const onMouseout = (e: MapMouseEvent & Object) => {
    if (map.getLayer(uuid)) map.removeLayer(uuid)
    if (map.getLayer(uuid + 'outline')) map.removeLayer(uuid + 'outline')
    if (map.getSource(uuid)) map.removeSource(uuid)
  }
  const getFeaturesFromDraw = () => {
    const ids = layersId
    const features = [] as any
    ids.forEach((x: any) => {
      if (map.getSource(x)) {
        const source = map.getSource(x) as GeoJSONSource
        features.push(source.serialize().data)
      }
    })
    return features
  }
  const clearDraw = () => {
    layersId.forEach((i) => {
      if (map.getLayer(i)) map.removeLayer(i)
      if (map.getLayer(i + 'outline')) map.removeLayer(i + 'outline')
      if (map.getLayer(i + 'point')) map.removeLayer(i + 'point')
      if (map.getLayer(i + 'text')) map.removeLayer(i + 'text')
    })
    sourceId.forEach((i) => {
      if (map.getSource(i)) map.removeSource(i)
      if (map.getSource(i + 'point')) map.removeSource(i + 'point')
      if (map.getSource(i + 'text')) map.removeSource(i + 'text')
    })
    layersId.length = 0
    sourceId.length = 0
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    map.getCanvas().style.cursor = 'pointer'
    isDraw = false
    clearBrush()
    clearJson()
  }
  const clearJson = () => {
    point.length = 0
    json_point.features.length = 0
    json_line.geometry.coordinates.length = 0
    json_polygon.geometry.coordinates.length = 0
    json_polygon.geometry.coordinates[0] = []
    json_polygon.properties.result = ''
  }
  const throttledRedraw = throttle(redraw, 30)
  const stopDraw = () => {
    clearBrush()
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    map.getCanvas().style.cursor = 'pointer'
    disableMap(false)
  }
  //---------------------------撤销---------------------------//
  const revoke = () => {
    if (type == 'free' || type == 'polygon') {
      if (layersId.length) {
        map.removeLayer(layersId[layersId.length - 1])
        map.removeLayer(layersId[layersId.length - 1] + 'outline')
        layersId.pop()
      }
    }
  }
  //---------------------------重做---------------------------//
  const redo = () => {
    if (type == 'free' || type == 'polygon') {
      if (sourceId.length) {
        const num = layersId.length - sourceId.length
        const addId = sourceId.slice(num)
        if (num !== 0 && addId.length) {
          const source = map.getSource(addId[0]) as maplibregl.GeoJSONSource
          const data = source.serialize() as GeoJSONSourceSpecification
          const geojson = data.data.valueOf() as any
          if (!map.getLayer(addId[0])) {
            layersId.push(addId[0])
            map.addLayer({
              id: addId[0],
              type: 'fill',
              source: addId[0],
              paint: {
                'fill-color': geojson.properties.fillColor || '#ff0',
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
  }

  return { startDraw, revoke, redo, getFeaturesFromDraw, clearDraw, stopDraw }
}
