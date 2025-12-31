import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyD-Miz5UJxLJ821CR1b_iFjYG3Y6mzk3k0",
    authDomain: "puno-f2307.firebaseapp.com",
    projectId: "puno-f2307",
    storageBucket: "puno-f2307.firebasestorage.app",
    messagingSenderId: "723050982988",
    appId: "1:723050982988:web:ec7d11c289ecd75d388ee9"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
