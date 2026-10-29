const { test } = require('node:test');
const assert = require('node:assert/strict');

function setup() {
  const products = new Map();
  let nextId = 0;
  const db = {
    collection(name) {
      assert.equal(name, 'products');
      return {
        where(field, op, value) {
          return {
            limit() {
              return {
                get: async () => {
                  const docs = [...products.entries()]
                    .filter(([, product]) => product[field] === value)
                    .slice(0, 1)
                    .map(([id, product]) => ({ id, data: () => product }));
                  return { docs, empty: docs.length === 0 };
                },
              };
            },
          };
        },
        add: async (product) => {
          const id = `product-${++nextId}`;
          products.set(id, product);
          return { id };
        },
      };
    },
  };
  const config = require.resolve('../config/firebaseAdmin');
  const controller = require.resolve('../controllers/productsController');
  require.cache[config] = {
    id: config,
    filename: config,
    loaded: true,
    exports: { db, admin: { firestore: { FieldValue: { serverTimestamp: () => new Date() } } } },
  };
  delete require.cache[controller];
  return { ctrl: require(controller), products };
}

test('creating a product saves the submitted internal code', async () => {
  const { ctrl, products } = setup();
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };

  await ctrl.createProduct({
    body: {
      name: 'Test Dress',
      internalCode: 'TNG-001',
      images: ['https://example.com/dress.jpg'],
      price: 999,
      weight: 0.5,
      length: 20,
      breadth: 15,
      height: 5,
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.code, 'TNG-001');
  assert.equal(res.body.internalCode, 'TNG-001');
  assert.equal(products.get(res.body.id).internalCode, 'TNG-001');
});
