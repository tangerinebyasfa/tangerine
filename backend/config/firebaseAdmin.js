const admin = require("firebase-admin");
require("dotenv").config();

// Initialize the Firebase Admin SDK using service account credentials
// stored in environment variables (see .env.example).
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || "demo-project";
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  const hasServiceAccount =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  const appConfig = {
    projectId,
    storageBucket,
  };

  if (hasServiceAccount) {
    appConfig.credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env stores the private key with literal \n sequences, so they
      // need to be converted back into real newlines here.
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  } else {
    console.warn(
      "[firebaseAdmin] Firebase service-account env vars are missing. " +
        "Backend Firebase operations will fail until FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set."
    );
  }

  admin.initializeApp(appConfig);
}

const db = admin.firestore();
const auth = admin.auth();
const bucket = admin.storage().bucket();

module.exports = { admin, db, auth, bucket };
