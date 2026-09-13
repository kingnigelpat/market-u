// syncVerifiedSellers.js
// Run this script whenever you verify a seller to sync their status to all their products
// Usage: node syncVerifiedSellers.js
//
// Setup: npm install firebase-admin dotenv

import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf-8")); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncVerifiedSellers() {
  console.log("🔄 Starting sync...\n");

  // Step 1: Get all verified sellers
  const usersSnap = await db
    .collection("users")
    .where("verified", "==", true)
    .where("role", "==", "seller")
    .get();

  if (usersSnap.empty) {
    console.log("No verified sellers found.");
    return;
  }

  console.log(`✅ Found ${usersSnap.size} verified sellers\n`);

  let totalUpdated = 0;

  // Step 2: For each verified seller, update all their products
  for (const userDoc of usersSnap.docs) {
    const seller = userDoc.data();
    const sellerId = userDoc.id;

    console.log(`👤 Processing: ${seller.name} (${sellerId})`);

    // Get all products by this seller
    const productsSnap = await db
      .collection("products")
      .where("sellerId", "==", sellerId)
      .get();

    if (productsSnap.empty) {
      console.log(`   No products found for ${seller.name}\n`);
      continue;
    }

    // Batch update all their products
    const batch = db.batch();
    productsSnap.docs.forEach((productDoc) => {
      const product = productDoc.data();
      if (!product.sellerVerified) {
        // Only update if not already verified
        batch.update(productDoc.ref, { sellerVerified: true });
        console.log(`   ✅ Updated product: ${product.name}`);
        totalUpdated++;
      } else {
        console.log(`   ⏭️  Already verified: ${product.name}`);
      }
    });

    await batch.commit();
    console.log(`   Done for ${seller.name}\n`);
  }

  console.log(`\n🎉 Sync complete! Updated ${totalUpdated} products.`);
  // eslint-disable-next-line no-undef
  process.exit(0);
}

syncVerifiedSellers().catch((err) => {
  console.error("❌ Error:", err);
  // eslint-disable-next-line no-undef
  process.exit(1);
});
