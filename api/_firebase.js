import admin from 'firebase-admin';

let isInitialized = false;

export function getFirebaseAdmin() {
    if (isInitialized && admin.apps.length > 0) {
        return admin;
    }

    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountRaw) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not configured');
    }

    let serviceAccount;
    try {
        serviceAccount = typeof serviceAccountRaw === 'string'
            ? JSON.parse(serviceAccountRaw)
            : serviceAccountRaw;
    } catch {
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON credentials');
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    }

    isInitialized = true;
    return admin;
}

/**
 * Verifies the Firebase ID token from Authorization header.
 * @param {object} req - HTTP request
 * @returns {Promise<{ uid: string, email?: string, [key: string]: any }>} Decoded token
 */
export async function verifyAuth(req) {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
        const error = new Error('Missing or invalid Authorization header. Expected Bearer token.');
        error.statusCode = 401;
        throw error;
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
        const error = new Error('Empty Bearer token');
        error.statusCode = 401;
        throw error;
    }

    try {
        const adminApp = getFirebaseAdmin();
        const decoded = await adminApp.auth().verifyIdToken(token);
        return decoded;
    } catch (err) {
        console.warn('[AUTH] ID token verification failed:', err.message);
        const error = new Error('Unauthorized. Invalid or expired token.');
        error.statusCode = 401;
        throw error;
    }
}

/**
 * Verifies that the request comes from an authenticated administrator.
 * Checks role === 'admin' in Firestore /users/{uid}.
 * @param {object} req - HTTP request
 * @returns {Promise<{ uid: string, email?: string, role: string }>}
 */
export async function verifyAdmin(req) {
    const user = await verifyAuth(req);
    const adminApp = getFirebaseAdmin();
    const userDoc = await adminApp.firestore().collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
        const error = new Error('Forbidden. User profile not found.');
        error.statusCode = 403;
        throw error;
    }

    const userData = userDoc.data() || {};
    const role = (userData.role || '').trim().toLowerCase();

    if (role !== 'admin') {
        const error = new Error('Forbidden. Admin privileges required.');
        error.statusCode = 403;
        throw error;
    }

    return { ...user, role: 'admin' };
}
