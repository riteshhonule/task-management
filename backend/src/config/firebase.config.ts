import * as admin from 'firebase-admin';
import * as serviceAccount from './firebase-service-account.json';

export const firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});