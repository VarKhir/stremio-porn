import Bottleneck from 'bottleneck'


class BaseAdapter {
  static SUPPORTED_TYPES = []
  static MAX_RESULTS_PER_REQUEST = 100
  static MAX_CONCURRENT_REQUESTS = 3

  constructor(httpClient) {
    this.httpClient = httpClient
    this.scheduler = new Bottleneck({
      maxConcurrent: this.constructor.MAX_CONCURRENT_REQUESTS,
    })
  }

  _normalizeItem(item) {
    return item
  }

  _normalizeStream(stream) {
    const name = stream.name ||
      this.constructor.DISPLAY_NAME ||
      this.constructor.name
    const titleParts = []

    if (stream.quality) {
      titleParts.push(stream.quality)
    }

    if (stream.title && stream.title !== name) {
      titleParts.push(stream.title)
    }

    const title = titleParts.length > 0 ?
      titleParts.join(' | ') :
      name

    return { ...stream, name, title }
  }

  _paginate(request) {
    let itemsPerPage = this.constructor.ITEMS_PER_PAGE || Infinity
    const { skip = 0 } = request
    let { limit = itemsPerPage } = request
    limit = Math.min(limit, this.constructor.MAX_RESULTS_PER_REQUEST)
    itemsPerPage = Math.min(itemsPerPage, limit)

    const firstPage = Math.ceil((skip + 0.1) / itemsPerPage) || 1
    const pageCount = Math.ceil(limit / itemsPerPage)
    const pages = []

    for (let i = firstPage; pages.length < pageCount; i++) {
      pages.push(i)
    }

    return {
      pages, skip, limit,
      skipOnFirstPage: skip % itemsPerPage,
    }
  }

  _validateRequest(request, typeRequired) {
    const { SUPPORTED_TYPES } = this.constructor

    if (typeof request !== 'object') {
      throw new Error(`A request must be an object, ${typeof request} given`)
    }

    if (!request.query) {
      throw new Error('Request query must not be empty')
    }

    if (typeRequired && !request.query.type) {
      throw new Error('Content type must be specified')
    }

    if (request.query.type && !SUPPORTED_TYPES.includes(request.query.type)) {
      throw new Error(`Content type ${request.query.type} is not supported`)
    }
  }

  async _find(query, pagination) {
    const { pages, limit, skipOnFirstPage } = pagination
    const requests = pages.map((page) => {
      return this._findByPage(query, page)
    })

    let results = await Promise.all(requests)
    results = [].concat(...results).filter((item) => item)
    return results.slice(skipOnFirstPage, skipOnFirstPage + limit)
  }

  async find(request) {
    this._validateRequest(request)

    const pagination = this._paginate(request)
    let { query } = request

    if (!query.type) {
      query = {
        ...query,
        type: this.constructor.SUPPORTED_TYPES[0],
      }
    }

    const results = await this.scheduler.schedule(() => {
      return this._find(query, pagination)
    })

    if (results) {
      return results.map((item) => this._normalizeItem(item))
    }
    return []
  }

  async getItem(request) {
    this._validateRequest(request, true)

    const { type, id } = request.query
    const result = await this.scheduler.schedule(() => {
      return this._getItem(type, id)
    })
    return result ? [this._normalizeItem(result)] : []
  }

  async getStreams(request) {
    this._validateRequest(request, true)

    const { type, id } = request.query
    const results = await this.scheduler.schedule(() => {
      return this._getStreams(type, id)
    })

    if (results) {
      return results.map((stream) => this._normalizeStream(stream))
    }
    return []
  }
}


export default BaseAdapter
