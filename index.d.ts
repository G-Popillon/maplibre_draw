// 导出函数的声明
declare module '@turf/turf'

export function draw(map: any,callback:Function): {
  startDraw: (op: any) => void
  revoke: () => void
  redo: () => void
  getFeaturesFromDraw: () => void
  clearDraw: () => void
  stopDraw: () => void
}
export function measure(map: any): {
  startMeasure: (op: any) => void
  clearMeasure: () => void
  stopMeasure: () => void
}
