// //---------------------------线性插值---------------------------//
// export function generateCardinalSplinePoints(points: string | any[], tension: number, numOfSegments: number) {
//   const splinePoints = []
//   for (let i = 0; i < points.length - 1; i++) {
//     const p0 = points[i === 0 ? i : i - 1]
//     const p1 = points[i]
//     const p2 = points[i + 1]
//     const p3 = points[i + 2 === points.length ? i + 1 : i + 2]

//     for (let t = 0; t <= 1; t += 1 / numOfSegments) {
//       const { x, y } = getCardinalSplinePoint(t, p0, p1, p2, p3, tension)
//       splinePoints.push({ x, y })
//     }
//   }
//   return splinePoints
// }
// function getCardinalSplinePoint(t: number, p0: { x: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number }, tension: number) {
//   const t2 = t * t
//   const t3 = t2 * t

//   const m0 = (p2.x - p0.x) * tension
//   const m1 = (p3.x - p1.x) * tension

//   const a = 2 * t3 - 3 * t2 + 1
//   const b = t3 - 2 * t2 + t
//   const c = t3 - t2
//   const d = -2 * t3 + 3 * t2

//   const x = a * p1.x + b * m0 + c * m1 + d * p2.x
//   const y = a * p1.y + b * m0 + c * m1 + d * p2.y

//   return { x, y }
// }
