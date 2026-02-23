import cheerio from 'cheerio'
import BaseAdapter from './BaseAdapter'


const BASE_URL = 'https://www.xvideos.com'
const ITEMS_PER_PAGE = 27


class XVideos extends BaseAdapter {
  static DISPLAY_NAME = 'XVideos'
  static SUPPORTED_TYPES = ['movie']
  static ITEMS_PER_PAGE = ITEMS_PER_PAGE

  _normalizeItem(item) {
    return super._normalizeItem({
      type: 'movie',
      id: item.id,
      name: item.name,
      genre: item.tags || [],
      banner: item.poster,
      poster: item.poster,
      posterShape: 'landscape',
      website: item.url,
      description: item.url,
      runtime: item.duration,
      isFree: 1,
    })
  }

  _normalizeStream(stream) {
    return super._normalizeStream({
      id: stream.id,
      url: stream.url,
      title: stream.quality || 'Watch',
      availability: 1,
      isFree: true,
    })
  }

  _parseSearchResults(body) {
    let $ = cheerio.load(body)
    let items = []

    $('.thumb-block').each((i, el) => {
      let $el = $(el)
      let $link = $el.find('.thumb-inside a').first()
      let href = $link.attr('href') || ''
      let id = href.split('/')[1] || ''
      let name = $el.find('.thumb-under .title a').attr('title') ||
                 $el.find('.thumb-under .title a').text().trim() || ''
      let poster = $el.find('.thumb-inside img').attr('data-src') ||
                   $el.find('.thumb-inside img').attr('src') || ''
      let duration = $el.find('.duration').text().trim()
      let url = href.startsWith('http') ? href : `${BASE_URL}${href}`

      if (id && name) {
        items.push({ id, name, poster, duration, url })
      }
    })

    return items
  }

  _extractStreamsFromPage(body) {
    let streams = []

    // XVideos stores video URLs in html5player JavaScript calls
    let hlsMatch = body.match(
      /html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/
    )
    if (hlsMatch && hlsMatch[1]) {
      streams.push({ url: hlsMatch[1], quality: 'HLS' })
    }

    let highMatch = body.match(
      /html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/
    )
    if (highMatch && highMatch[1]) {
      streams.push({ url: highMatch[1], quality: 'High' })
    }

    let lowMatch = body.match(
      /html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/
    )
    if (lowMatch && lowMatch[1]) {
      streams.push({ url: lowMatch[1], quality: 'Low' })
    }

    return streams
  }

  async _findByPage(query, page) {
    let url
    if (query.search) {
      let encoded = encodeURIComponent(query.search)
      url = `${BASE_URL}/?k=${encoded}&p=${page - 1}`
    } else if (query.genre) {
      let encoded = encodeURIComponent(query.genre)
      url = `${BASE_URL}/c/${encoded}/${page - 1}`
    } else {
      url = page > 1
        ? `${BASE_URL}/new/${page - 1}`
        : `${BASE_URL}/new`
    }

    let { body } = await this.httpClient.request(url)
    return this._parseSearchResults(body)
  }

  async _getItem(type, id) {
    let url = `${BASE_URL}/${id}`
    let { body } = await this.httpClient.request(url)
    let $ = cheerio.load(body)

    let name = ($('meta[property="og:title"]').attr('content') || '').trim()
    let poster = $('meta[property="og:image"]').attr('content') || ''
    let pageUrl = $('meta[property="og:url"]').attr('content') || url

    return { id, name, poster, url: pageUrl }
  }

  async _getStreams(type, id) {
    let url = `${BASE_URL}/${id}`
    let { body } = await this.httpClient.request(url)
    let streams = this._extractStreamsFromPage(body)
    return streams.map((stream) => ({ ...stream, id }))
  }
}


export default XVideos
