import HttpClient from '../../src/HttpClient.js'


function testAdapter(AdapterClass, items = []) {
  describe('@integration', () => {
    jest.setTimeout(20000)

    let adapter

    beforeEach(() => {
      const httpClient = new HttpClient({
        proxy: process.env.STREMIO_PORN_PROXY,
      })
      adapter = new AdapterClass(httpClient)
    })

    describe('#find()', () => {
      test('when no request query is provided, returns trending items', async () => {
        const type = AdapterClass.SUPPORTED_TYPES[0]
        const results = await adapter.find({
          query: { type },
        })

        expect(results.length).toBeGreaterThan(0)
        results.forEach((result) => {
          expect(result.id).toBeTruthy()
        })
      })

      test('when a search string is provided, returns matching items', async () => {
        const search = 'deep'
        const limit = 3
        const type = AdapterClass.SUPPORTED_TYPES[0]
        const results = await adapter.find({
          query: { search, type },
          limit,
        })

        expect(results.length).toBeLessThanOrEqual(limit)
        results.forEach((result) => {
          expect(result.id).toBeTruthy()
        })
      })
    })

    describe('#getItem()', () => {
      items
        .filter((item) => item.match)
        .forEach(({ id, type, match }) => {
          test(`retrieves ${type} ${id}`, async () => {
            const query = { type, id }
            const [result] = await adapter.getItem({ query })

            expect(result).toMatchObject(match)
          })
        })
    })

    describe('#getStreams()', () => {
      items
        .filter((item) => item.streams === true)
        .forEach(({ id, type }) => {
          test(`doesn't throw for ${type} ${id}`, async () => {
            const query = { type, id }
            return adapter.getStreams({ query })
          })
        })

      items
        .filter((item) => Array.isArray(item.streams))
        .forEach(({ id, type, streams }) => {
          test(`retrieves streams for ${type} ${id}`, async () => {
            const query = { type, id }
            const results = await adapter.getStreams({ query })

            expect(results).toHaveLength(streams.length)
            streams.forEach((stream) => {
              const includesStream = Boolean(results.find((result) => {
                return result.url.includes(stream)
              }))
              expect(includesStream).toBe(true)
            })
          })
        })
    })
  })
}

export default testAdapter
