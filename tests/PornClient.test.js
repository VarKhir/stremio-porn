import PornClient from '../src/PornClient'


describe('PornClient', () => {
  test('returns empty array when no adapters match the request', async () => {
    let client = new PornClient({ cache: '0' })
    let request = {
      query: { type: 'unknown_type' },
      sort: { 'popularities.porn.PornHub': -1 },
    }

    let result = await client.invokeMethod('meta.find', request)

    expect(result).toEqual([])
  })

  test('returns empty array when adapter throws during catalog find', async () => {
    let client = new PornClient({ cache: '0' })

    client.adapters.forEach((adapter) => {
      adapter.find = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('API unavailable'))
      })
    })

    let request = {
      query: { type: 'movie' },
      sort: { 'popularities.porn.PornHub': -1 },
    }

    let result = await client.invokeMethod('meta.find', request)

    expect(result).toEqual([])
  })

  test('returns empty array when adapter throws during stream find', async () => {
    let client = new PornClient({ cache: '0' })

    client.adapters.forEach((adapter) => {
      adapter.getStreams = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Stream extraction failed'))
      })
    })

    let request = {
      query: {
        type: 'movie',
        porn_id: 'porn_id:PornHub-movie-abc123',
      },
    }

    let result = await client.invokeMethod('stream.find', request)

    expect(result).toEqual([])
  })

  test('returns undefined (not throw) for meta.get when adapter throws', async () => {
    let client = new PornClient({ cache: '0' })

    client.adapters.forEach((adapter) => {
      adapter.getItem = jest.fn().mockImplementation(() => {
        return Promise.reject(new Error('Not found'))
      })
    })

    let request = {
      query: {
        type: 'movie',
        porn_id: 'porn_id:PornHub-movie-abc123',
      },
    }

    let result = await client.invokeMethod('meta.get', request)

    expect(result).toBeUndefined()
  })
})
