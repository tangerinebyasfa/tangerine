const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create lightweight stubs to export when Firebase isn't initialized.
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

// Initialize Admin SDK using best available credentials.
try {
  // Determine effective project id and expose it for Google libraries
  const effectiveProjectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (effectiveProjectId) {
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || effectiveProjectId;
    process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || effectiveProjectId;
    appConfig.projectId = effectiveProjectId;
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: appConfig.storageBucket,
      projectId: appConfig.projectId,
    });
  } else if (process.env.SKIP_FIREBASE === 'true' || process.env.SKIP_FIREBASE === '1') {
    console.warn('[firebaseAdmin] SKIP_FIREBASE is enabled — running without Firebase Admin. Admin features will error if used.');
    module.exports = { admin: null, db: makeMissing('Firestore'), auth: makeMissing('Auth'), bucket: makeMissing('Storage') };
    return;
  } else {
    // Try ADC as a last resort (useful on GCP or when GOOGLE_APPLICATION_CREDENTIALS is set)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: appConfig.storageBucket,
      projectId: appConfig.projectId || undefined,
    });
  }
} catch (e) {
  if (process.env.SKIP_FIREBASE === 'true' || process.env.SKIP_FIREBASE === '1') {
    console.warn('[firebaseAdmin] Firebase initialization failed but SKIP_FIREBASE is enabled — exporting placeholders.');
    module.exports = { admin: null, db: makeMissing('Firestore'), auth: makeMissing('Auth'), bucket: makeMissing('Storage') };
    return;
  }
  console.error('[firebaseAdmin] Failed to initialize Firebase Admin:', e.message);
  throw e;
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };
