// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyBAsNiVPGUFH6ZiAzAVrhwD4tUKmoDPBEE",
  authDomain: "plantnet-cfeff.firebaseapp.com",
  projectId: "plantnet-cfeff",
  storageBucket: "plantnet-cfeff.firebasestorage.app",
  messagingSenderId: "833933095558",
  appId: "1:833933095558:web:18678d9f805a4c34791707",
  measurementId: "G-1XC3PLRFT2"
};

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_apiKey,
//   authDomain: import.meta.env.VITE_authDomain,
//   projectId: import.meta.env.VITE_projectId,
//   storageBucket: import.meta.env.VITE_storageBucket,
//   messagingSenderId: import.meta.env.VITE_messagingSenderId,
//   appId: import.meta.env.VITE_appId,
//   measurementId: import.meta.env.VITE_measurementId
// }

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
