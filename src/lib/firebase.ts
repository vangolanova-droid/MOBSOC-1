import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const config = firebaseConfig as Record<string, string | undefined>;

// Suppress internal Firestore connection warnings during offline/network reconnection
setLogLevel('error');

const dbId = config.firestoreDatabaseId || '(default)';

export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  },
  dbId
);

export const auth = getAuth(app);

export default app;
