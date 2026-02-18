import HubTrafficAdapter from './HubTrafficAdapter.js'


class RedTube extends HubTrafficAdapter {
  static DISPLAY_NAME = 'RedTube'
  static TAGS_TO_SKIP = ['teens']
  static ITEMS_PER_PAGE = 20

  _makeMethodUrl(method) {
    return `https://api.redtube.com?data=redtube.Videos.${method}`
  }

  _makeEmbedUrl(id) {
    return `https://embed.redtube.com?id=${id}`
  }

  _extractStreamsFromEmbed(body) {
    const regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z_-]+\.rdtcdn\.com[^"']+)/gi
    const urlMatches = regexp.exec(body)

    if (!urlMatches?.[1]) {
      throw new Error('Unable to extract a stream URL from an embed page')
    }

    let url = urlMatches[1]
      .replace(/[\\/]+/g, '/')
      .replace(/(https?:\/)/, '$1/')
    const qualityMatch = url.match(/\/(\d+p)/i)
    const quality = qualityMatch && qualityMatch[1].toLowerCase()

    if (url[0] === '/') {
      url = `https:/${url}`
    }

    return [{ url, quality }]
  }
}


export default RedTube
