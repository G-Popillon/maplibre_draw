// import eosBtn from './table/index.vue'
// import drawFreehand from './utils/drawFreehand'
// import { Map, MapOptions } from 'maplibre-gl'
import { Map } from 'maplibre-gl'
import { drawFreehand } from './utils/drawFree'

// 定义一个接口描述 drawFreehand 类的结构
interface DrawFreehandType {
  new (someProperty: Map): drawFreehand // 这里描述了类的构造函数签名
  // 你也可以在这里添加其他成员的类型描述
}

//  drawFreehand as DrawFreehandType;
export default drawFreehand as DrawFreehandType
