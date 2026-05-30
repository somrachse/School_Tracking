/**
 * Cloudflare Worker – R2 Image Server
 *
 * Routes:  https://schooltracking.online/schoolpack-storage/*
 * Serves:  Objects from the "schoolpack-storage" R2 bucket
 *
 * Deploy steps (Cloudflare Dashboard):
 *   1. Workers & Pages → Create Application → Create Worker
 *   2. Name it: schoolpack-storage-worker
 *   3. Paste this code → Deploy
 *   4. Settings → Bindings → R2 Bucket
 *      Variable name : R2_BUCKET
 *      Bucket        : schoolpack-storage
 *   5. Settings → Triggers → Add Custom Domain route:
 *      schoolpack.online/schoolpack-storage/*
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle /schoolpack-storage/* paths
    if (!url.pathname.startsWith('/schoolpack-storage/')) {
      return new Response('Not Found', { status: 404 });
    }

    // Strip the /schoolpack-storage/ prefix to get the R2 object key
    // e.g. /schoolpack-storage/students/abc.jpg → students/abc.jpg
    const objectKey = url.pathname.replace('/schoolpack-storage/', '');

    if (!objectKey) {
      return new Response('Bad Request', { status: 400 });
    }

    try {
      const object = await env.R2_BUCKET.get(objectKey);

      if (!object) {
        return new Response('Image Not Found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      // Cache images for 1 year in the browser, 30 days at Cloudflare edge
      headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=2592000');

      // Allow any origin to load images (needed for <img> tags on different domains)
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(object.body, { headers });
    } catch (err) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
