import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importe o Firestore

const firebaseConfig = {
  apiKey: "AIzaSyC4-iho4olFMPdSnjsg-NqKfcx0sAKbIvY",
  authDomain: "meu-pwa-acdm.firebaseapp.com",
  projectId: "meu-pwa-acdm",
  storageBucket: "meu-pwa-acdm.firebasestorage.app",
  messagingSenderId: "945917851052",
  appId: "1:945917851052:web:de9dfce18eb889a9587609"
};

const app = initializeApp(firebaseConfig);

// EXPORTE o 'db' para usar no App.vue
export const db = getFirestore(app); 

