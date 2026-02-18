import * as cheerio from 'cheerio'
import BaseAdapter from './BaseAdapter.js'


const BASE_URL = 'https://chaturbate.com'
const GET_STREAM_URL = 'https://chaturbate.com/get_edge_hls_url_ajax/'
const ITEMS_PER_PAGE = 60
const SUPPORTED_TYPES = ['tv']


class Chaturbate extends BaseAdapter {
  static DISPLAY_NAME = 'Chaturbate'
  static SUPPORTED_TYPES = SUPPORTED_TYPES
  static ITEMS_PER_PAGE = ITEMS_PER_PAGE

  _normalizeItem(item) {
    return super._normalizeItem({
      type: 'tv',
      id: item.id,
      name: item.id,
      genre: item.tags,
      banner: item.poster,
      poster: item.poster,
      posterShape: 'landscape',
      website: item.url,
      description: item.subject,
      popularity: item.viewers,
      isFree: true,
    })
  }

  _normalizeStream(stream) {
    return super._normalizeStream({
      ...stream,
      title: 'Watch',
      availability: 1,
      live: true,
      isFree: true,
    })
  }

  _parseListPage(body) {
    const $ = cheerio.load(body)
    const tagRegexp = /#\S+/g
    return $('.list > li').map((i, item) => {
      const $item = $(item)
      const $link = $item.find('.title > a')
      const id = $link.text().trim()
      const url = BASE_URL + $link.attr('href')
      const subject = $item.find('.subject').text().trim()
      const tags = (subject.match(tagRegexp) || []).map((tag) => tag.slice(1))
      const poster = $item.find('img').attr('src')
      let viewers = $item.find('.cams').text().match(/(\d+) viewers/i)
      viewers = viewers && Number(viewers[1])
      return { id, url, subject, poster, tags, viewers }
    }).toArray()
  }

  _parseItemPage(body) {
    const $ = cheerio.load(body)
    const tagRegexp = /#\S+/g
    const url = $('meta[property="og:url"]').attr('content')
    const id = url.split('/').slice(-2, -1)[0]
    const subject = $('meta[property="og:description"]').attr('content').trim()
    const tags = (subject.match(tagRegexp) || []).map((tag) => tag.slice(1))
    const poster = $('meta[property="og:image"]').attr('content')
    return { id, url, subject, poster, tags }
  }

  async _findByPage(query, page) {
    const options = {
      query: {
        page,
        keywords: query.search,
      },
    }
    const url = query.genre ? `${BASE_URL}/tag/${query.genre}` : BASE_URL
    const { body } = await this.httpClient.request(url, options)
    return this._parseListPage(body)
  }

  async _getItem(type, id) {
    const url = `${BASE_URL}/${id}`
    const { body } = await this.httpClient.request(url)
    return this._parseItemPage(body)
  }

  async _getStreams(type, id) {
    const options = {
      form: true,
      json: true,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `${BASE_URL}/${id}`,
      },
      body: {
        room_slug: id,
        bandwidth: 'high',
      },
    }
    const { body } = await this.httpClient.request(GET_STREAM_URL, options)

    if (body.success && body.room_status === 'public') {
      return [{ id, url: body.url }]
    }
    return []
  }
}


export default Chaturbate
