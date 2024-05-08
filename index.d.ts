// 导出函数的声明
declare module '@turf/turf'

export function draw(map: any,callback:Function): {
  isStart: Boolean
  start: (op: any) => void
  getFeatures: () => void
  clear: () => void
  revoke: () => void
  redo: () => void
  isNew: Boolean
}
