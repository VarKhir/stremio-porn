import DebridClient from '../src/DebridClient'


describe('DebridClient', () => {
  test('returns the original streams when disabled', async () => {
    let httpClient = { request: jest.fn() }
    let client = new DebridClient(httpClient)

    let streams = [{ url: 'http://example.com/file.mp4' }]
    let result = await client.unrestrictStreams(streams)

    expect(result).toEqual(streams)
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  test('uses Real-Debrid when a token is provided', async () => {
    let httpClient = {
      request: jest.fn().mockResolvedValue({
        body: { download: 'https://real-debrid.test/direct.mp4' },
      }),
    }
    let client = new DebridClient(httpClient, { realDebridToken: 'token' })

    let [stream] = await client.unrestrictStreams([{ url: 'http://example.com/video' }])

    expect(httpClient.request).toHaveBeenCalledWith(
      'https://api.real-debrid.com/rest/1.0/unrestrict/link',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    )
    expect(stream.url).toBe('https://real-debrid.test/direct.mp4')
    expect(stream.name).toBe('Debrid')
  })

  test('falls back to Torbox when Real-Debrid fails', async () => {
    let httpClient = {
      request: jest.fn((url) => {
        if (url.includes('real-debrid')) {
          return Promise.reject(new Error('rd unavailable'))
        }
        return Promise.resolve({ body: { link: 'https://torbox.test/direct.mp4' } })
      }),
    }
    let client = new DebridClient(httpClient, {
      realDebridToken: 'token',
      torboxToken: 'tor-token',
    })

    let [stream] = await client.unrestrictStreams([{ url: 'http://example.com/video2' }])

    expect(httpClient.request).toHaveBeenCalledTimes(2)
    expect(httpClient.request.mock.calls[1][0]).toBe('https://api.torbox.app/v1/links/instant')
    expect(stream.url).toBe('https://torbox.test/direct.mp4')
  })
})
