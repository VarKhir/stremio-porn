import got from 'got'
import HttpsProxyAgent from 'https-proxy-agent'
import HttpProxyAgent from 'http-proxy-agent'


const DEFAULT_HEADERS = {
  'user-agent': 'stremio-porn',
}
const DEFAULT_REQUEST_OPTIONS = {
  timeout: 20000,
}


class HttpClient {
  constructor(options = {}) {
    this.baseRequestOptions = {
      ...DEFAULT_REQUEST_OPTIONS,
    }

    if (options.proxy) {
      const [host, port] = options.proxy.split(':')
      const agentOptions = { host, port, secureProxy: true }

      this.baseRequestOptions.agent = {
        http: new HttpProxyAgent(agentOptions),
        https: new HttpsProxyAgent(agentOptions),
      }
    }
  }

  request(url, reqOptions = {}) {
    let headers

    if (reqOptions.headers) {
      headers = { ...DEFAULT_HEADERS, ...reqOptions.headers }
    } else {
      headers = DEFAULT_HEADERS
    }

    reqOptions = {
      ...this.baseRequestOptions,
      ...reqOptions,
      headers,
    }

    return got(url, reqOptions)
  }
}


export default HttpClient
