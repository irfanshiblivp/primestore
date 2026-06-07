"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { auth, db, onAuthStateChanged, signOut, ref, get, set, child } from "@/lib/firebase";
import { UserProfile } from "@/types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch profile from Realtime Database
          const dbRef = ref(db);
          const snapshot = await get(child(dbRef, `users/${currentUser.uid}`));
          
          if (snapshot.exists()) {
            const userData = snapshot.val() as UserProfile;
            setProfile(userData);
            const adminCheck = userData.role === "admin" || currentUser.email === "rahoofmanu10@gmail.com";
            setIsAdmin(adminCheck);
            if (adminCheck && typeof window !== "undefined") {
              localStorage.setItem("admin_profile", JSON.stringify(userData));
            }
          } else {
            // If user exists in Auth but not Database, create a profile
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || (currentUser.email === "rahoofmanu10@gmail.com" ? "Administrator" : "Customer"),
              email: currentUser.email || "",
              role: currentUser.email === "rahoofmanu10@gmail.com" ? "admin" : "customer",
              createdAt: Date.now(),
            };
            await set(ref(db, `users/${currentUser.uid}`), newProfile);
            setProfile(newProfile);
            setIsAdmin(currentUser.email === "rahoofmanu10@gmail.com");
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("admin_profile");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_profile");
    }
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
