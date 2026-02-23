import { readFileSync } from 'fs'
import testAdapter from '../testAdapter'
import XVideos from '../../../src/adapters/XVideos'


const SAMPLE_PAGE = readFileSync(`${__dirname}/samplePage.html`, 'utf8')


describe('XVideos', () => {
  testAdapter(XVideos)

  describe('#_parseSearchResults()', () => {
    test('parses search results from a sample page', () => {
      let adapter = new XVideos()
      let results = adapter._parseSearchResults(SAMPLE_PAGE)

      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({
        id: 'video12345',
        name: 'First Test Video',
      })
      expect(results[1]).toMatchObject({
        id: 'video67890',
        name: 'Second Test Video',
      })
    })
  })

  describe('#_extractStreamsFromPage()', () => {
    test('extracts streams from a sample video page', () => {
      let adapter = new XVideos()
      let streams = adapter._extractStreamsFromPage(SAMPLE_PAGE)

      expect(streams).toHaveLength(3)
      expect(streams[0]).toMatchObject({ quality: 'HLS' })
      expect(streams[0].url).toContain('m3u8')
      expect(streams[1]).toMatchObject({ quality: 'High' })
      expect(streams[1].url).toContain('test_high.mp4')
      expect(streams[2]).toMatchObject({ quality: 'Low' })
      expect(streams[2].url).toContain('test_low.mp4')
    })
  })
})
