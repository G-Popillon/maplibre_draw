export const addPointLayer = (map: any, id: String, sourceId: String, options?: any) => {
  map.addLayer({
    id: id,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-color': options?.['circle-color'] || '#ff0',
      'circle-radius': options?.['circle-radius'] || 5,
      'circle-stroke-color': options?.['circle-stroke-color'] || '#000',
      'circle-stroke-width': options?.['circle-stroke-width'] || 2,
    },
  })
}
export const addLineLayer = (map: any, id: String, sourceId: String, options?: any) => {
  map.addLayer({
    id: id,
    type: 'line',
    source: sourceId,
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
    paint: {
      'line-color': options?.['line-color'] || '#ff0',
      'line-width': options?.['line-width'] || 4,
    },
  })
}
export const addTextLayer = (map: any, id: String, sourceId: String, options?: any) => {
  map.addLayer({
    id: id,
    type: 'symbol',
    source: sourceId,
    layout: {
      'text-font': ['Noto Sans Regular'],
      'text-field': ['get', 'result'],
      'text-allow-overlap': true,
      'text-anchor': 'bottom',
      'text-overlap': 'always',
      visibility: options?.visibility ? 'visible' : 'none',
    },
  })
}

export const addFillLayer = (map: any, id: String, sourceId: String, options?: any) => {
  map.addLayer({
    id: id,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-antialias': false,
      'fill-color': options?.['fill-color'] || '#ff0',
      'fill-opacity': 0.8,
    },
  })
}
