// 导出函数的声明

import { Map } from 'maplibre-gl'

export function drawFreehand(map: Map): {
  isStart: Boolean
  start: (color: string, MGValue: number) => void
  setColor: (color: string, MGValue: number) => void
  getFeatures: () => void
  clear: () => void
  revoke: () => void
  redo: () => void
}
