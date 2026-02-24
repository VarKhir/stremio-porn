import PornHub from '../../src/adapters/PornHub'
import RedTube from '../../src/adapters/RedTube'
import YouPorn from '../../src/adapters/YouPorn'
import SpankWire from '../../src/adapters/SpankWire'
import PornCom from '../../src/adapters/PornCom'


describe('Stream extraction graceful failure', () => {
  test('PornHub returns empty array when embed page has no matching URLs', () => {
    let adapter = new PornHub()
    let result = adapter._extractStreamsFromEmbed('<html>no video here</html>')

    expect(result).toEqual([])
  })

  test('RedTube returns empty array when embed page has no matching URLs', () => {
    let adapter = new RedTube()
    let result = adapter._extractStreamsFromEmbed('<html>no video here</html>')

    expect(result).toEqual([])
  })

  test('YouPorn returns empty array when embed page has no matching URLs', () => {
    let adapter = new YouPorn()
    let result = adapter._extractStreamsFromEmbed('<html>no video here</html>')

    expect(result).toEqual([])
  })

  test('SpankWire returns empty array when embed page has no matching URLs', () => {
    let adapter = new SpankWire()
    let result = adapter._extractStreamsFromEmbed('<html>no video here</html>')

    expect(result).toEqual([])
  })

  test('PornCom returns empty array when embed page has no quality matches', () => {
    let adapter = new PornCom()
    let result = adapter._extractQualitiesFromEmbedPage('<html>no quality</html>')

    expect(result).toEqual([])
  })
})
