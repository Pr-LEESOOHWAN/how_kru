import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKs8kRFxfkK8MQcKn2L5wgHAKF2wIk7MA",
  authDomain: "how-kru.firebaseapp.com",
  projectId: "how-kru",
  storageBucket: "how-kru.firebasestorage.app",
  messagingSenderId: "593506366112",
  appId: "1:593506366112:web:05d72a1d0d6dd52649cfc5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

try {
  const snap = await getDocs(collection(db, "dishes"));
  console.log("READ OK, doc count:", snap.size);
} catch (err) {
  console.error("READ FAILED:", err.code || err.message);
}
