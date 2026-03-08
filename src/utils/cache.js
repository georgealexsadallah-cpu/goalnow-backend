const cacheStore = new Map();

const getCacheItem = (key) => {
  const item = cacheStore.get(key);

  if (!item) {
    return null;
  }

  const now = Date.now();

  if (item.expiresAt <= now) {
    cacheStore.delete(key);
    return null;
  }

  return item.value;
};

const setCacheItem = (key, value, ttlMs) => {
  const expiresAt = Date.now() + ttlMs;

  cacheStore.set(key, {
    value,
    expiresAt,
  });
};

const deleteCacheItem = (key) => {
  cacheStore.delete(key);
};

const clearExpiredCache = () => {
  const now = Date.now();

  for (const [key, item] of cacheStore.entries()) {
    if (item.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
};

const getCacheStats = () => {
  clearExpiredCache();

  return {
    totalKeys: cacheStore.size,
  };
};

module.exports = {
  getCacheItem,
  setCacheItem,
  deleteCacheItem,
  clearExpiredCache,
  getCacheStats,
};