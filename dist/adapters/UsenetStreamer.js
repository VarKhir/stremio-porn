"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _BaseAdapter = _interopRequireDefault(require("./BaseAdapter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } } function _next(value) { step("next", value); } function _throw(err) { step("throw", err); } _next(); }); }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class UsenetStreamer extends _BaseAdapter.default {
  constructor(httpClient, options = {}) {
    super(httpClient);
    this.baseUrl = options.baseUrl ? options.baseUrl.replace(/\/+$/, '') : '';
  }

  supportsId(id) {
    if (!this.baseUrl || !id) {
      return false;
    }

    return /^tt\d+/i.test(id) || /^tmdb:/i.test(id) || /^tvdb:/i.test(id) || /^nzbdav:/i.test(id);
  }

  _normalizeStream(stream) {
    return super._normalizeStream(_objectSpread({}, stream, {
      name: stream.name || this.constructor.DISPLAY_NAME,
      title: stream.title || stream.name || this.constructor.DISPLAY_NAME
    }));
  }

  _findByPage() {
    return _asyncToGenerator(function* () {
      // UsenetStreamer does not expose catalogs; discovery is handled by other adapters.
      return [];
    })();
  }

  _getItem() {
    return _asyncToGenerator(function* () {
      return null;
    })();
  }

  _getStreams(type, id) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (!_this.baseUrl) {
        return [];
      }

      let url = `${_this.baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`;
      let {
        body
      } = yield _this.httpClient.request(url, {
        json: true
      });
      let streams = Array.isArray(body) ? body : body.streams;
      return Array.isArray(streams) ? streams : [];
    })();
  }

}

_defineProperty(_defineProperty(_defineProperty(UsenetStreamer, "DISPLAY_NAME", 'Usenet'), "SUPPORTED_TYPES", ['movie', 'tv']), "CATALOG_ID", 'usenet');

var _default = UsenetStreamer;
exports.default = _default;
//# sourceMappingURL=UsenetStreamer.js.map