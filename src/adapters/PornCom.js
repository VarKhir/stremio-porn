import BaseAdapter from './BaseAdapter.js'


const BASE_URL = 'https://www.porn.com'
const API_URL = 'https://api.porn.com'
const VIDEOS_API_URL = `${API_URL}/videos/find.json`
const ITEMS_PER_PAGE = 70
const SUPPORTED_TYPES = ['movie']


function formatDuration(seconds) {
  seconds = Number(seconds)
  const minutesString = Math.floor(seconds / 60)
  const secondsString = `0${seconds % 60}`.slice(-2)
  return `${minutesString}:${secondsString}`
}


class PornCom extends BaseAdapter {
  static DISPLAY_NAME = 'Porn.com'
  static SUPPORTED_TYPES = SUPPORTED_TYPES
  static ITEMS_PER_PAGE = ITEMS_PER_PAGE

  _normalizeItem(item) {
    return super._normalizeItem({
      type: 'movie',
      id: item.id,
      name: item.title,
      genre: item.tags,
      banner: item.thumb,
      poster: item.thumb,
      posterShape: 'landscape',
      website: item.url,
      description: item.url,
      runtime: item.duration ? formatDuration(item.duration) : undefined,
      year: new Date(item.active_date).getFullYear(),
      popularity: item.views && Number(item.views),
      isFree: 1,
    })
  }

  _normalizeStream(stream) {
    return super._normalizeStream({
      id: stream.id,
      url: stream.url,
      quality: `${stream.quality}p`,
      availability: 1,
      live: true,
      isFree: true,
    })
  }

  _makeEmbedUrl(id) {
    return `${BASE_URL}/videos/embed/${id}`
  }

  _makeDownloadUrl(id, quality) {
    return `${BASE_URL}/download/${quality}/${id}.mp4`
  }

  _parseApiResponse(response) {
    if (typeof response === 'string') {
      response = JSON.parse(response)
    }

    if (!response.success) {
      throw new Error(response.message)
    }

    return response.result
  }

  _extractQualitiesFromEmbedPage(body) {
    return body
      .match(/['"]?id['"]?:\s*['"]\d+p['"]/gi)
      .map((item) => item.match(/\d+/)[0])
      .filter((quality) => Number(quality) < 360)
  }

  async _getQualities(id) {
    const embedUrl = this._makeEmbedUrl(id)
    const { body } = await this.httpClient.request(embedUrl)
    return this._extractQualitiesFromEmbedPage(body)
  }

  async _findByPage(query, page) {
    const options = {
      json: true,
      query: {
        page,
        limit: ITEMS_PER_PAGE,
        search: query.search,
        cats: query.genre,
      },
    }
    const { body } = await this.httpClient.request(VIDEOS_API_URL, options)
    return this._parseApiResponse(body)
  }

  async _getItem(type, id) {
    const options = {
      json: true,
      query: { id, limit: 1 },
    }
    const { body } = await this.httpClient.request(VIDEOS_API_URL, options)
    return this._parseApiResponse(body)[0]
  }

  async _getStreams(type, id) {
    const qualities = await this._getQualities(id)
    return qualities.map((quality) => {
      const url = this._makeDownloadUrl(id, quality)
      return { id, url, quality }
    })
  }
}


export default PornCom
