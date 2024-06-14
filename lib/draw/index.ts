/*-------------------------------------------------------
-------------------------------------------
* * 时间：2024年03月14日 17:45:33
* * 作者：Popillon
* * 说明：基于maplibre的部分绘制功能和面积、距离计算
-------------------------------------------
-------------------------------------------------------*/
import { GeoJSONSource, GeoJSONSourceSpecification, Map, MapMouseEvent } from 'maplibre-gl'
import { Bezier } from '../bezier-js/bezier.js'
import * as turf from '@turf/turf'

export default function (map: Map, callback: Function) {
  let type = 'free' //绘制的类型目前支持 point、line、polygon、free、cricle
  let uuid = '' //图层随机id
  let layersId: string[] = [] //暂存的id
  let sourceId: string[] = [] //暂存的id
  let options: any = {} //参数选项,可以设置颜色,线条,大小等。
  //状态
  let isDraw = false //绘制状态，是否正在绘制
  let isNew = true //判断是否绘制完一次
  let compute = false
  let smooth = false //平滑处理
  let showLayer = true
  //平面坐标
  let point: any[] = [] //用于转换贝塞尔曲线的数组
  //---------------------------json数据---------------------------//
  //点
  let json_point = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0], // 初始坐标
        },
        properties: {},
      },
    ],
  }
  //线
  let json_line = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [] as any,
    },
  }
  //面
  let json_polygon = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [] as any,
    },
  }
  //显示 面积的
  let json_area = {
    type: 'Feature',
    properties: { area: '' },
    geometry: {
      type: 'Point',
      coordinates: [],
    },
  }

  const start = (op: any) => {
    map.off('click', mapClick)
    map.off('mousemove', throttledRedraw)
    map.off('contextmenu', mapClick_right)
    clearJson()
    if (isDraw) {
      isNew = true
      map.scrollZoom.enable()
      map.dragPan.enable()
      map.doubleClickZoom.enable()
    }
    isDraw = true
    type = op.type || 'point'
    compute = op.compute || false
    smooth = op.smooth || false
    options = op
    showLayer = op.showLayer //网格订正不显示layer
    // options.compute = compute

    json_line.properties = op
    json_polygon.properties = op
    json_area.properties = op

    switch (type) {
      case 'point':
        uuid = generateUUID()
        layersId.push(uuid)
        sourceId.push(uuid)
        json_point.features.length = 0
        map.addSource(uuid, { type: 'geojson', data: json_point as any })
        map.addLayer({
          id: uuid,
          type: 'circle',
          source: uuid,
          paint: {
            'circle-color': options['circle-color'] || '#ff0',
            'circle-radius': options['circle-radius'] || 5,
            'circle-stroke-color': options['circle-stroke-color'] || '#000',
            'circle-stroke-width': options['circle-stroke-width'] || 2,
          },
        })
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
    source.setData(JSON.parse(JSON.stringify(json_point)))
  }
  //---------------------------线---------------------------//
  const drawLine = (e: MapMouseEvent & Object) => {
    if (isNew) {
      uuid = generateUUID()
      layersId.push(uuid)
      sourceId.push(uuid)
      json_line.geometry.coordinates.length = 0
      json_point.features.length = 0
      map.addSource(uuid, { type: 'geojson', data: json_line as any })
      map.addSource(uuid + 'text', { type: 'geojson', data: json_point as any })
      map.addLayer({
        id: uuid,
        type: 'line',
        source: uuid,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ff0',
          'line-width': 4,
        },
      })
      map.addLayer({
        id: uuid + 'point',
        type: 'circle',
        source: uuid,
        paint: {
          'circle-color': options['circle-color'] || '#ff0',
          'circle-radius': options['circle-radius'] || 5,
          'circle-stroke-color': options['circle-stroke-color'] || '#000',
          'circle-stroke-width': options['circle-stroke-width'] || 2,
        },
      })
      map.addLayer({
        id: uuid + 'text',
        type: 'symbol',
        source: uuid + 'text',
        layout: {
          // 'symbol-placement' :'line-center',
          'text-field': ['get', 'distance'],
          'text-allow-overlap': true,
          'text-anchor': 'bottom',
          'text-overlap': 'always',
          visibility: compute ? 'visible' : 'none',
        },
      })
      isNew = false
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
    }
    json_line.geometry.coordinates.push(e.lngLat.toArray())
    const source = map.getSource(uuid) as GeoJSONSource
    source.setData(json_line as any)
    //--------------------------提取最后两个点计算长度----------------------------//

    json_point.features.push({
      type: 'Feature',
      properties: { name: 0 },
      geometry: { type: 'Point', coordinates: e.lngLat.toArray() },
    })
    const source_text = map.getSource(uuid + 'text') as GeoJSONSource
    source_text.setData(json_point as any)
  }
  //---------------------------面---------------------------//
  const drawPolygon = (e: MapMouseEvent & Object) => {
    if (isNew) {
      uuid = generateUUID()
      layersId.push(uuid)
      sourceId.push(uuid)
      json_polygon.geometry.coordinates.length = 0
      json_polygon.geometry.coordinates[0] = []
      map.addSource(uuid, { type: 'geojson', data: json_polygon as any })
      map.addSource(uuid + 'area', { type: 'geojson', data: json_area as any })
      map.addLayer({
        id: uuid,
        type: 'fill',
        source: uuid,
        paint: {
          'fill-antialias': false,
          'fill-color': options.fillColor || '#ff0',
          'fill-opacity': 0.8,
          // 'fill-outline-color': 'black',
        },
      })
      map.addLayer({
        id: uuid + 'outline',
        type: 'line',
        source: uuid,
        paint: {
          'line-width': 2,
          'line-color': 'black',
          // 'line-translate-anchor':'viewport'
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })
      map.addLayer({
        id: uuid + 'point',
        type: 'circle',
        source: uuid,
        paint: {
          'circle-color': options['circle-color'] || '#ff0',
          'circle-radius': options['circle-radius'] || 5,
          'circle-stroke-color': options['circle-stroke-color'] || '#000',
          'circle-stroke-width': options['circle-stroke-width'] || 2,
        },
      })
      map.addLayer({
        id: uuid + 'area',
        type: 'symbol',
        source: uuid + 'area',
        layout: {
          'text-field': ['get', 'area'],
          // 'text-field': '456',
          'text-allow-overlap': true,
          // 'text-anchor': 'bottom',
          'text-overlap': 'always',
          visibility: compute ? 'visible' : 'none',
        },
      })
      isNew = false
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
    }
    // // json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
    if (json_polygon.geometry.coordinates[0].length >= 3) {
      json_polygon.geometry.coordinates[0].pop()
    }
    json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
    json_polygon.geometry.coordinates[0].push(json_polygon.geometry.coordinates[0][0])
    const source = map.getSource(uuid) as GeoJSONSource
    source.setData(json_polygon as any)
  }
  //---------------------------自由---------------------------//
  const drawFree = (e: MapMouseEvent & Object) => {
    if (isNew) {
      uuid = generateUUID()
      layersId.push(uuid)
      sourceId.push(uuid)
      json_polygon.geometry.coordinates.length = 0
      json_polygon.geometry.coordinates[0] = []
      point.length = 0
      map.addSource(uuid, { type: 'geojson', data: json_polygon as any })
      map.addSource(uuid + 'area', { type: 'geojson', data: json_area as any })
      map.addLayer({
        id: uuid,
        type: 'fill',
        source: uuid,
        paint: {
          'fill-antialias': false,
          'fill-color': options.fillColor || '#ff0',
          'fill-opacity': 0.8,
        },
      })
      map.addLayer({
        id: uuid + 'outline',
        type: 'line',
        source: uuid,
        paint: {
          'line-width': 2,
          'line-color': 'black',
          // 'line-translate-anchor':'viewport'
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })
      map.addLayer({
        id: uuid + 'area',
        type: 'symbol',
        source: uuid + 'area',
        layout: {
          'text-field': ['get', 'area'],
          // 'text-field': '456',
          'text-allow-overlap': true,
          // 'text-anchor': 'bottom',
          'text-overlap': 'always',
          visibility: compute ? 'visible' : 'none',
        },
      })
      isNew = false
      json_polygon.geometry.coordinates[0].push(e.lngLat.toArray())
      const source = map.getSource(uuid) as GeoJSONSource
      source.setData(json_polygon as any)
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
      map.scrollZoom.disable()
      map.dragPan.disable()
      map.doubleClickZoom.disable()
    }
  }
  //---------------------------圆---------------------------//
  const drawCircle = (e: MapMouseEvent & Object) => {
    if (isNew) {
      uuid = generateUUID()
      layersId.push(uuid)
      sourceId.push(uuid)
      json_point.features.length = 0
      json_polygon.geometry.coordinates.length = 0
      json_polygon.geometry.coordinates[0] = []
      point.length = 0
      map.addSource(uuid, { type: 'geojson', data: json_polygon as any })
      map.addSource(uuid + 'area', { type: 'geojson', data: json_area as any })
      map.addSource(uuid + 'point', { type: 'geojson', data: json_point as any })
      map.addLayer({
        id: uuid,
        type: 'fill',
        source: uuid,
        paint: {
          'fill-antialias': false,
          'fill-color': options.fillColor || '#ff0',
          'fill-opacity': 0.8,
        },
      })
      map.addLayer({
        id: uuid + 'outline',
        type: 'line',
        source: uuid,
        paint: {
          'line-width': 2,
          'line-color': 'black',
          // 'line-translate-anchor':'viewport'
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })
      map.addLayer({
        id: uuid + 'point',
        type: 'circle',
        source: uuid + 'point',
        paint: {
          'circle-color': options['circle-color'] || '#ff0',
          'circle-radius': options['circle-radius'] || 5,
          'circle-stroke-color': options['circle-stroke-color'] || '#000',
          'circle-stroke-width': options['circle-stroke-width'] || 2,
        },
      })
      map.addLayer({
        id: uuid + 'area',
        type: 'symbol',
        source: uuid + 'area',
        layout: {
          'text-field': ['get', 'area'],
          // 'text-field': '456',
          'text-allow-overlap': true,
          // 'text-anchor': 'bottom',
          'text-overlap': 'always',
          'text-offset': [0, 1],
          visibility: compute ? 'visible' : 'none',
        },
      })
      isNew = false
      const pointFeature = {
        type: 'Feature',
        properties: { name: 0 },
        geometry: { type: 'Point', coordinates: e.lngLat.toArray() },
      }
      json_point.features.push(JSON.parse(JSON.stringify(pointFeature)) as any)
      json_point.features.push(JSON.parse(JSON.stringify(pointFeature)) as any)
      json_area.geometry.coordinates = e.lngLat.toArray() as any

      const source_point = map.getSource(uuid + 'point') as GeoJSONSource
      source_point.setData(json_point as any)
      map.on('mousemove', throttledRedraw)
      map.on('contextmenu', mapClick_right)
      map.scrollZoom.disable()
      map.dragPan.disable()
      map.doubleClickZoom.disable()
    }
  }
  //ev: MapMouseEvent & Object
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
      default:
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
          source.setData(json_line as any)
          // //--------------------------提取最后两个点计算长度----------------------------//
          const fromPoint = json_line.geometry.coordinates[json_line.geometry.coordinates.length - 2]
          const toPoint = json_line.geometry.coordinates[json_line.geometry.coordinates.length - 1]
          const distance = turf.distance(fromPoint, toPoint, { units: 'kilometers' }) //计算距离
          const midpoint = turf.midpoint(turf.point(fromPoint), turf.point(toPoint)) //提取中心点
          const features = json_point.features[json_point.features.length - 1] as any
          features.properties.distance = turf.round(distance, 4) + 'km'
          features.geometry.coordinates = midpoint.geometry.coordinates

          const source_text = map.getSource(uuid + 'text') as GeoJSONSource
          source_text.setData(JSON.parse(JSON.stringify(json_point)))
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
          // //获取中心点
          if (polygon_length >= 4) {
            var polygon = turf.polygon(json_polygon.geometry.coordinates)
            var centroid = turf.centerOfMass(polygon)
            json_area.geometry.coordinates = centroid.geometry.coordinates
            json_area.properties.area = turf.round(area, 2) + 'km²'
          }
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_polygon as any)
          const source2 = map.getSource(uuid + 'area') as GeoJSONSource
          source2.setData(json_area as any)
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
            json_area.properties.area = turf.round(area, 2) + 'km²'
          }
          const source = map.getSource(uuid) as GeoJSONSource
          source.setData(json_polygon as any)
          const source2 = map.getSource(uuid + 'area') as GeoJSONSource
          source2.setData(json_area as any)
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
          json_area.properties.area = turf.round(area, 2) + 'km²'
          const source_point = map.getSource(uuid + 'point') as GeoJSONSource
          const source = map.getSource(uuid) as GeoJSONSource
          const source_area = map.getSource(uuid + 'area') as GeoJSONSource
          source_point.setData(json_point as any)
          source.setData(json_polygon as any)
          source_area.setData(json_area as any)
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

    map.scrollZoom.enable()
    map.dragPan.enable()
    map.doubleClickZoom.enable()
    // map.scrollZoom.disable()
    //   map.dragPan.disable()
    //   map.doubleClickZoom.disable()
    const source = map.getSource(uuid) as GeoJSONSource
    switch (type) {
      case 'line':
        if (json_line.geometry.coordinates.length) {
          source.setData(JSON.parse(JSON.stringify(json_line)))
        }
        break
      case 'polygon':
        if (json_polygon.geometry.coordinates[0].length) {
          source.setData(JSON.parse(JSON.stringify(json_polygon)))
        }
        break
      case 'free':
        if (json_polygon.geometry.coordinates[0].length) {
          source.setData(JSON.parse(JSON.stringify(json_polygon)))

          if (isSelfIntersection(point)) {
            //判断是否自相交
            alert('落区自相交，请重画')
            // alert("落区自相交，请编辑或选中删除重画");
            layersId.pop()
            sourceId.pop()
            map.removeLayer(uuid)
            map.removeLayer(uuid + 'outline')
            map.removeLayer(uuid + 'area')
            map.removeSource(uuid)
            map.removeSource(uuid + 'area')
            return
          }
          //---------------------------是否显示layer  网格订正用---------------------------//
          if (!showLayer) {
            map.setLayoutProperty(uuid, 'visibility', 'none')
            map.setLayoutProperty(uuid + 'outline', 'visibility', 'none')
            // map.setLayoutProperty('my-layer', 'visibility', 'none');
          }
          //---------------------------是否平滑处理---------------------------//
          if (smooth) {
            /* 方案1  缺点：处理后的落区和处理前相差很大 */
            //---------------------------转换贝塞尔---------------------------//
            // const newPoints = [...point.slice(point.length / 5), ...point.slice(0, point.length / 5)]
            // const curve = new Bezier(newPoints)
            // const newPoint = curve.getLUT()
            // newPoint.push(newPoint[0])
            // json_polygon.geometry.coordinates[0].length = 0
            // for (let i = 0; i < newPoint.length; i++) {
            //   const point = map.unproject(newPoint[i])
            //   json_polygon.geometry.coordinates[0].push(point.toArray())
            // }
            // // const source4 = map.getSource(uuid) as GeoJSONSource
            // source.setData(JSON.parse(JSON.stringify(json_polygon)))
            /* 方案2  */
            // const data = source.serialize().data as any
            // const coordinates = data.geometry.coordinates[0]
            // const points = turf.lineString(coordinates)
            // const curved = turf.bezierSpline(points,{resolution:100000,sharpness:2})

            // 优化方案1 优化：处理后的落区和处理前落区相差不大

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
            // const curve = new Bezier(newPoints)
            // const newPoint = curve.getLUT(point.length)
            // newPoint.push(newPoint[0])
            json_polygon.geometry.coordinates[0].length = 0
            for (let i = 0; i < bezierPoints.length; i++) {
              const point = map.unproject(bezierPoints[i])
              json_polygon.geometry.coordinates[0].push(point.toArray())
            }
            // const source4 = map.getSource(uuid) as GeoJSONSource
            source.setData(JSON.parse(JSON.stringify(json_polygon)))

            //更新面积
            const area = turf.area(json_polygon) / 1000000 //km²
            json_area.properties.area = turf.round(area, 2) + 'km²'
            const sourcearea = map.getSource(uuid + 'area') as GeoJSONSource
            sourcearea.setData(JSON.parse(JSON.stringify(json_area)))
          }
        }
        break

      case 'circle':
        map.removeLayer(uuid + 'point')
        map.removeSource(uuid + 'point')
        break
      default:
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
      // features.push(source._data)
    })
    return features
  }
  const clear = () => {
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
  const clearJson = () => {
    json_point.features.length = 0
    json_line.geometry.coordinates.length = 0
    json_polygon.geometry.coordinates.length = 0
    json_polygon.geometry.coordinates[0] = []
    json_area.geometry.coordinates.length = 0
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
  const throttledRedraw = throttle(redraw, 30)
  //---------------------------撤销---------------------------//
  const revoke = () => {
    if (type == 'free') {
      if (layersId.length) {
        map.removeLayer(layersId[layersId.length - 1])
        map.removeLayer(layersId[layersId.length - 1] + 'outline')
        if (map.getLayer(layersId[layersId.length - 1] + 'area')) {
          map.removeLayer(layersId[layersId.length - 1] + 'area')
        }
        layersId.pop()
      }
    }
  }
  //---------------------------重做---------------------------//
  const redo = () => {
    if (type == 'free') {
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
            map.addLayer({
              id: addId[0] + 'area',
              type: 'symbol',
              source: addId[0] + 'area',
              layout: {
                'text-field': ['get', 'area'],
                // 'text-field': '456',
                'text-allow-overlap': true,
                // 'text-anchor': 'bottom',
                'text-overlap': 'always',
                visibility: geojson.properties.compute ? 'visible' : 'none',
              },
            })
          }
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

  return { isDraw, start, getFeatures, clear, revoke, redo }
}
