import HubTrafficAdapter from './HubTrafficAdapter.js'


class PornHub extends HubTrafficAdapter {
  static DISPLAY_NAME = 'PornHub'
  static ITEMS_PER_PAGE = 30
  static VIDEO_ID_PARAMETER = 'id'

  _makeMethodUrl(method) {
    const methodAliases = {
      searchVideos: 'search',
      getVideoById: 'video_by_id',
    }
    return `https://www.pornhub.com/webmasters/${methodAliases[method]}`
  }

  _makeEmbedUrl(id) {
    return `https://www.pornhub.com/embed/${id}`
  }

  _extractStreamsFromEmbed(body) {
    const regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z]+\.phncdn\.com[^"']+)/gi
    const urlMatches = regexp.exec(body)

    if (!urlMatches?.[1]) {
      throw new Error('Unable to extract a stream URL from an embed page')
    }

    let url = urlMatches[1]
      .replace(/[\\/]+/g, '/')
      .replace(/(https?:\/)/, '$1/')

    if (url[0] === '/') {
      url = `https:/${url}`
    }

    return [{ url }]
  }
}


export default PornHub
