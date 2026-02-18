import BaseAdapter from './BaseAdapter'


class UsenetStreamer extends BaseAdapter {
  static DISPLAY_NAME = 'Usenet'
  static SUPPORTED_TYPES = ['movie', 'tv']
  static CATALOG_ID = 'usenet'

  constructor(httpClient, options = {}) {
    super(httpClient)
    this.baseUrl = options.baseUrl ? options.baseUrl.replace(/\/+$/, '') : ''
  }

  supportsId(id) {
    if (!this.baseUrl || !id) {
      return false
    }

    return /^tt\d+/i.test(id) ||
      /^tmdb:/i.test(id) ||
      /^tvdb:/i.test(id) ||
      /^nzbdav:/i.test(id)
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
    let { body } = await this.httpClient.request(url, { json: true })

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
