import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3e1jPTiTBSnhkPQqkxVlRZrhbzj7wBJ8",
  authDomain: "rage-assist.firebaseapp.com",
  projectId: "rage-assist",
  storageBucket: "rage-assist.firebasestorage.app",
  messagingSenderId: "681269307666",
  appId: "1:681269307666:web:b13be9fd264324f1e7ebcb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile };