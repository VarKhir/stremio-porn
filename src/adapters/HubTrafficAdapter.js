import { URL } from 'url'
import BaseAdapter from './BaseAdapter.js'


class HubTrafficAdapter extends BaseAdapter {
  static SUPPORTED_TYPES = ['movie']
  static TAGS_TO_SKIP = []
  static VIDEO_ID_PARAMETER = 'video_id'

  _normalizeItem(item) {
    const video = item.video || item
    const { TAGS_TO_SKIP } = this.constructor
    const tags = video.tags && Object.values(video.tags)
      .map((tag) => {
        return (typeof tag === 'string') ? tag : tag.tag_name
      })
      .filter((tag) => !TAGS_TO_SKIP.includes(tag.toLowerCase()))

    return super._normalizeItem({
      type: 'movie',
      id: video.video_id || video.id,
      name: video.title.trim(),
      genre: tags,
      banner: video.thumb,
      poster: video.thumb,
      posterShape: 'landscape',
      year: video.publish_date?.split('-')[0],
      website: video.url,
      description: video.url,
      runtime: video.duration,
      popularity: Number(video.views),
      isFree: 1,
    })
  }

  _normalizeStream(stream) {
    const quality =
      (stream.quality?.trim()) || 'SD'

    return super._normalizeStream({
      ...stream,
      quality,
      availability: 1,
      isFree: 1,
    })
  }

  _makeMethodUrl() {
    throw new Error('Not implemented')
  }

  _makeEmbedUrl() {
    throw new Error('Not implemented')
  }

  _extractStreamsFromEmbed() {
    throw new Error('Not implemented')
  }

  async _requestApi(method, params) {
    const options = {
      json: true,
    }
    let url = this._makeMethodUrl(method)

    if (params) {
      url = new URL(url)
      Object.keys(params).forEach((name) => {
        if (params[name] !== undefined) {
          url.searchParams.set(name, params[name])
        }
      })
    }

    const { body } = await this.httpClient.request(url, options)

    if (body.code && Number(body.code) !== 2001 && Number(body.code) !== 2002) {
      const err = new Error(body.message)
      err.code = Number(body.code)
      throw err
    }

    return body
  }

  async _findByPage(query, page) {
    const { ITEMS_PER_PAGE } = this.constructor
    const newQuery = {
      'tags[]': query.genre,
      search: query.search,
      period: 'weekly',
      ordering: 'mostviewed',
      thumbsize: 'medium',
      page,
    }

    let result = await this._requestApi('searchVideos', newQuery)
    let videos = result.videos || result.video || []

    if (!query.search && page === 1 && videos.length < ITEMS_PER_PAGE) {
      newQuery.period = 'monthly'
      result = await this._requestApi('searchVideos', newQuery)
      const monthlyVideos = result.videos || result.video || []
      videos = videos.concat(monthlyVideos).slice(0, ITEMS_PER_PAGE)
    }

    return videos
  }

  async _getItem(type, id) {
    const query = {
      [this.constructor.VIDEO_ID_PARAMETER]: id,
    }

    return this._requestApi('getVideoById', query)
  }

  async _getStreams(type, id) {
    const url = this._makeEmbedUrl(id)
    const { body } = await this.httpClient.request(url)

    const streams = this._extractStreamsFromEmbed(body)
    return streams?.map((stream) => {
      stream.id = id
      return stream
    })
  }
}


export default HubTrafficAdapter
