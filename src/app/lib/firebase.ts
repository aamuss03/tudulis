import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
  apiKey: "AIzaSyB-JJ34DbF87sYlRlM_uRYoIQmps-rn6VI",
  authDomain: "test-9bdfa.firebaseapp.com",
  projectId: "test-9bdfa",
  storageBucket: "test-9bdfa.firebasestorage.app",
  messagingSenderId: "316518435889",
  appId: "1:316518435889:web:bc74535cc2643654dc9910",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
