import DebridClient from '../src/DebridClient.js'


describe('DebridClient', () => {
  test('returns the original streams when disabled', async () => {
    const mockHttpClient = { request: jest.fn() }
    const debridClient = new DebridClient(mockHttpClient)

    const streams = [{ url: 'http://example.com/file.mp4' }]
    const result = await debridClient.unrestrictStreams(streams)

    expect(result).toEqual(streams)
    expect(mockHttpClient.request).not.toHaveBeenCalled()
  })

  test('uses Real-Debrid when a token is provided', async () => {
    const mockHttpClient = {
      request: jest.fn().mockResolvedValue({
        body: { download: 'https://real-debrid.test/direct.mp4' },
      }),
    }
    const debridClient = new DebridClient(mockHttpClient, { realDebridToken: 'token' })

    const [stream] = await debridClient.unrestrictStreams([{ url: 'http://example.com/video' }])

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      'https://api.real-debrid.com/rest/1.0/unrestrict/link',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
    expect(stream.url).toBe('https://real-debrid.test/direct.mp4')
    expect(stream.name).toBe('[RD] Debrid')
  })

  test('falls back to Torbox when Real-Debrid fails', async () => {
    const mockHttpClient = {
      request: jest.fn((url) => {
        if (url.includes('real-debrid')) {
          return Promise.reject(new Error('rd unavailable'))
        }
        if (url.includes('checkcached')) {
          return Promise.resolve({ body: { data: { cached: true } } })
        }
        return Promise.resolve({ body: { link: 'https://torbox.test/direct.mp4' } })
      }),
    }
    const debridClient = new DebridClient(mockHttpClient, {
      realDebridToken: 'token',
      torboxToken: 'tor-token',
    })

    const [stream] = await debridClient.unrestrictStreams([{ url: 'http://example.com/video2' }])

    expect(mockHttpClient.request).toHaveBeenCalledTimes(3)
    expect(mockHttpClient.request.mock.calls[1][0]).toContain('checkcached')
    expect(mockHttpClient.request.mock.calls[2][0]).toBe('https://api.torbox.app/v1/links/instant')
    expect(stream.url).toBe('https://torbox.test/direct.mp4')
    expect(stream.name).toBe('[TB] ⚡ Debrid')
  })

  test('skips Torbox unrestrict when cache check returns not cached', async () => {
    const mockHttpClient = {
      request: jest.fn((url) => {
        if (url.includes('checkcached')) {
          return Promise.resolve({ body: { data: { cached: false } } })
        }
        return Promise.resolve({ body: {} })
      }),
    }
    const debridClient = new DebridClient(mockHttpClient, { torboxToken: 'tor-token' })

    const [stream] = await debridClient.unrestrictStreams([{ url: 'http://example.com/video' }])

    expect(stream.url).toBe('http://example.com/video')
    const unrestrictCalls = mockHttpClient.request.mock.calls.filter(
      (call) => call[0].includes('links/instant')
    )
    expect(unrestrictCalls).toHaveLength(0)
  })

  test('proceeds with Torbox unrestrict when cache check fails', async () => {
    const mockHttpClient = {
      request: jest.fn((url) => {
        if (url.includes('checkcached')) {
          return Promise.reject(new Error('network error'))
        }
        return Promise.resolve({ body: { link: 'https://torbox.test/direct.mp4' } })
      }),
    }
    const debridClient = new DebridClient(mockHttpClient, { torboxToken: 'tor-token' })

    const [stream] = await debridClient.unrestrictStreams([{ url: 'http://example.com/video' }])

    expect(stream.url).toBe('https://torbox.test/direct.mp4')
    expect(stream.name).toBe('[TB] ⚡ Debrid')
  })

  test('preserves existing stream name with debrid tag', async () => {
    const mockHttpClient = {
      request: jest.fn().mockResolvedValue({
        body: { download: 'https://real-debrid.test/direct.mp4' },
      }),
    }
    const debridClient = new DebridClient(mockHttpClient, {
      realDebridToken: 'token',
    })

    const [stream] = await debridClient.unrestrictStreams([
      { url: 'http://example.com/video', name: 'PornHub' },
    ])

    expect(stream.url).toBe('https://real-debrid.test/direct.mp4')
    expect(stream.name).toBe('[RD] PornHub')
  })
})
