import PornClient from '../src/PornClient'


describe('PornClient', () => {
  let client

  beforeEach(() => {
    client = new PornClient({ cache: '0' })
  })

  describe('#_invokeAdapterMethod()', () => {
    test('returns empty array on adapter error', async () => {
      let fakeAdapter = {
        constructor: { name: 'TestAdapter' },
        find: jest.fn().mockRejectedValue(
          new Error('Network error')
        ),
      }

      let result = await client._invokeAdapterMethod(
        fakeAdapter, 'find', {}, 'id'
      )

      expect(result).toEqual([])
    })
  })

  describe('#_invokeMethod()', () => {
    test(
      'returns empty array when no adapters match',
      async () => {
        let request = {
          query: { type: 'nonexistent' },
          sort: {
            'popularities.porn.NoSuchAdapter': -1,
          },
        }

        let result = await client._invokeMethod(
          'find', request, 'id'
        )

        expect(result).toEqual([])
      }
    )
  })

  describe('#invokeMethod()', () => {
    test(
      'returns empty array for meta.find with bad adapter',
      async () => {
        let request = {
          query: { type: 'movie' },
          sort: {
            'popularities.porn.NoSuchAdapter': -1,
          },
        }

        let result = await client.invokeMethod(
          'meta.find', request
        )

        expect(result).toEqual([])
      }
    )
  })
})
