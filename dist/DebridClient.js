"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } } function _next(value) { step("next", value); } function _throw(err) { step("throw", err); } _next(); }); }; }

class DebridClient {
  constructor(httpClient, options = {}) {
    this.httpClient = httpClient;
    this.realDebridToken = options.realDebridToken;
    this.torboxToken = options.torboxToken;
    this.torboxEndpoint = options.torboxEndpoint || 'https://api.torbox.app/v1/links/instant';
  }

  get isEnabled() {
    return Boolean(this.realDebridToken || this.torboxToken);
  }

  _encodeForm(params = {}) {
    return Object.keys(params).filter(key => params[key] !== null && params[key] !== undefined).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  }

  _pickUrl(body) {
    if (!body || typeof body !== 'object') {
      return null;
    }

    if (typeof body.download === 'string') {
      return body.download;
    }

    if (typeof body.link === 'string') {
      return body.link;
    }

    if (typeof body.location === 'string') {
      return body.location;
    }

    if (body.data && typeof body.data === 'object') {
      return this._pickUrl(body.data);
    }

    return null;
  }

  _unrestrictWithRealDebrid(url) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (!_this.realDebridToken) {
        return null;
      }

      try {
        let {
          body
        } = yield _this.httpClient.request('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${_this.realDebridToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: _this._encodeForm({
            link: url
          }),
          json: true
        });
        return _this._pickUrl(body);
      } catch (err) {
        return null;
      }
    })();
  }

  _unrestrictWithTorbox(url) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (!_this2.torboxToken) {
        return null;
      }

      try {
        let {
          body
        } = yield _this2.httpClient.request(_this2.torboxEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${_this2.torboxToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: _this2._encodeForm({
            url
          }),
          json: true
        });
        return _this2._pickUrl(body);
      } catch (err) {
        return null;
      }
    })();
  }

  _unrestrict(url) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (!url || !_this3.isEnabled) {
        return null;
      }

      let directUrl = yield _this3._unrestrictWithRealDebrid(url);

      if (directUrl) {
        return directUrl;
      }

      return _this3._unrestrictWithTorbox(url);
    })();
  }

  unrestrictStreams(streams) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (!Array.isArray(streams) || !_this4.isEnabled) {
        return streams || [];
      }

      let results = [];

      for (let stream of streams) {
        if (!stream || !stream.url) {
          results.push(stream);
          continue;
        }

        let unrestrictedUrl = yield _this4._unrestrict(stream.url);

        if (unrestrictedUrl && unrestrictedUrl !== stream.url) {
          results.push(_objectSpread({}, stream, {
            url: unrestrictedUrl,
            name: stream.name || 'Debrid'
          }));
        } else {
          results.push(stream);
        }
      }

      return results;
    })();
  }

}

var _default = DebridClient;
exports.default = _default;
//# sourceMappingURL=DebridClient.js.map