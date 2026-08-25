import admin from "firebase-admin";

function isPlaceholder(value) {
  return !value || /^(your[_-]?|changeme|replace[_-]?me|xxx|test)$/i.test(String(value).trim());
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function loadServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      return JSON.parse(json);
    } catch (error) {
      console.error("[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON:", error.message);
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey) return null;
  if (isPlaceholder(projectId) || isPlaceholder(clientEmail) || isPlaceholder(privateKey)) return null;

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

let initialized = false;

export function getAdminApp() {
  if (initialized && admin.apps.length) return admin.app();

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  initialized = true;
  return admin.app();
}

export function getAdminAuth() {
  const app = getAdminApp();
  return app ? admin.auth(app) : null;
}

export function getAdminDb() {
  const app = getAdminApp();
  return app ? admin.firestore(app) : null;
}

export function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  return value;
}

export async function authenticateRequest(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    const error = new Error("No auth token provided");
    error.status = 401;
    throw error;
  }

  const auth = getAdminAuth();
  if (!auth) {
    const error = new Error("Firebase Admin is not configured");
    error.status = 500;
    throw error;
  }

  const decoded = await auth.verifyIdToken(token);
  const db = getAdminDb();
  const userDoc = db ? await db.collection("users").doc(decoded.uid).get() : null;
  const role = userDoc?.exists ? userDoc.data()?.role : "customer";

  return {
    uid: decoded.uid,
    email: decoded.email || "",
    role: role || "customer",
  };
}

export async function requireAdminRequest(request) {
  const user = await authenticateRequest(request);
  if (user.role !== "admin") {
    const error = new Error("Admin access required");
    error.status = 403;
    throw error;
  }

  return user;
}
