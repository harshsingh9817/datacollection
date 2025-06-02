import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth'; // Added browserLocalPersistence, setPersistence, connectAuthEmulator
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'; // Added connectFirestoreEmulator

// console.logs for env variables are fine for debugging, can be removed for production
// console.log('Firebase Init: Attempting to load Firebase config from environment variables.');
// ...

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;

if (!getApps().length) {
  try {
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId ||
      !firebaseConfig.messagingSenderId ||
      !firebaseConfig.appId
    ) {
      console.error(
        'Firebase Init Error: Critical Firebase configuration values are missing. Check .env variables and restart server.'
      );
      // Consider throwing an error here to halt app startup if config is bad
      throw new Error("Critical Firebase configuration values are missing.");
    }
    app = initializeApp(firebaseConfig);
    console.log('Firebase Init: Firebase app initialized successfully with Project ID:', firebaseConfig.projectId);
  } catch (e: any) {
    console.error('Firebase Init Error: Failed to initialize Firebase app.', e);
    throw e;
  }
} else {
  app = getApp();
  console.log('Firebase Init: Firebase app already initialized, Project ID:', app.options.projectId);
}

let authInstance = getAuth(app); // Assign directly
let dbInstance = getFirestore(app); // Assign directly

// --- Optional: Explicitly set persistence (Firebase default is 'local' for web) ---
// This should ideally be called once, early.
// If you call it, make sure it's before any other auth operations for the session.
/*
setPersistence(authInstance, browserLocalPersistence)
  .then(() => {
    console.log("Firebase Auth persistence explicitly set to 'local'.");
  })
  .catch((error) => {
    console.error("Error setting Firebase Auth persistence:", error.code, error.message);
  });
*/

// Connect to Emulators if in development and flag is set
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    console.log("Firebase Init: Attempting to connect to Auth Emulator on localhost:9099");
    connectAuthEmulator(authInstance, 'http://localhost:9099', { disableWarnings: true });
    console.log("Firebase Init: Auth Emulator connected.");
  } catch (error) {
    console.error("Firebase Init Error: Connecting to Auth Emulator:", error);
  }
  try {
    console.log("Firebase Init: Attempting to connect to Firestore Emulator on localhost:8080");
    connectFirestoreEmulator(dbInstance, 'localhost', 8080);
    console.log("Firebase Init: Firestore Emulator connected.");
  } catch (error) {
    console.error("Firebase Init Error: Connecting to Firestore Emulator:", error);
  }
}


export { app, authInstance as auth, dbInstance as db };
