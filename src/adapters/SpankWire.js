import HubTrafficAdapter from './HubTrafficAdapter.js'


class SpankWire extends HubTrafficAdapter {
  static DISPLAY_NAME = 'SpankWire'
  static ITEMS_PER_PAGE = 20

  _makeMethodUrl(method) {
    return `https://www.spankwire.com/api/HubTrafficApiCall?data=${method}`
  }

  _makeEmbedUrl(id) {
    return `https://www.spankwire.com/EmbedPlayer.aspx?ArticleId=${id}`
  }

  _extractStreamsFromEmbed(body) {
    const urlRegexp = /playerData.cdnPath\d+\s*=\s*["']?[^"'\s]+["']/gi
    const urlMatches = body.match(urlRegexp)

    if (!urlMatches?.length) {
      throw new Error('Unable to extract streams from an embed page')
    }

    return urlMatches.map((item) => {
      let url = item
        .match(/["']([^"'\s]+)["']/i)[1]
        .replace(/\\/g, '')

      if (url[0] === '/') {
        url = `https:${url}`
      }

      const qualityMatch = url.match(/\/(mp4_)?(\d+p|low|normal|high|ultra)/i)
      let quality

      if (qualityMatch?.[2]) {
        quality = qualityMatch[2]
        quality = quality[0].toUpperCase() + quality.slice(1).toLowerCase()
      }

      return { url, quality }
    })
  }
}


export default SpankWire
