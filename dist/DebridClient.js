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
    this.torboxEndpoint = 'https://api.torbox.app/v1/links/instant';
    this.torboxCacheEndpoint = 'https://api.torbox.app/v1/api/webdl/checkcached';
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

  _checkTorboxCache(url) {
    var _this = this;

    return _asyncToGenerator(function* () {
      if (!_this.torboxToken || !url) {
        return null;
      }

      try {
        let encoded = encodeURIComponent(url);
        let checkUrl = `${_this.torboxCacheEndpoint}?url=${encoded}`;
        let {
          body
        } = yield _this.httpClient.request(checkUrl, {
          headers: {
            Authorization: `Bearer ${_this.torboxToken}`
          },
          json: true
        });

        if (body && body.data && body.data.cached === true) {
          return true;
        }

        return false;
      } catch (err) {
        return null;
      }
    })();
  }

  _unrestrictWithRealDebrid(url) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      if (!_this2.realDebridToken) {
        return null;
      }

      try {
        let {
          body
        } = yield _this2.httpClient.request('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${_this2.realDebridToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: _this2._encodeForm({
            link: url
          }),
          json: true
        });
        return _this2._pickUrl(body);
      } catch (err) {
        return null;
      }
    })();
  }

  _unrestrictWithTorbox(url) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      if (!_this3.torboxToken) {
        return null;
      }

      try {
        let isCached = yield _this3._checkTorboxCache(url);

        if (isCached === false) {
          return null;
        }

        let {
          body
        } = yield _this3.httpClient.request(_this3.torboxEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${_this3.torboxToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: _this3._encodeForm({
            url
          }),
          json: true
        });
        return _this3._pickUrl(body);
      } catch (err) {
        return null;
      }
    })();
  }

  _unrestrict(url) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      if (!url || !_this4.isEnabled) {
        return null;
      }

      let directUrl = yield _this4._unrestrictWithRealDebrid(url);

      if (directUrl) {
        return {
          url: directUrl,
          service: 'RD'
        };
      }

      directUrl = yield _this4._unrestrictWithTorbox(url);

      if (directUrl) {
        return {
          url: directUrl,
          service: 'TB'
        };
      }

      return null;
    })();
  }

  unrestrictStreams(streams) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      if (!Array.isArray(streams) || !_this5.isEnabled) {
        return streams || [];
      }

      return Promise.all(streams.map(
      /*#__PURE__*/
      function () {
        var _ref = _asyncToGenerator(function* (stream) {
          if (!stream || !stream.url) {
            return stream;
          }

          let result = yield _this5._unrestrict(stream.url);

          if (result && result.url !== stream.url) {
            let tag = result.service === 'TB' ? '[TB] ⚡' : `[${result.service}]`;
            return _objectSpread({}, stream, {
              url: result.url,
              name: `${tag} ${stream.name || 'Debrid'}`
            });
          } else {
            return stream;
          }
        });

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }()));
    })();
  }

}

var _default = DebridClient;
exports.default = _default;
//# sourceMappingURL=DebridClient.js.map