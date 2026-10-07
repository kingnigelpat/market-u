import 'dotenv/config';
import { getFirebaseAdmin } from './api/_firebase.js';

/**
 * Migration script to backfill existing users documents into the new publicProfiles collection.
 * Copies public marketplace data: name, phone, schoolName, verified, bio, role.
 * Sensitive data (email, fcmTokens) is intentionally omitted to protect user privacy.
 *
 * Usage: node syncPublicProfiles.js
 */
async function backfillPublicProfiles() {
    console.log('[MIGRATION] Starting publicProfiles backfill...');

    try {
        const adminApp = getFirebaseAdmin();
        const db = adminApp.firestore();

        const usersSnapshot = await db.collection('users').get();
        console.log(`[MIGRATION] Found ${usersSnapshot.size} user documents in /users collection.`);

        if (usersSnapshot.empty) {
            console.log('[MIGRATION] No user documents found. Exiting.');
            return;
        }

        let batch = db.batch();
        let batchCount = 0;
        let totalUpdated = 0;

        for (const doc of usersSnapshot.docs) {
            const data = doc.data();
            const pubRef = db.collection('publicProfiles').doc(doc.id);

            const publicData = {
                name: data.name || '',
                phone: data.phone || '',
                schoolName: data.schoolName || '',
                verified: !!data.verified,
                bio: data.bio || '',
                role: data.role || 'buyer',
                updatedAt: adminApp.firestore.FieldValue.serverTimestamp(),
            };

            batch.set(pubRef, publicData, { merge: true });
            batchCount++;
            totalUpdated++;

            // Firestore batch limit is 500 operations
            if (batchCount >= 400) {
                await batch.commit();
                console.log(`[MIGRATION] Committed batch of ${batchCount} public profiles.`);
                batch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await batch.commit();
            console.log(`[MIGRATION] Committed final batch of ${batchCount} public profiles.`);
        }

        console.log(`[MIGRATION] Successfully backfilled ${totalUpdated} public profiles.`);
    } catch (err) {
        console.error('[MIGRATION] Error during backfill:', err.message);
        process.exitCode = 1;
    }
}

backfillPublicProfiles();
