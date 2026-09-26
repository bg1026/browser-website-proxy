/**
 * Browser Website Proxy - Backend Server
 * Handles CORS and proxies requests to target websites
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Proxy server is running' });
});

/**
 * Main proxy endpoint
 * Usage: GET /proxy?url=https://example.com
 */
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({
            error: 'Missing URL parameter',
            message: 'Please provide a URL via the "url" query parameter'
        });
    }

    // Validate URL
    try {
        new url.URL(targetUrl);
    } catch (error) {
        return res.status(400).json({
            error: 'Invalid URL',
            message: 'The provided URL is not valid'
        });
    }

    try {
        // Fetch the target website
        const response = await axios.get(targetUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Browser-Website-Proxy/1.0'
            },
            maxRedirects: 5
        });

        // Return the content
        res.set('Content-Type', response.headers['content-type'] || 'text/html');
        res.send(response.data);

    } catch (error) {
        console.error('Proxy error:', error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                error: 'Target server error',
                message: `The target server returned status ${error.response.status}`,
                url: targetUrl
            });
        }

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'Connection refused',
                message: 'Could not connect to the target server',
                url: targetUrl
            });
        }

        if (error.code === 'ENOTFOUND') {
            return res.status(404).json({
                error: 'Host not found',
                message: 'The target host could not be resolved',
                url: targetUrl
            });
        }

        res.status(500).json({
            error: 'Proxy error',
            message: error.message,
            url: targetUrl
        });
    }
});

/**
 * Proxy endpoint for POST requests
 */
app.post('/proxy', async (req, res) => {
    const targetUrl = req.body.url;
    const data = req.body.data;

    if (!targetUrl) {
        return res.status(400).json({
            error: 'Missing URL',
            message: 'Please provide a URL in the request body'
        });
    }

    try {
        const response = await axios.post(targetUrl, data, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Browser-Website-Proxy/1.0'
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Proxy POST error:', error.message);
        res.status(500).json({
            error: 'Proxy error',
            message: error.message
        });
    }
});

/**
 * API endpoint to get website metadata
 */
app.get('/api/metadata', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({
            error: 'Missing URL parameter'
        });
    }

    try {
        const response = await axios.get(targetUrl, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Browser-Website-Proxy/1.0'
            }
        });

        const parsedUrl = new url.URL(targetUrl);
        
        res.json({
            url: targetUrl,
            hostname: parsedUrl.hostname,
            protocol: parsedUrl.protocol,
            statusCode: response.status,
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length'],
            title: 'Website loaded via proxy'
        });

    } catch (error) {
        res.status(400).json({
            error: 'Could not fetch metadata',
            message: error.message
        });
    }
});

/**
 * 404 handler
 */
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: [
            'GET /health',
            'GET /proxy?url=<url>',
            'POST /proxy',
            'GET /api/metadata?url=<url>'
        ]
    });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Server error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✓ Browser Website Proxy server running on http://localhost:${PORT}`);
    console.log(`✓ API endpoint: GET /proxy?url=<url>`);
    console.log(`✓ Health check: GET /health`);
});
