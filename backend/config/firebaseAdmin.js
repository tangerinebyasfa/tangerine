const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MOCK_CATEGORIES = [];
const MOCK_SUBCATEGORIES = [];
const MOCK_PRODUCTS = [];
const MOCK_ORDERS = [];

const createMockDb = () => {
  const collections = {
    categories: [...MOCK_CATEGORIES],
    subcategories: [...MOCK_SUBCATEGORIES],
    products: [...MOCK_PRODUCTS],
    orders: [...MOCK_ORDERS],
    users: [
      {
        id: 'demo-user',
        uid: 'demo-user',
        email: 'demo@example.com',
        displayName: 'Demo Admin',
        photoURL: null,
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const ensureCollection = (name) => {
    if (!collections[name]) collections[name] = [];
    return collections[name];
  };

  const makeDoc = (collectionName, id) => ({
    id,
    exists: !!ensureCollection(collectionName).find((item) => (item.id || item.uid) === id),
    data: () => ensureCollection(collectionName).find((item) => (item.id || item.uid) === id) || {},
    set: async (data) => {
      const collection = ensureCollection(collectionName);
      const index = collection.findIndex((item) => (item.id || item.uid) === id);
      if (index >= 0) collection[index] = { ...collection[index], ...data };
      else collection.push({ ...(data || {}), id });
      return { id };
    },
    update: async (updates) => {
      const collection = ensureCollection(collectionName);
      const index = collection.findIndex((item) => (item.id || item.uid) === id);
      if (index >= 0) collection[index] = { ...collection[index], ...updates };
      return { id };
    },
    delete: async () => {
      collections[collectionName] = ensureCollection(collectionName).filter((item) => (item.id || item.uid) !== id);
    },
  });

  return {
    __mock: true,
    collection: (name) => ({
      _name: name,
      orderBy: () => ({
        get: async () => ({
          docs: ensureCollection(name).map((item) => ({ id: item.id, data: () => item, exists: true })),
          empty: ensureCollection(name).length === 0,
        }),
      }),
      where: (field, op, value) => ({
        limit: async () => ({
          docs: ensureCollection(name).filter((item) => item[field] === value).map((item) => ({ id: item.id, data: () => item, exists: true })),
          empty: !ensureCollection(name).some((item) => item[field] === value),
        }),
      }),
      doc: (docId) => {
        const doc = makeDoc(name, docId);
        return {
          ...doc,
          get: async () => doc,
        };
      },
      add: async (data) => {
        const item = { ...data, id: `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}` };
        ensureCollection(name).push(item);
        return { id: item.id };
      },
      get: async () => ({
        docs: ensureCollection(name).map((item) => ({ id: item.id, data: () => item, exists: true })),
        empty: ensureCollection(name).length === 0,
      }),
    }),
  };
};

const makeMissing = (name) => {
  const msg = `[firebaseAdmin] ${name} cannot be used because Firebase is not initialized. Set credentials or disable SKIP_FIREBASE.`;
  if (name === 'Firestore') {
    const docStub = () => ({
      get: async () => { throw new Error(msg); },
      update: async () => { throw new Error(msg); },
      delete: async () => { throw new Error(msg); },
    });
    return {
      collection: () => ({
        orderBy: () => ({ get: async () => { throw new Error(msg); } }),
        where: () => ({ limit: () => ({ get: async () => { throw new Error(msg); } }) }),
        doc: docStub,
        add: async () => { throw new Error(msg); },
      }),
    };
  }
  if (name === 'Auth') {
    return {
      verifyIdToken: async () => { throw new Error(msg); },
      getUser: async () => { throw new Error(msg); },
      createUser: async () => { throw new Error(msg); },
    };
  }
  if (name === 'Storage') {
    return {
      bucket: () => ({
        upload: async () => { throw new Error(msg); },
        file: () => ({ delete: async () => { throw new Error(msg); } }),
      }),
    };
  }
  return { __missing: true };
};

// Load service account from (in order): GOOGLE_APPLICATION_CREDENTIALS file,
// FIREBASE_SERVICE_ACCOUNT_JSON env var (full JSON), or individual env vars.
let serviceAccount = null;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
      serviceAccount = require(credPath);
    }
  }
} catch (e) {
  // ignore and continue
}

if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.error('[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON:', e.message);
  }
}

// Support passing private key + client email via env vars (less recommended)
if (!serviceAccount && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (/YOUR_KEY|YOUR_KEY_HERE|REPLACE_ME/i.test(privateKey)) {
    // treat placeholder as missing
    privateKey = null;
  }
  if (privateKey) {
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID || undefined,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };
  }
}

const appConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || undefined,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
};

const isPlaceholderValue = (value) => typeof value === 'string' && /YOUR_KEY_HERE|REPLACE_ME|xxxxx/i.test(value);
const shouldSkipFirebase = process.env.SKIP_FIREBASE === 'true' || process.env.SKIP_FIREBASE === '1' || isPlaceholderValue(process.env.FIREBASE_PRIVATE_KEY) || isPlaceholderValue(process.env.FIREBASE_CLIENT_EMAIL);

// Initialize Admin SDK using best available credentials.
try {
  // Determine effective project id and expose it for Google libraries
  const effectiveProjectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (effectiveProjectId) {
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || effectiveProjectId;
    process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || effectiveProjectId;
    appConfig.projectId = effectiveProjectId;
  }

  if (serviceAccount && !shouldSkipFirebase) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: appConfig.storageBucket,
      projectId: appConfig.projectId,
    });
    console.log(`[firebaseAdmin] Firebase mode: REAL (${appConfig.projectId || "unknown project"})`);
  } else if (shouldSkipFirebase) {
    console.warn('[firebaseAdmin] Firebase credentials are missing or placeholder; using in-memory mock data for local development.');
    module.exports = { admin: null, db: createMockDb(), auth: { verifyIdToken: async (token) => ({ uid: 'demo-user', email: 'demo@example.com' }) }, bucket: makeMissing('Storage') };
    return;
  } else {
    // Try ADC as a last resort (useful on GCP or when GOOGLE_APPLICATION_CREDENTIALS is set)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: appConfig.storageBucket,
      projectId: appConfig.projectId || undefined,
    });
    console.log(`[firebaseAdmin] Firebase mode: REAL (application default credentials${appConfig.projectId ? `, ${appConfig.projectId}` : ""})`);
  }
} catch (e) {
  if (shouldSkipFirebase) {
    console.warn('[firebaseAdmin] Firebase initialization failed but local mock mode is enabled — exporting in-memory placeholders.');
    module.exports = { admin: null, db: createMockDb(), auth: { verifyIdToken: async (token) => ({ uid: 'demo-user', email: 'demo@example.com' }) }, bucket: makeMissing('Storage') };
    return;
  }
  console.error('[firebaseAdmin] Failed to initialize Firebase Admin:', e.message);
  throw e;
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };
