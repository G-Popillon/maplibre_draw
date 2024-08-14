//------------------------检查自相交------------------------------//
export const isSelfIntersection = (geo: any) => {
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

function calcIntersection(a: any, b: any, c: any, d: any) {
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
