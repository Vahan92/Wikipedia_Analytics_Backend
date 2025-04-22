const NodeCache = require('node-cache');

const DEFAULT_TTL = 7200;
const ttl = Number(process.env.CACHE_TTL_SECONDS) || DEFAULT_TTL;

const cache = new NodeCache({ 
  stdTTL: ttl,
  checkperiod: Math.min(ttl * 0.2, 600),
  useClones: false
});

cache.on('expired', (key, value) => {
  console.log(`Cache key expired: ${key}`);
});

module.exports = {
  get: (key) => {
    try {
      return cache.get(key);
    } catch (error) {
      console.error(`Error retrieving from cache: ${error.message}`);
      return undefined;
    }
  },

  set: (key, value, customTtl) => {
    try {
      return cache.set(key, value, customTtl);
    } catch (error) {
      console.error(`Error setting cache: ${error.message}`);
      return false;
    }
  },

  getAll: () => {
    try {
      const keys = cache.keys();
      return cache.mget(keys);
    } catch (error) {
      console.error(`Error retrieving all cache values: ${error.message}`);
      return {};
    }
  },

  delete: (key) => {
    try {
      return cache.del(key);
    } catch (error) {
      console.error(`Error deleting from cache: ${error.message}`);
      return false;
    }
  },

  flush: () => {
    try {
      cache.flushAll();
      return true;
    } catch (error) {
      console.error(`Error flushing cache: ${error.message}`);
      return false;
    }
  },

  getStats: () => {
    return cache.getStats();
  }
};