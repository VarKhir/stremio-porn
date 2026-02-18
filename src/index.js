import { readFileSync } from 'fs'
import { join } from 'path'
import http from 'http'
import Stremio from 'stremio-addons'
import serveStatic from 'serve-static'
import chalk from 'chalk'
import PornClient from './PornClient.js'


const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))

const SUPPORTED_METHODS = [
  'stream.find', 'meta.find', 'meta.search', 'meta.get',
]
const STATIC_DIR = 'static'
const DEFAULT_ID = 'stremio_porn'

const ID = process.env.STREMIO_PORN_ID || DEFAULT_ID
const ENDPOINT = process.env.STREMIO_PORN_ENDPOINT || 'http://localhost'
const PORT = process.env.STREMIO_PORN_PORT || process.env.PORT || '80'
const PROXY = process.env.STREMIO_PORN_PROXY || process.env.HTTPS_PROXY
const CACHE = process.env.STREMIO_PORN_CACHE || process.env.REDIS_URL || '1'
const USENET_STREAMER = process.env.STREMIO_PORN_USENET_STREAMER
const IS_PROD = process.env.NODE_ENV === 'production'


if (IS_PROD && ID === DEFAULT_ID) {
  console.error(
    chalk.red(
      '\nWhen running in production, a non-default addon identifier must be specified\n'
    )
  )
  process.exit(1)
}

function parseUserConfig(configStr) {
  if (!configStr) {
    return {}
  }

  try {
    const standard = configStr.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = Buffer.from(standard, 'base64').toString('utf8')
    const config = JSON.parse(decoded)
    return config || {}
  } catch (err) {
    return {}
  }
}

const baseClientOptions = {
  proxy: PROXY,
  cache: CACHE,
  usenetStreamerUrl: USENET_STREAMER,
}
const adapters = PornClient.getAdapters(baseClientOptions)
const availableSites = adapters.map((a) => a.DISPLAY_NAME).join(', ')

const MANIFEST = {
  name: 'Porn',
  id: ID,
  version: pkg.version,
  description: `\
Time to unsheathe your sword! \
Watch porn videos and webcam streams from ${availableSites}\
`,
  types: ['movie', 'tv'],
  idProperty: PornClient.ID,
  dontAnnounce: !IS_PROD,
  sorts: PornClient.getSorts(baseClientOptions, adapters),
  catalogs: PornClient.getCatalogs(baseClientOptions, adapters),
  resources: ['stream', 'meta', 'catalog'],
  idPrefixes: PornClient.getIdPrefixes(baseClientOptions, adapters),
  endpoint: `${ENDPOINT}/stremioget/stremio/v1`,
  logo: `${ENDPOINT}/logo.png`,
  icon: `${ENDPOINT}/logo.png`,
  background: `${ENDPOINT}/bg.jpg`,
  filter: {
    [`query.${PornClient.ID}`]: { $exists: true },
    'query.type': { $in: ['movie', 'tv'] },
  },
}


function makeMethod(client, methodName) {
  return async (request, cb) => {
    let response
    let error

    try {
      response = await client.invokeMethod(methodName, request)
    } catch (err) {
      error = err

      console.error(
        `${chalk.gray(new Date().toLocaleString())} An error has occurred while processing the following request to ${methodName}:`
      )
      console.error(request)
      console.error(err)
    }

    cb(error, response)
  }
}

function makeMethods(client, methodNames) {
  return methodNames.reduce((methods, methodName) => {
    methods[methodName] = makeMethod(client, methodName)
    return methods
  }, {})
}


const defaultClient = new PornClient(baseClientOptions)
const defaultMethods = makeMethods(defaultClient, SUPPORTED_METHODS)
const defaultAddon = new Stremio.Server(defaultMethods, MANIFEST)

const userClients = {}
const userClientKeys = []
const MAX_USER_CLIENTS = 100

function getClientForConfig(configStr) {
  if (!configStr) {
    return defaultClient
  }

  if (userClients[configStr]) {
    return userClients[configStr]
  }

  const userConfig = parseUserConfig(configStr)

  if (!userConfig.realDebridToken && !userConfig.torboxToken) {
    return defaultClient
  }

  const clientOptions = {
    ...baseClientOptions,
    realDebridToken: userConfig.realDebridToken,
    torboxToken: userConfig.torboxToken,
  }

  const client = new PornClient(clientOptions)
  userClients[configStr] = client
  userClientKeys.push(configStr)

  while (userClientKeys.length > MAX_USER_CLIENTS) {
    const oldKey = userClientKeys.shift()
    delete userClients[oldKey]
  }

  return client
}

const server = http.createServer((req, res) => {
  const configMatch = req.url.match(
    /^\/([A-Za-z0-9_-]+=*)\/stremioget\//
  )
  const configStr = configMatch ? configMatch[1] : null

  if (configStr) {
    const client = getClientForConfig(configStr)
    const methods = makeMethods(client, SUPPORTED_METHODS)
    const configuredManifest = {
      ...MANIFEST,
      endpoint: `${ENDPOINT}/${configStr}/stremioget/stremio/v1`,
    }
    const configuredAddon = new Stremio.Server(methods, configuredManifest)
    req.url = req.url.slice(configStr.length + 1)
    configuredAddon.middleware(req, res, () => res.end())
    return
  }

  if (req.url === '/api/status') {
    const status = {
      manifest: {
        name: MANIFEST.name,
        version: MANIFEST.version,
        description: MANIFEST.description,
        catalogs: MANIFEST.catalogs,
        dontAnnounce: MANIFEST.dontAnnounce,
      },
      config: {
        cache: CACHE !== '0',
        proxy: Boolean(PROXY),
      },
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(status))
    return
  }
  serveStatic(STATIC_DIR)(req, res, () => {
    defaultAddon.middleware(req, res, () => res.end())
  })
})

server
  .on('listening', () => {
    const values = {
      endpoint: chalk.green(MANIFEST.endpoint),
      id: ID === DEFAULT_ID ? chalk.red(ID) : chalk.green(ID),
      env: IS_PROD ? chalk.green('production') : chalk.green('development'),
      proxy: PROXY ? chalk.green(PROXY) : chalk.red('off'),
      cache: (CACHE === '0') ?
        chalk.red('off') :
        chalk.green(CACHE === '1' ? 'on' : CACHE),
    }

    console.log(`
    ${MANIFEST.name} Addon is listening on port ${PORT}

    Endpoint:    ${values.endpoint}
    Addon Id:    ${values.id}
    Environment: ${values.env}
    Proxy:       ${values.proxy}
    Cache:       ${values.cache}
    `)
  })
  .listen(PORT)


export default server
