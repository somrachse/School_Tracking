const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const r2Client = require('../config/r2');
const crypto = require('crypto');

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Upload a base64 data URL image to Cloudflare R2.
 * Returns the public URL of the uploaded image.
 * @param {string} base64String - e.g. "data:image/jpeg;base64,/9j/4AAQ..."
 * @param {string} folder - subfolder inside the bucket (default: "students")
 * @returns {Promise<string>} public URL
 */
async function uploadBase64ToR2(base64String, folder = 'students') {
    const matches = base64String.match(/^data:(.+);base64,(.+)$/s);
    if (!matches) throw new Error('Invalid base64 image string');

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
    const filename = `${folder}/${crypto.randomUUID()}.${ext}`;

    await r2Client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: filename,
            Body: buffer,
            ContentType: mimeType,
        })
    );
    return `${PUBLIC_URL}/${filename}`;
}

/**
 * Delete a file from R2 by its public URL.
 * Silently skips if the URL does not belong to R2.
 * @param {string} fileUrl - the full public URL of the R2 object
 */
async function deleteFromR2(fileUrl) {
    if (!fileUrl || !PUBLIC_URL || !fileUrl.startsWith(PUBLIC_URL)) return;
    const key = fileUrl.slice(PUBLIC_URL.length + 1); // remove "PUBLIC_URL/"
    try {
        await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (err) {
        console.warn('⚠️  R2 delete warning:', err.message);
    }
}

module.exports = { uploadBase64ToR2, deleteFromR2 };
