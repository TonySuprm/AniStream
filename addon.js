// addon.js (continued from Step 2)
const { addonBuilder } = require("stremio-addon-sdk");
const { scrapeNyaa } = require('./scraper');
const { resolveMagnet } = require('./debrid');

// ... (manifest from Step 2) ...

const builder = new addonBuilder(manifest);

// Stream handler
builder.defineStreamHandler(async (args) => {
    console.log("Stream requested:", args);
    
    // args will look like: { type: 'series', id: 'kitsu:43806', config: { alldebridApiKey: '...' } }
    // for Attack on Titan Final Season Part 2
    
    const { type, id, config } = args;
    const alldebridApiKey = config.alldebridApiKey;

    if (!alldebridApiKey) {
        return Promise.resolve({ streams: [] });
    }

    // Extract Kitsu ID and season/episode numbers
    const [idPrefix, kitsuId, season, episode] = id.split(':');
    
    // We need to get the anime title from the Kitsu ID. 
    // The *best* way is to use the Kitsu API. Torrentio has a sophisticated metadata system for this.
    // For simplicity, we'll fetch metadata from Stremio's own API.
    const meta = await getStremioMeta(kitsuId, type);
    if (!meta) {
        console.log('Could not get metadata for ID:', kitsuId);
        return Promise.resolve({ streams: [] });
    }

    // Construct a search query. Be specific to get better results.
    const searchQuery = `${meta.name} ${season ? 'S' + season.padStart(2, '0') : ''}E${episode.padStart(2, '0')}`;
    const altSearchQuery = `${meta.name} - ${episode}`; // Common anime format

    // Scrape Nyaa using both queries
    const scrapedResults1 = await scrapeNyaa(searchQuery);
    const scrapedResults2 = await scrapeNyaa(altSearchQuery);

    // Combine and remove duplicates
    const allResults = [...scrapedResults1, ...scrapedResults2].filter(
        (v, i, a) => a.findIndex(t => (t.magnet === v.magnet)) === i
    );
    
    console.log(`Total unique results after scraping: ${allResults.length}`);
    
    // Filter results to match the exact episode
    const matchingResults = allResults.filter(result => {
        return result.parsedInfo.season == season && result.parsedInfo.episode == episode;
    });

    if (matchingResults.length === 0) {
        console.log("No torrents found matching the exact episode.");
        return Promise.resolve({ streams: [] });
    }

    // Sort by seeders (healthiest torrent first)
    matchingResults.sort((a, b) => b.seeders - a.seeders);

    // --- DEBRID RESOLUTION ---
    // We will resolve the top few results to give the user options. Let's do the top 3.
    const resolutionPromises = matchingResults.slice(0, 3).map(result => 
        resolveMagnet(result.magnet, alldebridApiKey).then(debridLink => {
            if (debridLink) {
                // Construct the stream object Stremio understands
                return {
                    name: `[AD+] ${result.source}\n${result.parsedInfo.resolution || 'SD'}`,
                    title: `${result.title}\n💾 ${result.size} | 👤 ${result.seeders}`,
                    url: debridLink.url
                };
            }
            return null;
        })
    );
    
    const streams = (await Promise.all(resolutionPromises)).filter(Boolean); // Filter out nulls
    
    console.log(`Returning ${streams.length} resolved Debrid streams.`);
    return Promise.resolve({ streams: streams });
});


// Helper function to get metadata (title) from Stremio's API
const axios = require('axios');
async function getStremioMeta(kitsuId, type) {
    try {
        const response = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${kitsuId}.json`);
        return response.data.meta;
    } catch (e) {
        return null;
    }
}


module.exports = builder.getInterface();