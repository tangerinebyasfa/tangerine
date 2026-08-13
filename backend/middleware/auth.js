const { auth, db } = require("../config/firebaseAdmin");

/**
 * Verifies the Firebase ID token sent in the Authorization header
 * ("Authorization: Bearer <idToken>"), then loads the matching user
 * document from Firestore so req.user.role is available to later
 * middleware/routes.
 */
async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ error: "No auth token provided" });
    }

    const decoded = await auth.verifyIdToken(token);

    const userDoc = await db.collection("users").doc(decoded.uid).get();
    const role = userDoc.exists ? userDoc.data().role : "customer";

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: role || "customer",
    };

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Blocks the request unless the authenticated user's role is "admin". */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
