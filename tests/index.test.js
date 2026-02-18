import { get } from 'http'
import { Client as AddonClient } from 'stremio-addons'
import PornClient from '../src/PornClient.js'


// Suppress console output during tests
const origLog = console.log
const origError = console.error
console.log = () => {}
console.error = () => {}

// Mock PornClient's invokeMethod to avoid real API calls
PornClient.prototype.invokeMethod = async () => []

function reset() {
  delete process.env.STREMIO_PORN_ID
  delete process.env.STREMIO_PORN_ENDPOINT
  delete process.env.STREMIO_PORN_PORT
  delete process.env.STREMIO_PORN_PROXY
  delete process.env.STREMIO_PORN_CACHE
  delete process.env.NODE_ENV
}

function initAddon() {
  return {
    async start() {
      const mod = await import(`../src/index.js?t=${Date.now()}`)
      this.server = mod.default

      return new Promise((resolve, reject) => {
        this.server.once('listening', () => resolve(this))
        this.server.once('error', (err) => {
          reject(err)
          this.stop()
        })
      })
    },

    stop() {
      if (!this.server) {
        return Promise.resolve(this)
      }

      const stopPromise = new Promise((resolve) => {
        this.server.once('close', () => resolve(this))
      })
      this.server.close()
      return stopPromise
    },
  }
}

describe('Addon @integration', () => {
  let addonClient
  let addon

  beforeAll(() => {
    addonClient = new AddonClient()
    addonClient.add('http://localhost')
  })

  afterAll(() => {
    console.log = origLog
    console.error = origError
  })

  beforeEach(() => {
    reset()
    addon = initAddon()
  })

  afterEach(() => {
    return addon.stop()
  })

  test('When a port is not specified, starts a web server on port 80', async () => {
    await addon.start()
    expect(addon.server.address().port).toBe(80)
  })

  test('When a port is specified, starts a web server on it', async () => {
    process.env.STREMIO_PORN_PORT = '9028'
    await addon.start()
    expect(addon.server.address().port).toBe(9028)
  })

  test('meta.get is implemented', async () => {
    await addon.start()

    await new Promise((resolve, reject) => {
      addonClient.meta.get({}, (err) => {
        err ? reject(err) : resolve()
      })
    })
  })

  test('meta.find is implemented', async () => {
    await addon.start()

    await new Promise((resolve, reject) => {
      addonClient.meta.find({}, (err) => {
        err ? reject(err) : resolve()
      })
    })
  })

  test('meta.search is implemented', async () => {
    await addon.start()

    await new Promise((resolve, reject) => {
      addonClient.meta.search({}, (err) => {
        err ? reject(err) : resolve()
      })
    })
  })

  test('stream.find is implemented', async () => {
    await addon.start()

    await new Promise((resolve, reject) => {
      addonClient.stream.find({}, (err) => {
        err ? reject(err) : resolve()
      })
    })
  })

  test('The main page is accessible', async () => {
    await addon.start()
    const res = await new Promise((resolve) => {
      get('http://localhost', resolve)
    })
    expect(res.statusCode).toBe(200)
  })

  test('The static files are accessible', async () => {
    await addon.start()
    const staticFiles = [
      'logo.png',
      'screenshot_discover.jpg',
      'bg.jpg',
    ]
    const promises = staticFiles.map((file) => {
      return new Promise((resolve) => {
        get(`http://localhost/${file}`, resolve)
      })
    })
    const responses = await Promise.all(promises)

    responses.forEach((res) => {
      const contentType = res.headers['content-type'].split(';')[0]
      expect(contentType).not.toBe('text/html')
      expect(res.statusCode).toBe(200)
    })
  })
})
