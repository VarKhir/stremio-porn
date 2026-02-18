import BaseAdapter from './BaseAdapter.js'


class UsenetStreamer extends BaseAdapter {
  static DISPLAY_NAME = 'Usenet'
  static SUPPORTED_TYPES = ['movie', 'tv']
  static CATALOG_ID = 'usenet'
  static ID_PREFIXES = ['tt', 'tmdb', 'tvdb', 'nzbdav']

  constructor(httpClient, options = {}) {
    super(httpClient)
    this.baseUrl = options.baseUrl ? options.baseUrl.replace(/\/+$/, '') : ''
  }

  supportsId(id) {
    if (!this.baseUrl || !id) {
      return false
    }

    return this.constructor.ID_REGEX.test(id)
  }

  _normalizeStream(stream) {
    return super._normalizeStream({
      ...stream,
      name: stream.name || this.constructor.DISPLAY_NAME,
      title: stream.title || stream.name || this.constructor.DISPLAY_NAME,
    })
  }

  async _findByPage() {
    return []
  }

  async _getItem() {
    return null
  }

  async _getStreams(type, id) {
    if (!this.baseUrl) {
      return []
    }

    const url = `${this.baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`
    let body

    try {
      ;({ body } = await this.httpClient.request(url, { json: true }))
    } catch (err) {
      return []
    }

    if (Array.isArray(body)) {
      return body
    }

    if (!body || typeof body !== 'object') {
      return []
    }

    const streams = body.streams

    return Array.isArray(streams) ? streams : []
  }
}

UsenetStreamer.ESCAPED_ID_PREFIXES = UsenetStreamer.ID_PREFIXES.map((prefix) => {
  return prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
})
UsenetStreamer.ID_REGEX = new RegExp(
  `^(${UsenetStreamer.ESCAPED_ID_PREFIXES.join('|')})(:)?`,
  'i'
)


export default UsenetStreamer
