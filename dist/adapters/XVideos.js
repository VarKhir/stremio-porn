"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _cheerio = _interopRequireDefault(require("cheerio"));

var _BaseAdapter = _interopRequireDefault(require("./BaseAdapter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } } function _next(value) { step("next", value); } function _throw(err) { step("throw", err); } _next(); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const BASE_URL = 'https://www.xvideos.com';
const ITEMS_PER_PAGE = 27;

class XVideos extends _BaseAdapter.default {
  _normalizeItem(item) {
    return super._normalizeItem({
      type: 'movie',
      id: item.id,
      name: item.name,
      genre: item.tags || [],
      banner: item.poster,
      poster: item.poster,
      posterShape: 'landscape',
      website: item.url,
      description: item.url,
      runtime: item.duration,
      isFree: 1
    });
  }

  _normalizeStream(stream) {
    return super._normalizeStream({
      id: stream.id,
      url: stream.url,
      title: stream.quality || 'Watch',
      availability: 1,
      isFree: true
    });
  }

  _parseSearchResults(body) {
    let $ = _cheerio.default.load(body);

    let items = [];
    $('.thumb-block').each((i, el) => {
      let $el = $(el);
      let $link = $el.find('.thumb-inside a').first();
      let href = $link.attr('href') || '';
      let id = href.split('/')[1] || '';
      let name = $el.find('.thumb-under .title a').attr('title') || $el.find('.thumb-under .title a').text().trim() || '';
      let poster = $el.find('.thumb-inside img').attr('data-src') || $el.find('.thumb-inside img').attr('src') || '';
      let duration = $el.find('.duration').text().trim();
      let url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

      if (id && name) {
        items.push({
          id,
          name,
          poster,
          duration,
          url
        });
      }
    });
    return items;
  }

  _extractStreamsFromPage(body) {
    let streams = []; // XVideos stores video URLs in html5player JavaScript calls

    let hlsMatch = body.match(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/);

    if (hlsMatch && hlsMatch[1]) {
      streams.push({
        url: hlsMatch[1],
        quality: 'HLS'
      });
    }

    let highMatch = body.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/);

    if (highMatch && highMatch[1]) {
      streams.push({
        url: highMatch[1],
        quality: 'High'
      });
    }

    let lowMatch = body.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/);

    if (lowMatch && lowMatch[1]) {
      streams.push({
        url: lowMatch[1],
        quality: 'Low'
      });
    }

    return streams;
  }

  _findByPage(query, page) {
    var _this = this;

    return _asyncToGenerator(function* () {
      let url;

      if (query.search) {
        let encoded = encodeURIComponent(query.search);
        url = `${BASE_URL}/?k=${encoded}&p=${page - 1}`;
      } else if (query.genre) {
        let encoded = encodeURIComponent(query.genre);
        url = `${BASE_URL}/c/${encoded}/${page - 1}`;
      } else {
        url = page > 1 ? `${BASE_URL}/new/${page - 1}` : `${BASE_URL}/new`;
      }

      let {
        body
      } = yield _this.httpClient.request(url);
      return _this._parseSearchResults(body);
    })();
  }

  _getItem(type, id) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      let url = `${BASE_URL}/${id}`;
      let {
        body
      } = yield _this2.httpClient.request(url);

      let $ = _cheerio.default.load(body);

      let name = ($('meta[property="og:title"]').attr('content') || '').trim();
      let poster = $('meta[property="og:image"]').attr('content') || '';
      let pageUrl = $('meta[property="og:url"]').attr('content') || url;
      return {
        id,
        name,
        poster,
        url: pageUrl
      };
    })();
  }

  _getStreams(type, id) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      let url = `${BASE_URL}/${id}`;
      let {
        body
      } = yield _this3.httpClient.request(url);

      let streams = _this3._extractStreamsFromPage(body);

      return streams.map(stream => _objectSpread({}, stream, {
        id
      }));
    })();
  }

}

_defineProperty(_defineProperty(_defineProperty(XVideos, "DISPLAY_NAME", 'XVideos'), "SUPPORTED_TYPES", ['movie']), "ITEMS_PER_PAGE", ITEMS_PER_PAGE);

var _default = XVideos;
exports.default = _default;
//# sourceMappingURL=XVideos.js.map