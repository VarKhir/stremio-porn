import { readFileSync } from 'fs'
import testAdapter from '../testAdapter'
import XHamster from '../../../src/adapters/XHamster'


const SAMPLE_PAGE = readFileSync(`${__dirname}/samplePage.html`, 'utf8')


describe('XHamster', () => {
  testAdapter(XHamster)

  describe('#_parseSearchResults()', () => {
    test('parses search results from a sample page', () => {
      let adapter = new XHamster()
      let results = adapter._parseSearchResults(SAMPLE_PAGE)

      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({
        id: '12345',
        name: 'First xHamster Video',
      })
      expect(results[1]).toMatchObject({
        id: '67890',
        name: 'Second xHamster Video',
      })
    })
  })

  describe('#_extractStreamsFromPage()', () => {
    test('extracts streams from a sample video page', () => {
      let adapter = new XHamster()
      let streams = adapter._extractStreamsFromPage(SAMPLE_PAGE)

      expect(streams).toHaveLength(2)
      let qualities = streams.map((s) => s.quality).sort()
      expect(qualities).toEqual(['480', '720'])
      let stream720 = streams.find((s) => s.quality === '720')
      let stream480 = streams.find((s) => s.quality === '480')
      expect(stream720.url).toContain('720p.mp4')
      expect(stream480.url).toContain('480p.mp4')
    })
  })
})
