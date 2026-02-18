import HubTrafficAdapter from './HubTrafficAdapter.js'


class YouPorn extends HubTrafficAdapter {
  static DISPLAY_NAME = 'YouPorn'
  static ITEMS_PER_PAGE = 29

  _makeMethodUrl(method) {
    const methodAliases = {
      searchVideos: 'search',
      getVideoById: 'video_by_id',
    }
    return `https://www.youporn.com/api/webmasters/${methodAliases[method]}`
  }

  _makeEmbedUrl(id) {
    return `http://www.youporn.com/embed/${id}`
  }

  _extractStreamsFromEmbed(body) {
    const regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z]+\.ypncdn\.com[^"']+)/gi

    const urlMatches = body.match(regexp)

    if (!urlMatches?.length) {
      throw new Error('Unable to extract streams from an embed page')
    }

    return urlMatches.map((item) => {
      let url = item
        .match(/http.+/)[0]
        .replace(/[\\/]+/g, '/')
        .replace(/(https?:\/)/, '$1/')
      const qualityMatch = url.match(/\/(\d+p)/i)
      const quality = qualityMatch && qualityMatch[1].toLowerCase()

      if (url[0] === '/') {
        url = `https:/${url}`
      }

      return { url, quality }
    })
  }
}


export default YouPorn
