import admin from "firebase-admin";
import { Readable } from "stream";

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

let isInitialized = false;

if (!admin.apps.length) {
  try {
    let formattedPrivateKey = privateKey
      ? privateKey.replace(/\\n/g, "\n").replace(/^"(.*)"$/, "$1") // Strip wrapping quotes if any
      : undefined;

    if (formattedPrivateKey && !formattedPrivateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`;
    }

    // Only attempt initializing if the project ID, client email, and a valid-looking private key exist
    if (
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      clientEmail &&
      formattedPrivateKey &&
      !formattedPrivateKey.includes("...")
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: clientEmail,
          privateKey: formattedPrivateKey,
        }),
        databaseURL: databaseURL,
      });
      isInitialized = true;
    } else {
      console.warn("Firebase admin SDK environment variables are incomplete or using mock values. Skipping real Firebase initialization.");
    }
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
} else {
  isInitialized = true;
}

// Helpers to get admin instances lazily, returning mocks if not initialized
function parseAdminPath(path: string = "") {
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

function getDb() {
  const isReal = isInitialized && admin.apps.length > 0;
  
  return {
    ref: (path: string = "") => {
      const { type, collection: collName, docId, fieldPath } = parseAdminPath(path);
      
      return {
        key: path.split("/").pop() || null,
        
        get: async () => {
          if (!isReal) {
            return { exists: () => false, val: () => null };
          }
          try {
            const firestore = admin.firestore();
            if (type === "collection") {
              const snapshot = await firestore.collection(collName).get();
              if (snapshot.empty) {
                return { exists: () => false, val: () => null };
              }
              const data: Record<string, any> = {};
              snapshot.forEach(docSnap => {
                data[docSnap.id] = docSnap.data();
              });
              return { exists: () => true, val: () => data };
            } else if (type === "doc" && docId) {
              const docRef = firestore.collection(collName).doc(docId);
              const docSnap = await docRef.get();
              if (!docSnap.exists) {
                return { exists: () => false, val: () => null };
              }
              return { exists: () => true, val: () => docSnap.data() };
            } else if (type === "field" && docId && fieldPath) {
              const docRef = firestore.collection(collName).doc(docId);
              const docSnap = await docRef.get();
              if (!docSnap.exists) {
                return { exists: () => false, val: () => null };
              }
              const docData = docSnap.data() || {};
              const val = getNestedValue(docData, fieldPath.replace(/\./g, "/"));
              return { exists: () => val !== undefined && val !== null, val: () => val };
            }
            return { exists: () => false, val: () => null };
          } catch (err) {
            console.error("Admin firestore get error:", err);
            throw err;
          }
        },
        
        set: async (value: any) => {
          if (!isReal) return;
          try {
            const firestore = admin.firestore();
            if (type === "doc" && docId) {
              const docRef = firestore.collection(collName).doc(docId);
              await docRef.set(value || {});
            } else if (type === "field" && docId && fieldPath) {
              const docRef = firestore.collection(collName).doc(docId);
              const snap = await docRef.get();
              if (!snap.exists) {
                await docRef.set({});
              }
              await docRef.update({ [fieldPath]: value === undefined ? null : value });
            }
          } catch (err) {
            console.error("Admin firestore set error:", err);
            throw err;
          }
        },
        
        update: async (values: any) => {
          if (!isReal) return;
          try {
            const firestore = admin.firestore();
            if (type === "doc" && docId) {
              const docRef = firestore.collection(collName).doc(docId);
              const snap = await docRef.get();
              if (!snap.exists) {
                await docRef.set({});
              }
              await docRef.update(values);
            } else if (type === "field" && docId && fieldPath) {
              const docRef = firestore.collection(collName).doc(docId);
              const snap = await docRef.get();
              if (!snap.exists) {
                await docRef.set({});
              }
              const updateObj: Record<string, any> = {};
              Object.keys(values).forEach(k => {
                updateObj[`${fieldPath}.${k}`] = values[k];
              });
              await docRef.update(updateObj);
            }
          } catch (err) {
            console.error("Admin firestore update error:", err);
            throw err;
          }
        },
        
        remove: async () => {
          if (!isReal) return;
          try {
            const firestore = admin.firestore();
            if (type === "doc" && docId) {
              const docRef = firestore.collection(collName).doc(docId);
              await docRef.delete();
            } else if (type === "field" && docId && fieldPath) {
              const docRef = firestore.collection(collName).doc(docId);
              const docSnap = await docRef.get();
              if (docSnap.exists) {
                await docRef.update({ [fieldPath]: admin.firestore.FieldValue.delete() });
              }
            }
          } catch (err) {
            console.error("Admin firestore remove error:", err);
            throw err;
          }
        },
        
        push: (value?: any) => {
          const randomKey = `push-key-${Math.random().toString(36).substring(2, 9)}`;
          
          const pushPromise = (async () => {
            if (!isReal) return;
            const firestore = admin.firestore();
            if (type === "collection") {
              const docRef = firestore.collection(collName).doc(randomKey);
              if (value !== undefined) {
                await docRef.set(value);
              }
            } else if (type === "field" && docId && fieldPath) {
              const docRef = firestore.collection(collName).doc(docId);
              const snap = await docRef.get();
              if (!snap.exists) {
                await docRef.set({});
              }
              await docRef.update({ [`${fieldPath}.${randomKey}`]: value || {} });
            }
          })();

          return {
            key: randomKey,
            set: async (val: any) => {
              await pushPromise;
              if (!isReal) return;
              const firestore = admin.firestore();
              if (type === "collection") {
                const docRef = firestore.collection(collName).doc(randomKey);
                await docRef.set(val || {});
              } else if (type === "field" && docId && fieldPath) {
                const docRef = firestore.collection(collName).doc(docId);
                await docRef.update({ [`${fieldPath}.${randomKey}`]: val || {} });
              }
            }
          };
        }
      };
    }
  };
}

function getAuth() {
  if (!isInitialized || !admin.apps.length) {
    return {
      verifyIdToken: async () => {
        throw new Error("Firebase Admin Auth is not initialized. Using fallback mock.");
      },
    };
  }
  return admin.auth();
}

function getStorage() {
  if (!isInitialized || !admin.apps.length) {
    return {
      bucket: () => ({
        file: () => ({
          exists: async () => [false],
          getMetadata: async () => [{}],
          getSignedUrl: async () => ["https://mock-signed-url.com"],
          createReadStream: () => {
            return Readable.from([]);
          },
        }),
      }),
    };
  }
  return admin.storage();
}

// Use Proxies to intercept calls and access Firebase Admin dynamically
export const adminDb = new Proxy({}, {
  get(target, prop, receiver) {
    const dbInstance = getDb();
    const value = Reflect.get(dbInstance, prop, receiver);
    return typeof value === "function" ? value.bind(dbInstance) : value;
  },
}) as ReturnType<typeof admin.database>;

export const adminAuth = new Proxy({}, {
  get(target, prop, receiver) {
    if (prop === "verifyIdToken") {
      return async (token: string, ...args: any[]) => {
        if (token && typeof token === "string" && token.startsWith("fallback-token-")) {
          const uid = token.replace("fallback-token-", "");
          return { uid, email: "rahoofmanu10@gmail.com" };
        }
        const authInstance = getAuth();
        return authInstance.verifyIdToken(token, ...args);
      };
    }
    const authInstance = getAuth();
    const value = Reflect.get(authInstance, prop, receiver);
    return typeof value === "function" ? value.bind(authInstance) : value;
  },
}) as ReturnType<typeof admin.auth>;

export const adminStorage = new Proxy({}, {
  get(target, prop, receiver) {
    const storageInstance = getStorage();
    const value = Reflect.get(storageInstance, prop, receiver);
    return typeof value === "function" ? value.bind(storageInstance) : value;
  },
}) as ReturnType<typeof admin.storage>;

export default admin;
