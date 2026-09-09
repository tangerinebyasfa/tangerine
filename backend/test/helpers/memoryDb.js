const assert = require('node:assert/strict');
// Atomic in-memory Firestore adapter: staged writes roll back on failure and
// concurrent transactions serialize. Rejects reads after writes like Firestore.
class MemoryDb {
  constructor() { this.data = new Map(); this.queue = Promise.resolve(); this.nextId = 0; }
  collection(name) { return this.query(name); }
  query(name, filters = [], max = Infinity) {
    return {
      doc: id => this.ref(`${name}/${id || `auto-${++this.nextId}`}`),
      where: (field, op, value) => this.query(name, [...filters, [field, value]], max),
      limit: value => this.query(name, filters, value),
      get: async () => {
        const docs = [...this.data].filter(([key, data]) => key.startsWith(`${name}/`) && filters.every(([k, v]) => data[k] === v)).slice(0, max).map(([key]) => this.snapshot(key));
        return { docs, empty: !docs.length };
      },
    };
  }
  ref(path) { return { path, id: path.split('/').pop(), get: async () => this.snapshot(path) }; }
  snapshot(path) { return { id: path.split('/').pop(), ref: this.ref(path), exists: this.data.has(path), data: () => structuredClone(this.data.get(path)) }; }
  runTransaction(fn) {
    const run = this.queue.then(async () => {
      const writes = [];
      const result = await fn({
        get: async ref => { assert.equal(writes.length, 0, 'transaction reads must precede writes'); return ref.get(); },
        update: (ref, data) => { assert(this.data.has(ref.path)); writes.push([ref.path, { ...this.data.get(ref.path), ...data }]); },
        set: (ref, data) => writes.push([ref.path, data]),
        delete: ref => writes.push([ref.path, undefined]),
      });
      writes.forEach(([key, value]) => value === undefined ? this.data.delete(key) : this.data.set(key, structuredClone(value)));
      return result;
    });
    this.queue = run.catch(() => {});
    return run;
  }
}

module.exports = { MemoryDb };
