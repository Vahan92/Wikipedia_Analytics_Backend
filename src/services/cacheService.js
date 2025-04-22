const NodeCache = require('node-cache');
const ttl = Number(process.env.CACHE_TTL_SECONDS) || 7200;
const cache = new NodeCache({ stdTTL: ttl });

module.exports = {
  get: (k) => cache.get(k),
  set: (k, v) => cache.set(k, v),
  getAll: () => cache.mget(cache.keys())
};
