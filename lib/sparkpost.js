const packageJSON = import('../package.json');
const version = packageJSON.version;

//REST API Config Defaults
const defaults = {
  origin: 'https://api.sparkpost.com:443',
  apiVersion: 'v1',
  debug: false
};

const resolveUri = async function(origin, uri) {
  const url = await import('url');

  if (!/^http/.test(uri)) {
    uri = url.resolve(origin, uri);
  }
  return uri;
};

const handleOptions = function(apiKey, options) {
  if (typeof apiKey === 'object') {
    options = apiKey;
    options.key = process.env.SPARKPOST_API_KEY;
  } else {
    options = options || {};
    options.key = apiKey;
  }

  options.origin = options.origin || options.endpoint || defaults.origin;

  return options;
};

const createSparkPostError = function(res, body) {
  const err = new Error(res.statusMessage);
  body = body || {};
  err.name = 'SparkPostError';
  err.errors = body.errors;
  err.statusCode = res.statusCode;

  return err;
};

const createVersionStr = function(version, options) {
  let versionStr = `node-sparkpost/${version} node.js/${process.version}`;
  if (options.stackIdentity) {
    versionStr += `${options.stackIdentity} ${versionStr}`;
  }
  return versionStr;
};

export const SparkPost = function(apiKey, options) {

  options = handleOptions(apiKey, options);

  this.apiKey = options.key || process.env.SPARKPOST_API_KEY;

  if (typeof this.apiKey === 'undefined') {
    throw new Error('Client requires an API Key.');
  }

  // adding version to object
  this.version = version;

  //Optional client config
  this.origin = options.origin;
  this.apiVersion = options.apiVersion || defaults.apiVersion;
  this.debug = (typeof options.debug === 'boolean') ? options.debug : defaults.debug;

  (async() => {
    const _ = (await import('lodash')).default;
    // setting up default headers
    this.defaultHeaders = _.merge({
      'User-Agent': createVersionStr(version, options)
      , 'Content-Type': 'application/json'
    }, options.headers);

    this.inboundDomains = await import('./inboundDomains').then((module) => module.default(this));
    this.messageEvents = await import('./messageEvents').then((module) => module.default(this));
    this.events = await import('./events').then((module) => module.default(this));
    this.recipientLists = await import('./recipientLists').then((module) => module.default(this));
    this.relayWebhooks = await import('./relayWebhooks').then((module) => module.default(this));
    this.sendingDomains = await import('./sendingDomains').then((module) => module.default(this));
    this.subaccounts = await import('./subaccounts').then((module) => module.default(this));
    this.suppressionList = await import('./suppressionList').then((module) => module.default(this));
    this.templates = await import('./templates').then((module) => module.default(this));
    this.transmissions = await import('./transmissions').then((module) => module.default(this));
    this.webhooks = await import('./webhooks').then((module) => module.default(this));
  })();
};

SparkPost.prototype.request = async function requestFunc(options, callback) {
  validateOptions(options);
  const url = await resolveUri(`${this.origin}/api/${this.apiVersion}/`, options.uri);
  const fetchOptions = createFetchOptions(this, options);

  try {
    const response = await fetch(url, fetchOptions);
    const body = await handleResponse(response, options.debug);
    return handleCallback(callback, null, body);
  } catch (error) {
    return handleCallback(callback, error);
  }
};

// Validates options argument
function validateOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('options argument is required');
  }
}

// Creates fetch options
function createFetchOptions(context, options) {
  return {
    method: options.method || 'GET',
    headers: {
      ...context.defaultHeaders,
      ...options.headers,
      Authorization: context.apiKey
    },
    body: options.body,
    compress: options.gzip !== false
  };
}

// Handles the HTTP response
/* eslint-disable complexity */
async function handleResponse(response, debug) {
  const zlib = await import('zlib');
  let body;

  if (!response.ok) {
    const body = await response.text();
    throw createSparkPostError(response, body);
  }

  const contentEncoding = response.headers.get('content-encoding');

  if (contentEncoding === 'gzip') {
    // Read and decompress the gzip response
    const buffer = await response.arrayBuffer();
    const decompressedBuffer = await new Promise((resolve, reject) => {
      zlib.gunzip(Buffer.from(buffer), (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    const decompressedBody = decompressedBuffer.toString('utf-8');
    const contentType = response.headers.get('content-type');

    body = contentType && contentType.includes('application/json')
      ? JSON.parse(decompressedBody)
      : decompressedBody;

  } else {
    const contentType = response.headers.get('content-type');

    body = contentType && contentType.includes('application/json')
      ? await response.json()
      : await response.text();
  }

  if (debug && typeof body === Object) {
    body.debug = response;
  }

  return body;
}

// Handles callback or promise resolution
function handleCallback(callback, error, body) {
  // console.log('..................', callback, { error }, { body });

  if (callback) {
    if (error) {
      callback(error);
    } else {
      callback(null, body);
    }
  } else if (error) {
    throw error;
  } else {
    return body;
  }
}


SparkPost.prototype.get = function getFunc(options, callback) {
  options.method = 'GET';
  options.json = true;

  return this.request(options, callback);
};

SparkPost.prototype.post = function postFunc(options, callback) {
  options.method = 'POST';

  return this.request(options, callback);
};

SparkPost.prototype.put = function putFunc(options, callback) {
  options.method = 'PUT';

  return this.request(options, callback);
};

SparkPost.prototype.delete = function deleteFunc(options, callback) {
  options.method = 'DELETE';

  return this.request(options, callback);
};

SparkPost.prototype.reject = async function rejectFunc(error, callback) {
  const withCallback = (await import('./withCallback.js')).default;

  return withCallback(Promise.reject(error), callback);
};

/**
 * Standard error-first callback for HTTP requests

 * @callback RequestCb
 * @param {Error} err - Any error that occurred
 * @param {Object} [data] - API response body (or just the value of `body.results`, if it exists)
 */
