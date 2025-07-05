// debrid.js
const axios = require('axios');

const AGENT = 'myStremioAddon'; // A user agent required by AllDebrid API
const API_BASE_URL = 'https://api.alldebrid.com/v4';

async function resolveMagnet(magnetLink, apiKey) {
    try {
        // 1. Upload the magnet link
        const uploadResponse = await axios.get(`${API_BASE_URL}/magnet/upload`, {
            params: { agent: AGENT, apikey: apiKey, magnet: magnetLink }
        });

        if (uploadResponse.data.status !== 'success') {
            throw new Error(uploadResponse.data.error?.message || 'Failed to upload magnet');
        }

        const magnetId = uploadResponse.data.data.magnets[0].id;

        // 2. Check magnet status (we'll do a simple check, a real addon might need polling)
        const statusResponse = await axios.get(`${API_BASE_URL}/magnet/status`, {
            params: { agent: AGENT, apikey: apiKey, id: magnetId }
        });
        
        if (statusResponse.data.status !== 'success' || statusResponse.data.data.magnets.status !== 'Ready') {
            throw new Error('Magnet is not ready on AllDebrid');
        }
        
        // 3. Get the links and unlock the main video file
        const links = statusResponse.data.data.magnets.links;
        // Find the largest file, which is usually the video
        const videoLink = links.sort((a, b) => b.size - a.size)[0]; 

        if (!videoLink) {
            throw new Error('No video file found in the torrent');
        }

        const unlockResponse = await axios.get(`${API_BASE_URL}/link/unlock`, {
            params: { agent: AGENT, apikey: apiKey, link: videoLink.link }
        });

        if (unlockResponse.data.status !== 'success') {
            throw new Error(unlockResponse.data.error?.message || 'Failed to unlock link');
        }

        return {
            url: unlockResponse.data.data.link,
            filename: videoLink.filename
        };

    } catch (error) {
        console.error('AllDebrid Error:', error.message);
        return null;
    }
}

module.exports = { resolveMagnet };