import cheerio from 'cheerio'
import BaseAdapter from './BaseAdapter'


const BASE_URL = 'https://xhamster.com'
const ITEMS_PER_PAGE = 24


class XHamster extends BaseAdapter {
  static DISPLAY_NAME = 'xHamster'
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

    $('[data-video-id]').each((i, el) => {
      let $el = $(el)
      let id = $el.attr('data-video-id') || ''
      let $link = $el.find('a.video-thumb__image-container').first()
      if (!$link.length) {
        $link = $el.find('a').first()
      }
      let href = $link.attr('href') || ''
      let name = $el.find('.video-thumb-info__name').text().trim() ||
                 $link.attr('title') || ''
      let poster = $el.find('img').attr('src') ||
                   $el.find('img').attr('data-src') || ''
      let duration = $el.find('.thumb-image-container__duration').text().trim()
      let url = href.startsWith('http') ? href : `${BASE_URL}${href}`

      if (id && name) {
        items.push({ id, name, poster, duration, url })
      }
    })

    return items
  }

  _extractStreamsFromPage(body) {
    let streams = []

    // xHamster stores video URLs in window.initials JSON
    let initialsMatch = body.match(
      /window\.initials\s*=\s*(\{[\s\S]*?\});/
    )
    if (initialsMatch && initialsMatch[1]) {
      try {
        let initials = JSON.parse(initialsMatch[1])
        let sources = initials.videoModel && initials.videoModel.sources
        if (sources && sources.mp4 && typeof sources.mp4 === 'object') {
          Object.keys(sources.mp4).forEach((quality) => {
            let entry = sources.mp4[quality]
            let url = (entry && typeof entry === 'object') ? entry.url : entry
            if (url && typeof url === 'string') {
              streams.push({ url, quality })
            }
          })
        }
      } catch (err) {
        // Ignore JSON parse errors
      }
    }

    return streams
  }

  async _findByPage(query, page) {
    let url
    if (query.search) {
      let encoded = encodeURIComponent(query.search)
      url = `${BASE_URL}/search/${encoded}?page=${page}`
    } else if (query.genre) {
      let encoded = encodeURIComponent(query.genre)
      url = `${BASE_URL}/categories/${encoded}?page=${page}`
    } else {
      url = `${BASE_URL}/newest?page=${page}`
    }

    let { body } = await this.httpClient.request(url)
    return this._parseSearchResults(body)
  }

  async _getItem(type, id) {
    let url = `${BASE_URL}/videos/${id}`
    let { body } = await this.httpClient.request(url)
    let $ = cheerio.load(body)

    let name = ($('meta[property="og:title"]').attr('content') || '').trim()
    let poster = $('meta[property="og:image"]').attr('content') || ''
    let pageUrl = $('meta[property="og:url"]').attr('content') || url

    return { id, name, poster, url: pageUrl }
  }

  async _getStreams(type, id) {
    let url = `${BASE_URL}/videos/${id}`
    let { body } = await this.httpClient.request(url)
    let streams = this._extractStreamsFromPage(body)
    return streams.map((stream) => ({ ...stream, id }))
  }
}


export default XHamster
