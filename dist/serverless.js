"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = handler;

var _stremioAddonSdk = require("stremio-addon-sdk");

var _addon = _interopRequireDefault(require("./addon"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let router = (0, _stremioAddonSdk.getRouter)(_addon.default);

function handler(req, res) {
  router(req, res, () => {
    res.statusCode = 404;
    res.end();
  });
}
//# sourceMappingURL=serverless.js.map