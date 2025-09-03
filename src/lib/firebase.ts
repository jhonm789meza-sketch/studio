import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

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
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}

const db: Firestore = getFirestore(app);

export { db };
