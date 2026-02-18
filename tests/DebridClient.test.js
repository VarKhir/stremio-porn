import DebridClient from '../src/DebridClient'


describe('DebridClient', () => {
  test('returns the original streams when disabled', async () => {
    let mockHttpClient = { request: jest.fn() }
    let debridClient = new DebridClient(mockHttpClient)

    let streams = [{ url: 'http://example.com/file.mp4' }]
    let result = await debridClient.unrestrictStreams(streams)

    expect(result).toEqual(streams)
    expect(mockHttpClient.request).not.toHaveBeenCalled()
  })

  test('uses Real-Debrid when a token is provided', async () => {
    let mockHttpClient = {
      request: jest.fn().mockResolvedValue({
        body: { download: 'https://real-debrid.test/direct.mp4' },
      }),
    }
    let debridClient = new DebridClient(mockHttpClient, { realDebridToken: 'token' })

    let [stream] = await debridClient.unrestrictStreams([{ url: 'http://example.com/video' }])

    expect(mockHttpClient.request).toHaveBeenCalledWith(
      'https://api.real-debrid.com/rest/1.0/unrestrict/link',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
    expect(stream.url).toBe('https://real-debrid.test/direct.mp4')
    expect(stream.name).toBe('Debrid')
  })

  test('falls back to Torbox when Real-Debrid fails', async () => {
    let mockHttpClient = {
      request: jest.fn((url) => {
        if (url.includes('real-debrid')) {
          return Promise.reject(new Error('rd unavailable'))
        }
        return Promise.resolve({ body: { link: 'https://torbox.test/direct.mp4' } })
      }),
    }
    let debridClient = new DebridClient(mockHttpClient, {
      realDebridToken: 'token',
      torboxToken: 'tor-token',
    })

    let [stream] = await debridClient.unrestrictStreams([{ url: 'http://example.com/video2' }])

    expect(mockHttpClient.request).toHaveBeenCalledTimes(2)
    expect(mockHttpClient.request.mock.calls[1][0]).toBe('https://api.torbox.app/v1/links/instant')
    expect(stream.url).toBe('https://torbox.test/direct.mp4')
  })
})
