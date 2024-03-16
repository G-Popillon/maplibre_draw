import { Map } from 'maplibre-gl'
import { drawFreehand } from './utils/drawFree'

interface drawFreehandType {
  new (someProperty: Map): drawFreehand
}

export default drawFreehand as drawFreehandType
