// Import the functions you need from the SDKs you need
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { Platform } from "react-native";

// @ts-expect-error - getReactNativePersistence exists in the RN build (resolved by Metro's
// "react-native" export condition on native platforms) but isn't in firebase/auth's published
// type declarations. On web this import resolves to undefined, so it's only called when native.
import { getReactNativePersistence } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKs8kRFxfkK8MQcKn2L5wgHAKF2wIk7MA",
  authDomain: "how-kru.firebaseapp.com",
  projectId: "how-kru",
  storageBucket: "how-kru.firebasestorage.app",
  messagingSenderId: "593506366112",
  appId: "1:593506366112:web:05d72a1d0d6dd52649cfc5",
  measurementId: "G-7RM864PLB3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// functions/src/index.ts의 리전(asia-northeast3)과 반드시 일치해야 한다.
export const functions = getFunctions(app, "asia-northeast3");

// Native (iOS/Android) needs explicit AsyncStorage persistence; web falls back to the
// SDK's default browser persistence via getAuth().
export const auth: Auth = Platform.OS === "web"
  ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });