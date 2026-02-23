import { getRouter } from 'stremio-addon-sdk'
import addonInterface from './addon'


let router = getRouter(addonInterface)


export default function handler(req, res) {
  router(req, res, () => {
    res.statusCode = 404
    res.end()
  })
}
