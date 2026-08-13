"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider, db, firebaseReady } from "../lib/firebase";
import { doc as fsDoc, getDoc as fsGetDoc, setDoc as fsSetDoc, serverTimestamp as fsServerTimestamp } from "firebase/firestore";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase auth user
  const [profile, setProfile] = useState(null); // Firestore /users/{uid} doc (includes role)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady || !auth) {
      setLoading(false);
      return;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          await syncUserProfile(firebaseUser);
          const profileData = await loadProfile();
          if (active) setProfile(profileData);
        } catch (err) {
          console.error(err);
          if (active) setProfile(null);
        }
      } else {
        setProfile(null);
      }

      if (active) setLoading(false);
    });

    const handleFocus = () => {
      if (auth.currentUser) {
        refreshProfile().catch(console.error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && auth.currentUser) {
        refreshProfile().catch(console.error);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Creates or refreshes the user profile through the backend so we don't
  // depend on Firestore client write rules during signup.
async function syncUserProfile(firebaseUser) {
    const payload = {
      displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "",
      photoURL: firebaseUser.photoURL || null,
    };

    if (!db) throw new Error("Firebase is not configured yet.");

    const ref = fsDoc(db, "users", firebaseUser.uid);
    const snap = await fsGetDoc(ref);
    const existing = snap.exists() ? snap.data() : {};

    await fsSetDoc(
      ref,
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: payload.displayName,
        photoURL: payload.photoURL,
        role: existing.role || "customer",
        createdAt: existing.createdAt || fsServerTimestamp(),
      },
      { merge: true }
    );

    api.syncUser(payload).catch((err) => {
      console.warn("Backend user sync skipped:", err.message);
    });
  }

  async function loadProfile() {
    if (db && user) {
      const ref = fsDoc(db, "users", user.uid);
      const snap = await fsGetDoc(ref);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
    }

    try {
      return await api.getMe();
    } catch (err) {
      return null;
    }
  }

  async function refreshProfile() {
    if (user) setProfile(await loadProfile());
  }

  async function signUpWithEmail(email, password, displayName) {
    if (!auth) throw new Error("Firebase is not configured yet.");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await syncUserProfile({ ...cred.user, displayName: displayName || cred.user.displayName });
    setProfile(await loadProfile());
    return cred.user;
  }

  async function signInWithEmail(email, password) {
    if (!auth) throw new Error("Firebase is not configured yet.");
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function signInWithGoogle() {
    if (!auth || !googleProvider) throw new Error("Firebase is not configured yet.");
    const cred = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(cred.user);
    setProfile(await loadProfile());
    return cred.user;
  }

  async function logout() {
    if (!auth) return;
    await signOut(auth);
  }

  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
