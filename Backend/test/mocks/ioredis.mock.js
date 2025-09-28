const MS_PER_SECOND = 1000;

class RedisMock {
  constructor(options = {}) {
    this.options = options;
    this.status = 'ready';
    this.listeners = {};
    this.data = new Map(); // In-memory storage
    this.keyspace = new Map(); // For key patterns
  }

  // Connection management
  connect() {
    return Promise.resolve();
  }

  disconnect() {
    return Promise.resolve();
  }

  quit() {
    return Promise.resolve();
  }

  // Event handling
  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
    return this;
  }

  once(event, cb) {
    return this.on(event, cb);
  }

  off(event, cb) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
    }
    return this;
  }

  emit(event, ...args) {
    (this.listeners[event] || []).forEach((fn) => fn(...args));
  }

  // Bull Redis clone functionality
  duplicate() {
    return new RedisMock(this.options);
  }

  // Core Redis commands
  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value, modeOrTtl, ttlOrValue, nx) {
    if (modeOrTtl === 'EX' && typeof ttlOrValue === 'number') {
      this.data.set(key, value);
      setTimeout(() => this.data.delete(key), ttlOrValue * MS_PER_SECOND);
    } else if (modeOrTtl === 'PX' && typeof ttlOrValue === 'number') {
      this.data.set(key, value);
      setTimeout(() => this.data.delete(key), ttlOrValue);
    } else if (nx === 'NX' && !this.data.has(key)) {
      this.data.set(key, value);
      return 'OK';
    } else if (nx === 'NX' && this.data.has(key)) {
      return null;
    } else {
      this.data.set(key, value);
    }
    return 'OK';
  }

  async del(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    let deleted = 0;
    keyArray.forEach((key) => {
      if (this.data.delete(key)) {
        deleted++;
      }
    });
    return deleted;
  }

  async exists(key) {
    return this.data.has(key) ? 1 : 0;
  }

  async expire(key, seconds) {
    if (this.data.has(key)) {
      setTimeout(() => this.data.delete(key), seconds * MS_PER_SECOND);
      return 1;
    }
    return 0;
  }

  async ping() {
    return 'PONG';
  }

  async keys(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.data.keys()).filter((key) => regex.test(key));
  }

  async scan(cursor, options = {}) {
    const keys = Array.from(this.data.keys());
    const matchPattern = options.match
      ? new RegExp(options.match.replace(/\*/g, '.*'))
      : null;
    const count = options.count || 10;

    const filteredKeys = matchPattern
      ? keys.filter((key) => matchPattern.test(key))
      : keys;

    const startIndex = parseInt(cursor) || 0;
    const endIndex = Math.min(startIndex + count, filteredKeys.length);
    const page = filteredKeys.slice(startIndex, endIndex);

    return [endIndex >= filteredKeys.length ? '0' : endIndex.toString(), page];
  }

  // Redis pipeline for bulk operations
  pipeline() {
    const commands = [];
    return {
      get: (key) => {
        commands.push(['get', key]);
        return this;
      },
      set: (key, value, mode, ttl, nx) => {
        commands.push(['set', key, value, mode, ttl, nx]);
        return this;
      },
      del: (key) => {
        commands.push(['del', key]);
        return this;
      },
      exec: () => {
        return Promise.all(
          commands.map(([cmd, ...args]) => this._runCommand(cmd, args)),
        );
      },
    };
  }

  async _runCommand(command, args) {
    // Simple implementation for pipeline execution
    switch (command) {
      case 'get':
        return [null, this.get(args[0])];
      case 'set':
        return [null, this.set(args[0], args[1], args[2], args[3], args[4])];
      case 'del':
        return [null, this.del(args[0])];
      default:
        return [null, Promise.resolve(null)];
    }
  }

  // Bull Queue specific methods
  async flushdb() {
    this.data.clear();
    return 'OK';
  }

  // Stream functionality for scanning
  createScanStream() {
    const keys = Array.from(this.data.keys());
    const reader = {
      _index: 0,
      read() {
        if (reader._index >= keys.length) return null;
        const key = keys[reader._index++];
        return key;
      },
    };
    return reader;
  }

  scanStream() {
    return new Promise((resolve) => {
      const stream = this.createScanStream();
      resolve(stream);
    });
  }

  // Additional commands for session management and locks
  async hget(key, field) {
    const hash = this.data.get(key);
    return hash && typeof hash === 'object' ? hash[field] : null;
  }

  async hset(key, field, value) {
    const hash = this.data.get(key) || {};
    hash[field] = value;
    this.data.set(key, hash);
    return 1;
  }

  async hdel(key, field) {
    const hash = this.data.get(key);
    if (hash && typeof hash === 'object' && hash[field]) {
      delete hash[field];
      this.data.set(key, hash);
      return 1;
    }
    return 0;
  }

  // For lock mechanisms (redis locks)
  async mget(keys) {
    return keys.map((key) => this.data.get(key) || null);
  }

  async mset(pairs) {
    for (let i = 0; i < pairs.length; i += 2) {
      this.data.set(pairs[i], pairs[i + 1]);
    }
    return 'OK';
  }

  // TTL and expire operations
  async ttl(key) {
    // Simple implementation for TTL
    if (this.data.has(key)) {
      const expiry = this.data.get(`expire_${key}`);
      if (expiry && Date.now() < expiry) {
        return Math.floor((expiry - Date.now()) / MS_PER_SECOND);
      }
    }
    return -1;
  }

  async pttl(key) {
    return this.ttl(key);
  }

  // Hash operations
  async hgetall(key) {
    const hash = this.data.get(key);
    return hash && typeof hash === 'object' ? hash : {};
  }

  async hkeys(key) {
    const hash = this.data.get(key);
    return hash && typeof hash === 'object' ? Object.keys(hash) : [];
  }

  async hvals(key) {
    const hash = this.data.get(key);
    return hash && typeof hash === 'object' ? Object.values(hash) : [];
  }

  // String operations
  async incr(key) {
    const value = parseInt(this.data.get(key)) || 0;
    const newValue = value + 1;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async decr(key) {
    const value = parseInt(this.data.get(key)) || 0;
    const newValue = value - 1;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async incrby(key, increment) {
    const value = parseInt(this.data.get(key)) || 0;
    const newValue = value + increment;
    this.data.set(key, newValue.toString());
    return newValue;
  }

  async append(key, value) {
    const existing = this.data.get(key) || '';
    const newValue = existing + value;
    this.data.set(key, newValue);
    return newValue.length;
  }

  async strlen(key) {
    const value = this.data.get(key);
    return value ? value.length : 0;
  }

  // List operations (basic)
  async lpush(key, ...values) {
    let list = this.data.get(key);
    if (!Array.isArray(list)) {
      list = [];
    }
    list.unshift(...values);
    this.data.set(key, list);
    return list.length;
  }

  async rpush(key, ...values) {
    let list = this.data.get(key);
    if (!Array.isArray(list)) {
      list = [];
    }
    list.push(...values);
    this.data.set(key, list);
    return list.length;
  }

  async lpop(key) {
    const list = this.data.get(key);
    if (Array.isArray(list) && list.length > 0) {
      const value = list.shift();
      this.data.set(key, list);
      return value;
    }
    return null;
  }

  async rpop(key) {
    const list = this.data.get(key);
    if (Array.isArray(list) && list.length > 0) {
      const value = list.pop();
      this.data.set(key, list);
      return value;
    }
    return null;
  }

  // Pattern operations for Bull queues
  async flushall() {
    this.data.clear();
    return 'OK';
  }

  // Transaction-like operations
  async watch() {
    // Simplification - just acknowledge watched keys
    return 'OK';
  }

  async unwatch() {
    return 'OK';
  }

  async multi() {
    return {
      exec: () => Promise.resolve([['OK']]),
      get: () => this,
      set: () => this,
      del: () => this,
    };
  }
}

RedisMock.Cluster = class ClusterMock extends RedisMock {
  constructor(nodes, options) {
    super(options);
    this.nodes = nodes;
    this.isCluster = true;
  }
};

module.exports = RedisMock;
