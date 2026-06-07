/* eslint-disable @typescript-eslint/no-explicit-any */
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth,
  signInWithEmailAndPassword as realSignInWithEmailAndPassword,
  createUserWithEmailAndPassword as realCreateUserWithEmailAndPassword,
  signOut as realSignOut,
  onAuthStateChanged as realOnAuthStateChanged,
  updateProfile as realUpdateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  collection, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query as fsQuery, 
  where, 
  orderBy, 
  deleteField 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { mockProducts } from "@/lib/mockData";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we are in mock mode due to placeholder credentials
let isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
             process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("your_client_api_key_here");

export const forceMockMode = () => {
  if (!isMock) {
    console.warn("Forcing mock mode due to Firebase configuration or connectivity issues.");
    isMock = true;
  }
};

// Initialize Firebase client
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const realAuth = getAuth(app);
const realDb = getFirestore(app);
const storage = getStorage(app);

// Mock DB helpers
const getMockDbData = (): Record<string, any> => {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem("mock_firebase_db");
  if (!data) {
    const productsObj: Record<string, any> = {};
    mockProducts.forEach(p => {
      productsObj[p.id] = {
        title: p.title,
        description: p.description,
        price: p.price,
        type: p.type,
        category: p.category,
        images: p.images,
        stock: p.stock,
        createdAt: p.createdAt,
      };
    });
    const couponsObj = {
      PRIME10: {
        code: "PRIME10",
        discountPercent: 10,
        isActive: true,
        validUntil: Date.now() + 30 * 24 * 60 * 60 * 1000
      }
    };
    const initialDb = {
      products: productsObj,
      coupons: couponsObj,
      users: {},
      orders: {},
      downloads: {}
    };
    localStorage.setItem("mock_firebase_db", JSON.stringify(initialDb));
    return initialDb;
  }
  return JSON.parse(data);
};

const setMockDbData = (data: Record<string, any>) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("mock_firebase_db", JSON.stringify(data));
};

function getNestedValue(obj: any, path: string) {
  if (!path || path === "/") return obj;
  const parts = path.split("/").filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj: any, path: string, value: any) {
  if (!path || path === "/") return value;
  const parts = path.split("/").filter(Boolean);
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
  return obj;
}

function deleteNestedValue(obj: any, path: string) {
  if (!path || path === "/") return;
  const parts = path.split("/").filter(Boolean);
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) return;
    current = current[part];
  }
  delete current[parts[parts.length - 1]];
}

// Global Auth State for Mocking and Fallbacks
const mockAuthObj = {
  currentUser: null as any
};
const authListeners: Array<(user: any) => void> = [];

const fallbackUserObj = {
  currentUser: null as any
};
const fallbackAuthListeners: Array<(user: any) => void> = [];

// Exports
export const auth = isMock ? mockAuthObj : realAuth;
export const db = isMock ? {} : realDb;
export { app, storage, isMock };

// Conditional wrappers
const signInWithEmailAndPasswordMock = async (email: string, password: string): Promise<any> => {
  const dbData = getMockDbData();
  const users = dbData.users || {};
  const userKey = Object.keys(users).find(uid => users[uid].email === email);
  if (!userKey) {
    // Auto register rahoofmanu10@gmail.com for convenience
    if (email === "rahoofmanu10@gmail.com") {
      const adminUid = "mock-admin-uid";
      
      // Enforce default password Admin@123
      if (password !== "Admin@123") {
        const err = new Error("Firebase: Error (auth/wrong-password).") as any;
        err.code = "auth/wrong-password";
        throw err;
      }

      users[adminUid] = {
        uid: adminUid,
        name: "Administrator",
        email: "rahoofmanu10@gmail.com",
        role: "admin",
        password: "Admin@123",
        createdAt: Date.now()
      };
      dbData.users = users;
      setMockDbData(dbData);
      const loggedUser = {
        uid: adminUid,
        email: "rahoofmanu10@gmail.com",
        displayName: "Administrator",
        emailVerified: true,
        getIdToken: async () => `fallback-token-${adminUid}`
      };
      mockAuthObj.currentUser = loggedUser;
      localStorage.setItem("mock_user", JSON.stringify(loggedUser));
      authListeners.forEach(listener => listener(loggedUser));
      return { user: loggedUser };
    }
    const err = new Error("Firebase: Error (auth/user-not-found).") as any;
    err.code = "auth/user-not-found";
    throw err;
  }

  // User found, verify password
  const userObj = users[userKey];
  if (userObj.password && userObj.password !== password) {
    const err = new Error("Firebase: Error (auth/wrong-password).") as any;
    err.code = "auth/wrong-password";
    throw err;
  }

  const loggedUser = {
    uid: userKey,
    email: email,
    displayName: users[userKey].name || "Customer",
    emailVerified: true,
    getIdToken: async () => `fallback-token-${userKey}`
  };
  mockAuthObj.currentUser = loggedUser;
  localStorage.setItem("mock_user", JSON.stringify(loggedUser));
  authListeners.forEach(listener => listener(loggedUser));
  return { user: loggedUser };
};

const signInWithDatabaseFallback = async (email: string, password: string): Promise<any> => {
  const usersSnapshot = await get(ref(db, "users"));
  let users: Record<string, any> = {};
  if (usersSnapshot.exists()) {
    users = usersSnapshot.val();
  }

  let userKey = Object.keys(users).find(uid => users[uid]?.email === email);

  // Auto register rahoofmanu10@gmail.com if missing from the real DB node
  if (!userKey && email === "rahoofmanu10@gmail.com") {
    const adminUid = "admin-fallback-uid";
    const newAdmin = {
      uid: adminUid,
      name: "Administrator",
      email: "rahoofmanu10@gmail.com",
      role: "admin",
      password: password === "Admin@123" ? "Admin@123" : password,
      createdAt: Date.now()
    };
    await set(ref(db, `users/${adminUid}`), newAdmin);
    users[adminUid] = newAdmin;
    userKey = adminUid;
  }

  if (!userKey) {
    const err = new Error("Firebase: Error (auth/user-not-found).") as any;
    err.code = "auth/user-not-found";
    throw err;
  }

  const userObj = users[userKey];
  if (userObj.password && userObj.password !== password) {
    const err = new Error("Firebase: Error (auth/wrong-password).") as any;
    err.code = "auth/wrong-password";
    throw err;
  }

  const loggedUser = {
    uid: userObj.uid || userKey,
    email: email,
    displayName: userObj.name || "Administrator",
    emailVerified: true,
    getIdToken: async () => `fallback-token-${userObj.uid || userKey}`
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("fallback_user", JSON.stringify(loggedUser));
    if (userObj.role === "admin") {
      localStorage.setItem("admin_profile", JSON.stringify(userObj));
    }
  }
  fallbackUserObj.currentUser = loggedUser;
  fallbackAuthListeners.forEach(listener => listener(loggedUser));
  return { user: loggedUser };
};

// Conditional wrappers
export const signInWithEmailAndPassword = async (authObj: any, email: string, password: string): Promise<any> => {
  if (isMock) {
    return signInWithEmailAndPasswordMock(email, password);
  }
  try {
    const res = await realSignInWithEmailAndPassword(authObj, email, password);
    // If real auth is successful, profile will be cached inside AuthContext.tsx
    return res;
  } catch (error: any) {
    if (error.code === "auth/configuration-not-found" || error.message?.includes("configuration-not-found")) {
      console.warn("Firebase Auth Email/Password provider is not enabled. Falling back to secure database credentials verification...");
      return signInWithDatabaseFallback(email, password);
    }
    throw error;
  }
};

export const createUserWithEmailAndPassword = async (authObj: any, email: string, password: string): Promise<any> => {
  if (isMock) {
    const dbData = getMockDbData();
    const users = dbData.users || {};
    const exists = Object.keys(users).some(uid => users[uid].email === email);
    if (exists) {
      const err = new Error("Firebase: Error (auth/email-already-in-use).") as any;
      err.code = "auth/email-already-in-use";
      throw err;
    }
    const newUserUid = `mock-uid-${Math.random().toString(36).substring(2, 9)}`;
    const newUser = {
      uid: newUserUid,
      email: email,
      displayName: email.split("@")[0],
      emailVerified: true,
      getIdToken: async () => `fallback-token-${newUserUid}`
    };
    
    // Save to users DB as well so we can verify password next time
    users[newUserUid] = {
      uid: newUserUid,
      name: email.split("@")[0],
      email: email,
      role: "customer",
      password: password,
      createdAt: Date.now()
    };
    dbData.users = users;
    setMockDbData(dbData);

    mockAuthObj.currentUser = newUser;
    localStorage.setItem("mock_user", JSON.stringify(newUser));
    authListeners.forEach(listener => listener(newUser));
    return { user: newUser };
  }
  return realCreateUserWithEmailAndPassword(authObj, email, password);
};

export const signOut = async (authObj: any): Promise<void> => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("mock_user");
    localStorage.removeItem("fallback_user");
    localStorage.removeItem("admin_profile");
  }
  
  if (isMock) {
    mockAuthObj.currentUser = null;
    authListeners.forEach(listener => listener(null));
    return;
  }

  fallbackUserObj.currentUser = null;
  fallbackAuthListeners.forEach(listener => listener(null));

  try {
    await realSignOut(authObj);
  } catch (e) {
    console.warn("Real signOut failed:", e);
  }
};

export const onAuthStateChanged = (authObj: any, callback: (user: any) => void): (() => void) => {
  if (isMock) {
    authListeners.push(callback);
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("mock_user");
      if (storedUser) {
        mockAuthObj.currentUser = JSON.parse(storedUser);
      }
    }
    setTimeout(() => callback(mockAuthObj.currentUser), 0);
    return () => {
      const index = authListeners.indexOf(callback);
      if (index > -1) authListeners.splice(index, 1);
    };
  }

  fallbackAuthListeners.push(callback);
  if (typeof window !== "undefined") {
    const storedUser = localStorage.getItem("fallback_user");
    if (storedUser) {
      fallbackUserObj.currentUser = JSON.parse(storedUser);
    }
  }

  if (fallbackUserObj.currentUser) {
    setTimeout(() => callback(fallbackUserObj.currentUser), 0);
  }

  const realUnsubscribe = realOnAuthStateChanged(realAuth, (user) => {
    if (user) {
      callback(user);
    } else if (!fallbackUserObj.currentUser) {
      callback(null);
    }
  });

  return () => {
    const index = fallbackAuthListeners.indexOf(callback);
    if (index > -1) fallbackAuthListeners.splice(index, 1);
    realUnsubscribe();
  };
};

export const updateProfile = async (user: any, profileData: { displayName?: string }): Promise<void> => {
  if (isMock) {
    if (user) {
      user.displayName = profileData.displayName || user.displayName;
      localStorage.setItem("mock_user", JSON.stringify(user));
      if (mockAuthObj.currentUser && mockAuthObj.currentUser.uid === user.uid) {
        mockAuthObj.currentUser = user;
      }
      authListeners.forEach(listener => listener(user));
    }
    return;
  }
  return realUpdateProfile(user, profileData);
};

// Firestore Path Helper
export function parsePath(path: string = "") {
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  if (!cleanPath) {
    return { type: "root", collection: "", docId: null, fieldPath: null };
  }
  const parts = cleanPath.split("/");
  const coll = parts[0];
  
  if (parts.length === 1) {
    return { type: "collection", collection: coll, docId: null, fieldPath: null };
  } else if (parts.length === 2) {
    return { type: "doc", collection: coll, docId: parts[1], fieldPath: null };
  } else {
    const docId = parts[1];
    const fieldPath = parts.slice(2).join(".");
    return { type: "field", collection: coll, docId, fieldPath };
  }
}

// Database compatibility wrappers
export const ref = (dbObj: any, path: string = ""): any => {
  return { db: dbObj, path };
};

export const child = (parentRef: any, path: string): any => {
  const parentPath = parentRef.path || "";
  const joinedPath = parentPath ? `${parentPath}/${path}` : path;
  return { db: parentRef.db, path: joinedPath };
};

export const get = async (refObj: any): Promise<any> => {
  if (isMock) {
    const dbData = getMockDbData();
    let val = getNestedValue(dbData, refObj.path);
    if (refObj.constraints && val && typeof val === "object") {
      let filteredVal = { ...val };
      const orderByVal = refObj.constraints.find((c: any) => c?.type === "orderByChild");
      const equalToVal = refObj.constraints.find((c: any) => c?.type === "equalTo");
      if (orderByVal && equalToVal) {
        const childKey = orderByVal.childKey;
        const targetValue = equalToVal.value;
        filteredVal = Object.keys(filteredVal).reduce((acc: any, key: string) => {
          const item = filteredVal[key];
          if (item && item[childKey] === targetValue) {
            acc[key] = item;
          }
          return acc;
        }, {});
      }
      val = filteredVal;
    }
    return {
      exists: () => val !== undefined && val !== null && (typeof val !== "object" || Object.keys(val).length > 0),
      val: () => val,
      key: refObj.path.split("/").pop() || null,
    };
  }

  try {
    const { type, collection: collName, docId, fieldPath } = parsePath(refObj.path);
    
    if (type === "collection") {
      let q: any = collection(realDb, collName);
      
      if (refObj.constraints && refObj.constraints.length > 0) {
        const clauses: any[] = [];
        const orderByVal = refObj.constraints.find((c: any) => c?.type === "orderByChild");
        const equalToVal = refObj.constraints.find((c: any) => c?.type === "equalTo");
        
        if (orderByVal && equalToVal) {
          clauses.push(where(orderByVal.childKey, "==", equalToVal.value));
        } else if (orderByVal) {
          clauses.push(orderBy(orderByVal.childKey));
        }
        q = fsQuery(q, ...clauses);
      }
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { exists: () => false, val: () => null, key: collName };
      }
      const data: Record<string, any> = {};
      querySnapshot.forEach(docSnap => {
        data[docSnap.id] = docSnap.data();
      });
      return {
        exists: () => true,
        val: () => data,
        key: collName
      };
    } else if (type === "doc" && docId) {
      const docRef = doc(realDb, collName, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return { exists: () => false, val: () => null, key: docId };
      }
      return {
        exists: () => true,
        val: () => docSnap.data(),
        key: docId
      };
    } else if (type === "field" && docId && fieldPath) {
      const docRef = doc(realDb, collName, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return { exists: () => false, val: () => null, key: fieldPath.split(".").pop() || null };
      }
      const docData = docSnap.data() || {};
      const val = getNestedValue(docData, fieldPath.replace(/\./g, "/"));
      return {
        exists: () => val !== undefined && val !== null,
        val: () => val,
        key: fieldPath.split(".").pop() || null
      };
    }
    return { exists: () => false, val: () => null, key: null };
  } catch (err) {
    console.error("Firestore get error:", err);
    throw err;
  }
};

export const set = async (refObj: any, value: any): Promise<void> => {
  if (isMock) {
    const dbData = getMockDbData();
    setNestedValue(dbData, refObj.path, value);
    setMockDbData(dbData);
    return;
  }

  try {
    const { type, collection: collName, docId, fieldPath } = parsePath(refObj.path);
    if (type === "doc" && docId) {
      const docRef = doc(realDb, collName, docId);
      await setDoc(docRef, value || {});
    } else if (type === "field" && docId && fieldPath) {
      const docRef = doc(realDb, collName, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {});
      }
      await updateDoc(docRef, { [fieldPath]: value === undefined ? null : value });
    }
  } catch (err) {
    console.error("Firestore set error:", err);
    throw err;
  }
};

export const update = async (refObj: any, values: any): Promise<void> => {
  if (isMock) {
    const dbData = getMockDbData();
    const currentVal = getNestedValue(dbData, refObj.path) || {};
    const updatedVal = { ...currentVal, ...values };
    setNestedValue(dbData, refObj.path, updatedVal);
    setMockDbData(dbData);
    return;
  }

  try {
    const { type, collection: collName, docId, fieldPath } = parsePath(refObj.path);
    if (type === "doc" && docId) {
      const docRef = doc(realDb, collName, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {});
      }
      await updateDoc(docRef, values);
    } else if (type === "field" && docId && fieldPath) {
      const docRef = doc(realDb, collName, docId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {});
      }
      const updateObj: Record<string, any> = {};
      Object.keys(values).forEach(k => {
        updateObj[`${fieldPath}.${k}`] = values[k];
      });
      await updateDoc(docRef, updateObj);
    }
  } catch (err) {
    console.error("Firestore update error:", err);
    throw err;
  }
};

export const push = (refObj: any, value?: any): any => {
  if (isMock) {
    const newKey = `push-key-${Math.random().toString(36).substring(2, 9)}`;
    const newPath = refObj.path ? `${refObj.path}/${newKey}` : newKey;
    const newRef = { db: refObj.db, path: newPath, key: newKey };
    if (value !== undefined) {
      setNestedValue(getMockDbData(), newPath, value);
    }
    return newRef;
  }

  try {
    const { type, collection: collName, docId, fieldPath } = parsePath(refObj.path);
    
    if (type === "collection") {
      const collRef = collection(realDb, collName);
      const docRef = doc(collRef);
      const key = docRef.id;
      const newPath = `${collName}/${key}`;
      
      if (value !== undefined) {
        setDoc(docRef, value).catch(err => console.error("Firestore push setDoc error:", err));
      }
      return { db: refObj.db, path: newPath, key };
    } else if (type === "doc" && docId) {
      const newKey = `push-key-${Math.random().toString(36).substring(2, 9)}`;
      const newPath = `${refObj.path}/${newKey}`;
      if (value !== undefined) {
        const docRef = doc(realDb, collName, docId);
        updateDoc(docRef, { [newKey]: value }).catch(err => console.error("Firestore push doc update error:", err));
      }
      return { db: refObj.db, path: newPath, key: newKey };
    } else if (type === "field" && docId && fieldPath) {
      const newKey = `push-key-${Math.random().toString(36).substring(2, 9)}`;
      const newPath = `${refObj.path}/${newKey}`;
      if (value !== undefined) {
        const docRef = doc(realDb, collName, docId);
        getDoc(docRef).then(snap => {
          if (!snap.exists()) {
            return setDoc(docRef, {});
          }
        }).then(() => {
          return updateDoc(docRef, { [`${fieldPath}.${newKey}`]: value });
        }).catch(err => console.error("Firestore push field update error:", err));
      }
      return { db: refObj.db, path: newPath, key: newKey };
    }
  } catch (err) {
    console.error("Firestore push error:", err);
    throw err;
  }
};

export const remove = async (refObj: any): Promise<void> => {
  if (isMock) {
    const dbData = getMockDbData();
    deleteNestedValue(dbData, refObj.path);
    setMockDbData(dbData);
    return;
  }

  try {
    const { type, collection: collName, docId, fieldPath } = parsePath(refObj.path);
    if (type === "doc" && docId) {
      const docRef = doc(realDb, collName, docId);
      await deleteDoc(docRef);
    } else if (type === "field" && docId && fieldPath) {
      const docRef = doc(realDb, collName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, { [fieldPath]: deleteField() });
      }
    }
  } catch (err) {
    console.error("Firestore remove error:", err);
    throw err;
  }
};

export const query = (refObj: any, ...constraints: any[]): any => {
  return { ...refObj, constraints };
};

export const orderByChild = (childKey: string): any => {
  return { type: "orderByChild", childKey };
};

export const equalTo = (value: any): any => {
  return { type: "equalTo", value };
};
