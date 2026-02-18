import cacheManager from 'cache-manager'
import redisStore from 'cache-manager-redis-store'
import HttpClient from './HttpClient.js'
import DebridClient from './DebridClient.js'
import PornHub from './adapters/PornHub.js'
import RedTube from './adapters/RedTube.js'
import YouPorn from './adapters/YouPorn.js'
import SpankWire from './adapters/SpankWire.js'
import PornCom from './adapters/PornCom.js'
import Chaturbate from './adapters/Chaturbate.js'
import UsenetStreamer from './adapters/UsenetStreamer.js'


const ID = 'porn_id'
const SORT_PROP_PREFIX = 'popularities.porn.'
const CACHE_PREFIX = 'stremio-porn|'
const MAX_ADAPTERS_PER_REQUEST = 1
const BASE_ADAPTERS = [PornHub, RedTube, YouPorn, SpankWire, PornCom, Chaturbate]
const isUsenetAdapter = (adapter, includeClass = false) => {
  return adapter instanceof UsenetStreamer ||
    (includeClass && adapter === UsenetStreamer)
}
function buildSorts(adapters) {
  return adapters.map(({ name, DISPLAY_NAME, SUPPORTED_TYPES }) => ({
    name: `Porn: ${DISPLAY_NAME}`,
    prop: `${SORT_PROP_PREFIX}${name}`,
    types: SUPPORTED_TYPES,
  }))
}

function buildCatalogs(adapters) {
  return adapters.reduce((catalogs, Adapter) => {
    if (isUsenetAdapter(Adapter, true)) {
      return catalogs
    }

    Adapter.SUPPORTED_TYPES.forEach((type) => {
      catalogs.push({
        type,
        id: `${Adapter.name.toLowerCase()}-${type}`,
        name: Adapter.DISPLAY_NAME,
        extra: [{
          name: 'search',
        }, {
          name: 'skip',
        }, {
          name: 'genre',
          isRequired: false,
        }, {
          name: 'sort',
          options: [`${SORT_PROP_PREFIX}${Adapter.name}`],
        }],
        extraSupported: ['search', 'skip', 'genre', 'sort'],
      })
    })

    return catalogs
  }, [])
}
const METHODS = {
  'stream.find': {
    adapterMethod: 'getStreams',
    cacheTtl: 300,
    idProp: ID,
    expectsArray: true,
  },
  'meta.find': {
    adapterMethod: 'find',
    cacheTtl: 300,
    idProp: 'id',
    expectsArray: true,
  },
  'meta.search': {
    adapterMethod: 'find',
    cacheTtl: 3600,
    idProp: 'id',
    expectsArray: true,
  },
  'meta.get': {
    adapterMethod: 'getItem',
    cacheTtl: 300,
    idProp: 'id',
    expectsArray: false,
  },
}


function makePornId(adapter, type, id) {
  return `${ID}:${adapter}-${type}-${id}`
}

function parsePornId(pornId) {
  const [adapter, type, id] = pornId.split(':').pop().split('-')
  return { adapter, type, id }
}

function normalizeRequest(request) {
  let { query } = request
  const { sort, limit, skip } = request
  let adapters = []

  if (sort) {
    adapters = Object.keys(sort)
      .filter((p) => p.startsWith(SORT_PROP_PREFIX))
      .map((p) => p.slice(SORT_PROP_PREFIX.length))
  }

  if (typeof query === 'string') {
    query = { search: query }
  } else if (query) {
    query = { ...query }
  } else {
    query = {}
  }

  if (query.porn_id) {
    const { adapter, type, id } = parsePornId(query.porn_id)

    if (type && query.type && type !== query.type) {
      throw new Error(
        `Request query and porn_id types do not match (${type}, ${query.type})`
      )
    }

    if (adapters.length && !adapters.includes(adapter)) {
      throw new Error(
        `Request sort and porn_id adapters do not match (${adapter})`
      )
    }

    adapters = [adapter]
    query.type = type
    query.id = id
  }

  return { query, adapters, skip, limit }
}

function normalizeResult(adapter, item, idProp = 'id') {
  const newItem = { ...item }
  newItem[idProp] = makePornId(adapter.constructor.name, item.type, item.id)
  return newItem
}

function mergeResults(results) {
  // TODO: limit
  return results.reduce((results, adapterResults) => {
    results.push(...adapterResults)
    return results
  }, [])
}


class PornClient {
  static ID = ID
  static getAdapters(options = {}) {
    const adapters = [...BASE_ADAPTERS]

    if (options.usenetStreamerUrl) {
      adapters.push(UsenetStreamer)
    }

    return adapters
  }

  static getSorts(options = {}, adapters = this.getAdapters(options)) {
    return buildSorts(adapters)
  }

  static getCatalogs(options = {}, adapters = this.getAdapters(options)) {
    return buildCatalogs(adapters)
  }

  static getIdPrefixes(options = {}, adapters = this.getAdapters(options)) {
    const prefixes = []

    if (options.usenetStreamerUrl && adapters.some((adapter) => isUsenetAdapter(adapter, true))) {
      prefixes.push(...UsenetStreamer.ID_PREFIXES)
    }

    return prefixes
  }

  constructor(options) {
    const httpClient = new HttpClient(options)
    this.debridClient = new DebridClient(httpClient, {
      realDebridToken: options.realDebridToken,
      torboxToken: options.torboxToken,
    })
    this.adapterClasses = PornClient.getAdapters(options)
    this.adapters = this.adapterClasses.map((Adapter) => {
      let adapterOptions = {}

      if (Adapter === UsenetStreamer) {
        adapterOptions = { baseUrl: options.usenetStreamerUrl }
      }

      return new Adapter(httpClient, adapterOptions)
    })
    this.sorts = buildSorts(this.adapterClasses)
    this.catalogs = buildCatalogs(this.adapterClasses)

    if (options.cache === '1') {
      this.cache = cacheManager.caching({ store: 'memory' })
    } else if (options.cache && options.cache !== '0') {
      this.cache = cacheManager.caching({
        store: redisStore,
        url: options.cache,
      })
    }
  }

  _getAdaptersForRequest(request, adapterMethod) {
    const { query, adapters } = request
    const { type } = query
    let matchingAdapters = this.adapters

    if (adapters.length) {
      matchingAdapters = matchingAdapters.filter((adapter) => {
        return adapters.includes(adapter.constructor.name)
      })
    }

    if (type) {
      matchingAdapters = matchingAdapters.filter((adapter) => {
        return adapter.constructor.SUPPORTED_TYPES.includes(type)
      })
    }

    if (adapterMethod === 'getStreams') {
      const usenetAdapter = (query.id && matchingAdapters.find((adapter) => {
        return isUsenetAdapter(adapter) && adapter.supportsId(query.id)
      })) || null

      matchingAdapters = usenetAdapter ?
        [usenetAdapter] :
        matchingAdapters.filter((adapter) => !isUsenetAdapter(adapter))
    } else {
      matchingAdapters = matchingAdapters.filter((adapter) => !isUsenetAdapter(adapter))
    }

    return matchingAdapters.slice(0, MAX_ADAPTERS_PER_REQUEST)
  }

  async _invokeAdapterMethod(adapter, method, request, idProp) {
    let results = await adapter[method](request)
    if (method === 'getStreams') {
      results = await this.debridClient.unrestrictStreams(results)
    }
    return results.map((result) => {
      return normalizeResult(adapter, result, idProp)
    })
  }

  // Aggregate method that dispatches requests to matching adapters
  async _invokeMethod(adapterMethod, rawRequest, idProp) {
    const request = normalizeRequest(rawRequest)
    const adapters = this._getAdaptersForRequest(request, adapterMethod)

    if (!adapters.length) {
      throw new Error('Couldn\'t find suitable adapters for a request')
    }

    const results = []

    for (const adapter of adapters) {
      const adapterResults = await this._invokeAdapterMethod(
        adapter, adapterMethod, request, idProp
      )
      results.push(adapterResults)
    }

    return mergeResults(results, request.limit)
  }

  // This is a public wrapper around the private method
  // that implements caching and result normalization
  async invokeMethod(methodName, rawRequest) {
    const { adapterMethod, cacheTtl, idProp, expectsArray } = METHODS[methodName]
    const invokeMethod = async () => {
      const result = await this._invokeMethod(adapterMethod, rawRequest, idProp)
      return expectsArray ? result : result[0]
    }

    if (this.cache) {
      const cacheKey = CACHE_PREFIX + JSON.stringify(rawRequest)
      const cacheOptions = {
        ttl: cacheTtl,
      }
      return this.cache.wrap(cacheKey, invokeMethod, cacheOptions)
    }
    return invokeMethod()
  }
}


export default PornClient
