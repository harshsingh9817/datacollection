
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

console.log('Firebase Init: Attempting to load Firebase config from environment variables.');
console.log('Firebase Init: NEXT_PUBLIC_FIREBASE_API_KEY =', process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log('Firebase Init: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN =', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log('Firebase Init: NEXT_PUBLIC_FIREBASE_PROJECT_ID =', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('Firebase Init: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
console.log('Firebase Init: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID =', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
console.log('Firebase Init: NEXT_PUBLIC_FIREBASE_APP_ID =', process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app: FirebaseApp;

if (!getApps().length) {
  try {
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId ||
      // storageBucket can sometimes be optional depending on setup
      !firebaseConfig.messagingSenderId ||
      !firebaseConfig.appId
    ) {
      console.error(
        'Firebase Init Error: One or more critical Firebase configuration values are missing or undefined in your .env file. Please ensure all NEXT_PUBLIC_FIREBASE_ variables are correctly set and that you have restarted your development server.'
      );
      // This will likely cause initializeApp to fail if critical values are truly missing.
    }
    app = initializeApp(firebaseConfig);
    console.log('Firebase Init: Firebase app initialized successfully with Project ID:', firebaseConfig.projectId);
  } catch (e: any) {
    console.error('Firebase Init Error: Failed to initialize Firebase app. This could be due to missing/invalid config or network issues.', e);
    // To allow the app to load but show other errors, we might just log.
    // However, if initializeApp fails, getAuth/getFirestore will also fail.
    if (e.message && (e.message.includes('apiKey') || e.message.includes('projectId') || e.message.includes('Invalid API key'))) {
        throw new Error(`Firebase initialization failed due to invalid or missing configuration: ${e.message}. Please check your .env file and restart your development server.`);
    }
    // For other errors (like network during init), we might let it pass so other parts of app can degrade gracefully.
    throw e; // Re-throw other unexpected errors
  }
} else {
  app = getApp();
  console.log('Firebase Init: Firebase app already initialized, getting existing app for Project ID:', app.options.projectId);
}

let authInstance;
let dbInstance;

try {
  authInstance = getAuth(app);
} catch(e) {
  console.error("Firebase Init Error: Failed to getAuth instance. Firebase app might not be initialized correctly.", e);
}

try {
  dbInstance = getFirestore(app);
} catch(e) {
  console.error("Firebase Init Error: Failed to getFirestore instance. Firebase app might not be initialized correctly.", e);
}

export { app, authInstance as auth, dbInstance as db };
