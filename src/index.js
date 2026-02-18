import http from 'http'
import Stremio from 'stremio-addons'
import serveStatic from 'serve-static'
import chalk from 'chalk'
import pkg from '../package.json'
import PornClient from './PornClient'


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
const EMAIL = process.env.STREMIO_PORN_EMAIL || process.env.EMAIL
const USENET_STREAMER = process.env.STREMIO_PORN_USENET_STREAMER
const IS_PROD = process.env.NODE_ENV === 'production'


if (IS_PROD && ID === DEFAULT_ID) {
  // eslint-disable-next-line no-console
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
    let decoded = Buffer.from(configStr, 'base64').toString('utf8')
    let config = JSON.parse(decoded)
    return config || {}
  } catch (err) {
    return {}
  }
}

let baseClientOptions = {
  proxy: PROXY,
  cache: CACHE,
  usenetStreamerUrl: USENET_STREAMER,
}
let adapters = PornClient.getAdapters(baseClientOptions)
let availableSites = adapters.map((a) => a.DISPLAY_NAME).join(', ')

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
  // Stremio manifest allows advertising supported external id prefixes for stream requests
  idPrefixes: PornClient.getIdPrefixes(baseClientOptions, adapters),
  // The docs mention `contactEmail`, but the template uses `email`
  email: EMAIL,
  contactEmail: EMAIL,
  endpoint: `${ENDPOINT}/stremioget/stremio/v1`,
  logo: `${ENDPOINT}/logo.png`,
  icon: `${ENDPOINT}/logo.png`,
  background: `${ENDPOINT}/bg.jpg`,
  // OBSOLETE: used in pre-4.0 stremio instead of idProperty/types
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

      /* eslint-disable no-console */
      console.error(
        // eslint-disable-next-line prefer-template
        chalk.gray(new Date().toLocaleString()) +
        ' An error has occurred while processing ' +
        `the following request to ${methodName}:`
      )
      console.error(request)
      console.error(err)
      /* eslint-enable no-console */
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


let defaultClient = new PornClient(baseClientOptions)
let defaultMethods = makeMethods(defaultClient, SUPPORTED_METHODS)
let defaultAddon = new Stremio.Server(defaultMethods, MANIFEST)

// Cache for per-user PornClient instances (keyed by config string)
let userClients = {}

function getClientForConfig(configStr) {
  if (!configStr) {
    return defaultClient
  }

  if (userClients[configStr]) {
    return userClients[configStr]
  }

  let userConfig = parseUserConfig(configStr)

  if (!userConfig.realDebridToken && !userConfig.torboxToken) {
    return defaultClient
  }

  let clientOptions = {
    ...baseClientOptions,
    realDebridToken: userConfig.realDebridToken,
    torboxToken: userConfig.torboxToken,
  }

  let client = new PornClient(clientOptions)
  userClients[configStr] = client
  return client
}

let server = http.createServer((req, res) => {
  // Handle user-configured addon routes: /<base64config>/stremioget/stremio/v1
  let configMatch = req.url.match(/^\/([A-Za-z0-9+/=]+?)\/stremioget\//)
  let configStr = configMatch ? configMatch[1] : null

  if (configStr) {
    let client = getClientForConfig(configStr)
    let methods = makeMethods(client, SUPPORTED_METHODS)
    let configuredManifest = {
      ...MANIFEST,
      endpoint: `${ENDPOINT}/${configStr}/stremioget/stremio/v1`,
    }
    let configuredAddon = new Stremio.Server(methods, configuredManifest)
    // Rewrite URL to remove the config prefix
    // so the Stremio server can handle it
    req.url = req.url.slice(configStr.length + 1)
    configuredAddon.middleware(req, res, () => res.end())
    return
  }

  if (req.url === '/api/status') {
    let status = {
      manifest: {
        name: MANIFEST.name,
        version: MANIFEST.version,
        description: MANIFEST.description,
        catalogs: MANIFEST.catalogs,
        dontAnnounce: MANIFEST.dontAnnounce,
      },
      config: {
        cache: CACHE !== '0',
        proxy: !!PROXY,
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
    let values = {
      endpoint: chalk.green(MANIFEST.endpoint),
      id: ID === DEFAULT_ID ? chalk.red(ID) : chalk.green(ID),
      email: EMAIL ? chalk.green(EMAIL) : chalk.red('undefined'),
      env: IS_PROD ? chalk.green('production') : chalk.green('development'),
      proxy: PROXY ? chalk.green(PROXY) : chalk.red('off'),
      cache: (CACHE === '0') ?
        chalk.red('off') :
        chalk.green(CACHE === '1' ? 'on' : CACHE),
    }

    // eslint-disable-next-line no-console
    console.log(`
    ${MANIFEST.name} Addon is listening on port ${PORT}

    Endpoint:    ${values.endpoint}
    Addon Id:    ${values.id}
    Email:       ${values.email}
    Environment: ${values.env}
    Proxy:       ${values.proxy}
    Cache:       ${values.cache}
    `)
  })
  .listen(PORT)


export default server
