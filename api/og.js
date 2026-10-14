/**
 * /api/og.js — Dynamic Open Graph Preview Generator
 * Generates rich link previews (image, title, price) for WhatsApp, Twitter, iMessage, Facebook, Telegram
 * when product links are shared.
 */

export default async function handler(req, res) {
  const { id, store } = req.query;

  if (store) {
    return renderStore(res, String(store));
  }

  const defaultMeta = {
    title: 'Market-U | Campus Marketplace',
    description: 'Buy, sell & discover on Market-U — the trusted campus marketplace for students.',
    image: 'https://marketu.store/og-preview.jpg',
    url: id ? `https://marketu.store/product/${encodeURIComponent(id)}` : 'https://marketu.store/',
  };

  if (!id) {
    return renderHtml(res, defaultMeta);
  }

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'market-u-391e1';
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products/${encodeURIComponent(id)}`;

    const response = await fetch(firestoreUrl);
    if (!response.ok) {
      return renderHtml(res, defaultMeta, id);
    }

    const data = await response.json();
    const fields = data.fields || {};

    const title = fields.title?.stringValue || 'Campus Item';
    const rawPrice = fields.price?.doubleValue ?? fields.price?.integerValue ?? fields.price?.stringValue ?? 0;
    const numericPrice = parseFloat(rawPrice) || 0;
    const formattedPrice = `₦${numericPrice.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    let description = fields.description?.stringValue || 'Available now on Market-U campus marketplace.';
    if (description.length > 200) {
      description = description.slice(0, 197) + '...';
    }

    // Get primary product image
    let imageUrl = defaultMeta.image;
    const imagesArray = fields.images?.arrayValue?.values;
    if (Array.isArray(imagesArray) && imagesArray.length > 0) {
      const firstImg = imagesArray[0]?.stringValue;
      if (firstImg && (firstImg.startsWith('http://') || firstImg.startsWith('https://'))) {
        imageUrl = firstImg;
      }
    }

    const sellerName = fields.sellerName?.stringValue || 'Student Seller';

    const meta = {
      title: `${title} • ${formattedPrice} | Market-U`,
      description: `${formattedPrice} — Sold by ${sellerName}. ${description}`,
      image: imageUrl,
      url: `https://marketu.store/product/${encodeURIComponent(id)}`,
    };

    return renderHtml(res, meta, id);
  } catch (error) {
    console.error('Error generating OG meta:', error);
    return renderHtml(res, defaultMeta, id);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function renderStore(res, sellerId) {
  const storePath = `/seller/${encodeURIComponent(sellerId)}`;
  const meta = {
    title: 'Campus Store | Market-U',
    description: 'Browse this student store on Market-U — the trusted campus marketplace.',
    image: 'https://marketu.store/og-preview.jpg',
    url: `https://marketu.store${storePath}`,
  };

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'market-u-391e1';
    const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    let sellerName = '';
    let school = '';
    try {
      const profRes = await fetch(`${base}/publicProfiles/${encodeURIComponent(sellerId)}`);
      if (profRes.ok) {
        const pf = (await profRes.json()).fields || {};
        sellerName = pf.name?.stringValue || '';
        school = pf.school?.stringValue || '';
      }
    } catch { /* ignore */ }

    const qRes = await fetch(`${base}:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'products' }],
          where: { fieldFilter: { field: { fieldPath: 'sellerId' }, op: 'EQUAL', value: { stringValue: sellerId } } },
          limit: 20,
        },
      }),
    });

    let count = 0;
    if (qRes.ok) {
      const rows = (await qRes.json()).filter(r => r.document);
      count = rows.length;
      // Pick the newest product with a valid image
      rows.sort((a, b) => {
        const ta = a.document.fields?.createdAt?.timestampValue || '';
        const tb = b.document.fields?.createdAt?.timestampValue || '';
        return tb.localeCompare(ta);
      });
      for (const r of rows) {
        const f = r.document.fields || {};
        if (!sellerName) sellerName = f.sellerName?.stringValue || '';
        const img = f.images?.arrayValue?.values?.[0]?.stringValue;
        if (img && /^https?:\/\//.test(img)) { meta.image = img; break; }
      }
    }

    const name = sellerName || 'Student Seller';
    meta.title = `${name}'s Store | Market-U`;
    meta.description = `🛍️ Shop ${count ? count + ' item' + (count === 1 ? '' : 's') : 'listings'} from ${name}${school ? ' at ' + school : ''} on Market-U.`;
  } catch (error) {
    console.error('Error generating store OG meta:', error);
  }

  return renderHtml(res, meta, null, storePath);
}

function renderHtml(res, meta, id, pathOverride) {
  const targetUrl = pathOverride || (id ? `/product/${encodeURIComponent(id)}` : '/');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />

  <!-- Open Graph / WhatsApp / Facebook / LinkedIn -->
  <meta property="og:type" content="product" />
  <meta property="og:site_name" content="Market-U" />
  <meta property="og:url" content="${escapeHtml(meta.url)}" />
  <meta property="og:title" content="${escapeHtml(meta.title)}" />
  <meta property="og:description" content="${escapeHtml(meta.description)}" />
  <meta property="og:image" content="${escapeHtml(meta.image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(meta.image)}" />
  <meta property="og:image:alt" content="${escapeHtml(meta.title)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(meta.url)}" />
  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
  <meta name="twitter:image" content="${escapeHtml(meta.image)}" />

  <!-- Instant redirect for regular human visitors -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}" />
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .loader { text-align: center; }
  </style>
</head>
<body>
  <div class="loader">
    <p>Opening ${escapeHtml(meta.title)} on Market-U...</p>
    <a href="${escapeHtml(targetUrl)}" style="color: #3b82f6;">Click here if not redirected</a>
  </div>
</body>
</html>`;

  return res.status(200).send(html);
}
