import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAr8rU1Bqwx_ZczoMWuRkWGvGxN3jTlg38",
  authDomain: "e-dr-tim-pharmacy.firebaseapp.com",
  projectId: "e-dr-tim-pharmacy",
  storageBucket: "e-dr-tim-pharmacy.firebasestorage.app",
  messagingSenderId: "412254956944",
  appId: "1:412254956944:web:60d385128056eb8b3cd715",
  measurementId: "G-KWSQ9YZDEN"
};

const VAPID_KEY = 'BPebo7QTfaYUjEmfnz1cMbl07r3aGYXhU4gKWDyNaATgDXScIo4-kTD0HD8ejKqZNfcfGOIXsDSngm4U9Xch2zs';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const requestForToken = async () => {
  try {
    const messaging = getMessaging(app);
    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY 
    });
    if (currentToken) {
      console.log('Current token for client: ', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log("Payload received: ", payload);
      resolve(payload);
    });
  });

export { app };
