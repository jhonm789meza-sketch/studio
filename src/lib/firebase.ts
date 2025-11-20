
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  "projectId": "rifaexpress",
  "appId": "1:945876849893:web:0c59d3ea4376475c76b00c",
  "storageBucket": "rifaexpress.appspot.com",
  "apiKey": "AIzaSyBnHP82Rccw1gS35YCUWGyYfRKbvnvXdmg",
  "authDomain": "rifaexpress-5b0ac.firebaseapp.com",
  "measurementId": "G-S6V0FE42M9",
  "messagingSenderId": "945876849893"
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let messaging: Messaging | null = null;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

db = getFirestore(app);
storage = getStorage(app);

if (typeof window !== 'undefined') {
    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.error("Could not initialize messaging", e);
    }
}

export { db, storage, messaging, app };
