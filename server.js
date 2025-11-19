// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Simple health check
app.get('/_health', (req, res) => {
  res.json({ status: 'ok' });
});

// NEW: catch-all for nested folders
// Example requests this accepts:
// GET /api/resources/trymygold/gold_chains
// GET /api/resources/trymygold/gold_earrings
app.get('/api/resources/*', async (req, res) => {
  try {
    // req.params[0] holds the rest of the path after /api/resources/
    // e.g. "trymygold/gold_chains"
    const folder = req.params[0];
    if (!folder || folder.trim() === '') {
      return res.status(400).json({ error: 'Folder path required' });
    }

    // optional max_results query param (default 500)
    const maxResults = Math.min(1000, parseInt(req.query.max_results || '500', 10));

    // Use Cloudinary admin API to list resources under the prefix.
    // prefix expects folder-like string: "trymygold/gold_chains"
    const response = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: Math.min(500, maxResults) // Cloudinary caps per-request at 500
    });

    // If you might have >500 assets, we can attempt to paginate until maxResults.
    let resources = response.resources || [];

    // If there is a next_cursor and we want more results, paginate
    let nextCursor = response.next_cursor;
    while (nextCursor && resources.length < maxResults) {
      const page = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: Math.min(500, maxResults - resources.length),
        next_cursor: nextCursor
      });
      resources = resources.concat(page.resources || []);
      nextCursor = page.next_cursor;
    }

    // Map to a small JSON shape for the client
    const items = (resources || []).map(r => ({
      public_id: r.public_id,
      src: r.secure_url,
      format: r.format,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      created_at: r.created_at
    }));

    return res.json(items);
  } catch (err) {
    console.error('Cloudinary error', err);
    // Provide some details for debugging but avoid leaking secrets
    return res.status(500).json({ error: 'Cloudinary error', details: err.message || err.toString() });
  }
});

// Optional root message to be friendly when visiting the service URL in browser
app.get('/', (req, res) => {
  res.send('TryMyGold server — API is at /api/resources/{folder}. Example: /api/resources/trymygold/gold_chains');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server listening on ${PORT}`));
