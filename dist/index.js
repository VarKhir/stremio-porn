"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _http = _interopRequireDefault(require("http"));

var _stremioAddons = _interopRequireDefault(require("stremio-addons"));

var _serveStatic = _interopRequireDefault(require("serve-static"));

var _chalk = _interopRequireDefault(require("chalk"));

var _package = _interopRequireDefault(require("../package.json"));

var _PornClient = _interopRequireDefault(require("./PornClient"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } } function _next(value) { step("next", value); } function _throw(err) { step("throw", err); } _next(); }); }; }

const SUPPORTED_METHODS = ['stream.find', 'meta.find', 'meta.search', 'meta.get'];
const STATIC_DIR = 'static';
const DEFAULT_ID = 'goonhub';
const ID = process.env.GOONHUB_ID || DEFAULT_ID;
const ENDPOINT = process.env.GOONHUB_ENDPOINT || 'http://localhost';
const PORT = process.env.GOONHUB_PORT || process.env.PORT || '80';
const PROXY = process.env.GOONHUB_PROXY || process.env.HTTPS_PROXY;
const CACHE = process.env.GOONHUB_CACHE || '1';
const EMAIL = process.env.GOONHUB_EMAIL || process.env.EMAIL;
const USENET_STREAMER = process.env.GOONHUB_USENET_STREAMER;
const IS_PROD = process.env.NODE_ENV === 'production';

if (IS_PROD && ID === DEFAULT_ID) {
  // eslint-disable-next-line no-console
  console.error(_chalk.default.red('\nWhen running in production, a non-default addon identifier must be specified\n'));
  process.exit(1);
}

function parseUserConfig(configStr) {
  if (!configStr) {
    return {};
  }

  try {
    // Convert URL-safe base64 back to standard base64
    let standard = configStr.replace(/-/g, '+').replace(/_/g, '/');
    let decoded = Buffer.from(standard, 'base64').toString('utf8');
    let config = JSON.parse(decoded);
    return config || {};
  } catch (err) {
    return {};
  }
}

let baseClientOptions = {
  proxy: PROXY,
  cache: CACHE,
  usenetStreamerUrl: USENET_STREAMER
};

let adapters = _PornClient.default.getAdapters(baseClientOptions);

let availableSites = adapters.map(a => a.DISPLAY_NAME).join(', ');
const MANIFEST = {
  name: 'GoonHub',
  id: ID,
  version: _package.default.version,
  description: `\
Time to unsheathe your sword! \
Watch porn videos and webcam streams from ${availableSites}\
`,
  types: ['movie', 'tv'],
  idProperty: _PornClient.default.ID,
  dontAnnounce: !IS_PROD,
  sorts: _PornClient.default.getSorts(baseClientOptions, adapters),
  catalogs: _PornClient.default.getCatalogs(baseClientOptions, adapters),
  resources: ['stream', 'meta', 'catalog'],
  // Stremio manifest allows advertising supported external id prefixes for stream requests
  idPrefixes: _PornClient.default.getIdPrefixes(baseClientOptions, adapters),
  // The docs mention `contactEmail`, but the template uses `email`
  email: EMAIL,
  contactEmail: EMAIL,
  endpoint: `${ENDPOINT}/stremioget/stremio/v1`,
  logo: `${ENDPOINT}/logo.png`,
  icon: `${ENDPOINT}/logo.png`,
  background: `${ENDPOINT}/bg.jpg`,
  // OBSOLETE: used in pre-4.0 stremio instead of idProperty/types
  filter: {
    [`query.${_PornClient.default.ID}`]: {
      $exists: true
    },
    'query.type': {
      $in: ['movie', 'tv']
    }
  }
};

function makeMethod(client, methodName) {
  return (
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(function* (request, cb) {
        let response;
        let error;

        try {
          response = yield client.invokeMethod(methodName, request);
        } catch (err) {
          error = err;
          /* eslint-disable no-console */

          console.error( // eslint-disable-next-line prefer-template
          _chalk.default.gray(new Date().toLocaleString()) + ' An error has occurred while processing ' + `the following request to ${methodName}:`);
          console.error(request);
          console.error(err);
          /* eslint-enable no-console */
        }

        cb(error, response);
      });

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }()
  );
}

function makeMethods(client, methodNames) {
  return methodNames.reduce((methods, methodName) => {
    methods[methodName] = makeMethod(client, methodName);
    return methods;
  }, {});
}

let defaultClient = new _PornClient.default(baseClientOptions);
let defaultMethods = makeMethods(defaultClient, SUPPORTED_METHODS);
let defaultAddon = new _stremioAddons.default.Server(defaultMethods, MANIFEST); // Cache for per-user PornClient instances (keyed by config string)

let userClients = {};
let userClientKeys = [];
const MAX_USER_CLIENTS = 100;

function getClientForConfig(configStr) {
  if (!configStr) {
    return defaultClient;
  }

  if (userClients[configStr]) {
    return userClients[configStr];
  }

  let userConfig = parseUserConfig(configStr);

  if (!userConfig.realDebridToken && !userConfig.torboxToken) {
    return defaultClient;
  }

  let clientOptions = _objectSpread({}, baseClientOptions, {
    realDebridToken: userConfig.realDebridToken,
    torboxToken: userConfig.torboxToken
  });

  let client = new _PornClient.default(clientOptions);
  userClients[configStr] = client;
  userClientKeys.push(configStr); // Evict oldest entries when cache exceeds limit

  while (userClientKeys.length > MAX_USER_CLIENTS) {
    let oldKey = userClientKeys.shift();
    delete userClients[oldKey];
  }

  return client;
}

let server = _http.default.createServer((req, res) => {
  // Handle user-configured addon routes: /<base64config>/stremioget/stremio/v1
  // Uses URL-safe base64 (- and _ instead of + and /)
  let configMatch = req.url.match(/^\/([A-Za-z0-9_-]+=*)\/stremioget\//);
  let configStr = configMatch ? configMatch[1] : null;

  if (configStr) {
    let client = getClientForConfig(configStr);
    let methods = makeMethods(client, SUPPORTED_METHODS);

    let configuredManifest = _objectSpread({}, MANIFEST, {
      endpoint: `${ENDPOINT}/${configStr}/stremioget/stremio/v1`
    });

    let configuredAddon = new _stremioAddons.default.Server(methods, configuredManifest); // Rewrite URL to remove the config prefix
    // so the Stremio server can handle it

    req.url = req.url.slice(configStr.length + 1);
    configuredAddon.middleware(req, res, () => res.end());
    return;
  }

  if (req.url === '/api/status') {
    let status = {
      manifest: {
        name: MANIFEST.name,
        version: MANIFEST.version,
        description: MANIFEST.description,
        catalogs: MANIFEST.catalogs,
        dontAnnounce: MANIFEST.dontAnnounce
      },
      config: {
        cache: CACHE !== '0',
        proxy: !!PROXY
      }
    };
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(status));
    return;
  }

  (0, _serveStatic.default)(STATIC_DIR)(req, res, () => {
    defaultAddon.middleware(req, res, () => res.end());
  });
});

server.on('listening', () => {
  let values = {
    endpoint: _chalk.default.green(MANIFEST.endpoint),
    id: ID === DEFAULT_ID ? _chalk.default.red(ID) : _chalk.default.green(ID),
    email: EMAIL ? _chalk.default.green(EMAIL) : _chalk.default.red('undefined'),
    env: IS_PROD ? _chalk.default.green('production') : _chalk.default.green('development'),
    proxy: PROXY ? _chalk.default.green(PROXY) : _chalk.default.red('off'),
    cache: CACHE === '0' ? _chalk.default.red('off') : _chalk.default.green('on') // eslint-disable-next-line no-console

  };
  console.log(`
    ${MANIFEST.name} Addon is listening on port ${PORT}

    Endpoint:    ${values.endpoint}
    Addon Id:    ${values.id}
    Email:       ${values.email}
    Environment: ${values.env}
    Proxy:       ${values.proxy}
    Cache:       ${values.cache}
    `);
}).listen(PORT);
var _default = server;
exports.default = _default;
//# sourceMappingURL=index.js.map