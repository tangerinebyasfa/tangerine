import admin from "firebase-admin";
import fs from "fs";
import path from "path";

function isPlaceholder(value) {
  return !value || /^(your[_-]?|changeme|replace[_-]?me|xxx|test)$/i.test(String(value).trim());
}

function normalizePrivateKey(value) {
  return String(value || "").replace(/^"|"$/g, "").replace(/\\n/g, "\n");
}

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const env = {};

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      env[key] = value;
    }

    return env;
  } catch {
    return {};
  }
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

  const backendEnvPath = path.resolve(process.cwd(), "..", "backend", ".env");
  const backendEnv = parseEnvFile(backendEnvPath);

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || backendEnv.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || backendEnv.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim() || backendEnv.FIREBASE_PRIVATE_KEY?.trim();

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
