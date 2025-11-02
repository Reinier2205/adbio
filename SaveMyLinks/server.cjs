// server.js
// To use: npm install express axios cheerio cors
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());

function absoluteUrl(base, url) {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

app.get('/api/fetch-metadata', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }
  try {
    let response;
    try {
      response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
    } catch (fetchErr) {
      return res.status(500).json({ error: 'Failed to fetch external URL metadata', details: fetchErr.message });
    }
    if (!response.headers['content-type'] || !response.headers['content-type'].includes('text/html')) {
      return res.status(400).json({ error: 'Target URL is not an HTML page' });
    }
    const html = response.data;
    const $ = cheerio.load(html);

    // Title
    let title = $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    // Description
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    // Image
    let imageUrl = $('meta[property="og:image"]').attr('content') || '';
    if (!imageUrl) {
      // Try favicon
      const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '';
      if (favicon) imageUrl = absoluteUrl(url, favicon);
    } else {
      imageUrl = absoluteUrl(url, imageUrl);
    }

    // Escape HTML in text fields
    const escape = (str) => str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
    // Always return a JSON object, even if fields are empty
    return res.status(200).json({
      title: escape(title) || '',
      description: escape(description) || '',
      imageUrl: imageUrl || ''
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during metadata extraction', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Metadata proxy server running on port ${PORT}`);
}); 