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

const BASE_URL = 'https://xhamster.com';
const ITEMS_PER_PAGE = 24;

class XHamster extends _BaseAdapter.default {
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
    $('[data-video-id]').each((i, el) => {
      let $el = $(el);
      let id = $el.attr('data-video-id') || '';
      let $link = $el.find('a.video-thumb__image-container').first();

      if (!$link.length) {
        $link = $el.find('a').first();
      }

      let href = $link.attr('href') || '';
      let name = $el.find('.video-thumb-info__name').text().trim() || $link.attr('title') || '';
      let poster = $el.find('img').attr('src') || $el.find('img').attr('data-src') || '';
      let duration = $el.find('.thumb-image-container__duration').text().trim();
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
    let streams = []; // xHamster stores video URLs in window.initials JSON

    let initialsMatch = body.match(/window\.initials\s*=\s*(\{[\s\S]*?\});/);

    if (initialsMatch && initialsMatch[1]) {
      try {
        let initials = JSON.parse(initialsMatch[1]);
        let sources = initials.videoModel && initials.videoModel.sources;

        if (sources && sources.mp4 && typeof sources.mp4 === 'object') {
          Object.keys(sources.mp4).forEach(quality => {
            let entry = sources.mp4[quality];
            let url = entry && typeof entry === 'object' ? entry.url : entry;

            if (url && typeof url === 'string') {
              streams.push({
                url,
                quality
              });
            }
          });
        }
      } catch (err) {// Ignore JSON parse errors
      }
    }

    return streams;
  }

  _findByPage(query, page) {
    var _this = this;

    return _asyncToGenerator(function* () {
      let url;

      if (query.search) {
        let encoded = encodeURIComponent(query.search);
        url = `${BASE_URL}/search/${encoded}?page=${page}`;
      } else if (query.genre) {
        let encoded = encodeURIComponent(query.genre);
        url = `${BASE_URL}/categories/${encoded}?page=${page}`;
      } else {
        url = `${BASE_URL}/newest?page=${page}`;
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
      let url = `${BASE_URL}/videos/${id}`;
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
      let url = `${BASE_URL}/videos/${id}`;
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

_defineProperty(_defineProperty(_defineProperty(XHamster, "DISPLAY_NAME", 'xHamster'), "SUPPORTED_TYPES", ['movie']), "ITEMS_PER_PAGE", ITEMS_PER_PAGE);

var _default = XHamster;
exports.default = _default;
//# sourceMappingURL=XHamster.js.map