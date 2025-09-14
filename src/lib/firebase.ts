import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "rifaexpress",
  "appId": "1:945876849893:web:0c59d3ea4376475c76b00c",
  "storageBucket": "rifaexpress.firebasestorage.app",
  "apiKey": "AIzaSyBnHP82Rccw1gS35YCUWGyYfRKbvnvXdmg",
  "authDomain": "rifaexpress-5b0ac.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "945876849893"
};

let app: FirebaseApp;
let db: Firestore;

try {
  app = getApp();
  db = getFirestore(app);
} catch (e) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

// Enable offline persistence
try {
    if (typeof window !== 'undefined') {
        enableIndexedDbPersistence(db)
          .catch((err) => {
            if (err.code == 'failed-precondition') {
              // Multiple tabs open, persistence can only be enabled
              // in one tab at a a time.
              console.warn('Firestore persistence failed: Multiple tabs open.');
            } else if (err.code == 'unimplemented') {
              // The current browser does not support all of the
              // features required to enable persistence
               console.warn('Firestore persistence failed: Browser does not support persistence.');
            }
          });
    }
} catch(e) {
    console.error("Error enabling Firestore persistence", e)
}


export { db };
