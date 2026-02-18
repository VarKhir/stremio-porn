import BaseAdapter from './BaseAdapter'


// Stream-only adapter that proxies IMDb/TMDb/TVDB/NZBDav ids to a Usenet streamer
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

    let escapedPrefixes = this.constructor.ID_PREFIXES.map((prefix) => {
      return prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    })

    let regex = new RegExp(`^(${escapedPrefixes.join('|')})(:)?`, 'i')
    return regex.test(id)
  }

  _normalizeStream(stream) {
    return super._normalizeStream({
      ...stream,
      name: stream.name || this.constructor.DISPLAY_NAME,
      title: stream.title || stream.name || this.constructor.DISPLAY_NAME,
    })
  }

  async _findByPage() {
    // UsenetStreamer does not expose catalogs; discovery is handled by other adapters.
    return []
  }

  async _getItem() {
    return null
  }

  async _getStreams(type, id) {
    if (!this.baseUrl) {
      return []
    }

    let url = `${this.baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`
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

    let streams = body.streams

    return Array.isArray(streams) ? streams : []
  }
}


export default UsenetStreamer
