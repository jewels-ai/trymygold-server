// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// GET /api/resources/:folder  (folder example: trymygold/gold_chains)
app.get('/api/resources/:folder', async (req, res) => {
  try {
    const folder = req.params.folder;
    const response = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500
    });
    const items = (response.resources || []).map(r => ({
      public_id: r.public_id,
      src: r.secure_url,
      format: r.format,
      width: r.width,
      height: r.height
    }));
    res.json(items);
  } catch (err) {
    console.error('Cloudinary error', err);
    res.status(500).json({ error: err.message || 'Cloudinary error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server listening on', PORT));
