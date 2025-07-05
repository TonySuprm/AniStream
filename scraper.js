// scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const ptt = require('parse-torrent-title');

const NYAA_URL = 'https://nyaa.si';

async function scrapeNyaa(searchQuery) {
    console.log(`Scraping Nyaa for: ${searchQuery}`);
    const results = [];
    try {
        const url = `${NYAA_URL}/?f=0&c=1_2&q=${encodeURIComponent(searchQuery)}`; // c=1_2 is "Anime - English Translated"
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        $('table.torrent-list tbody tr').each((i, el) => {
            const row = $(el);
            const titleElement = row.find('td[colspan="2"] a:not(.comments)');
            
            const title = titleElement.text().trim();
            const magnet = row.find('td.text-center a[href^="magnet:"]').attr('href');
            const size = row.find('td.text-center').eq(1).text();
            const seeders = row.find('td.text-center').eq(3).text();

            if (title && magnet) {
                // Use parse-torrent-title to get structured data
                const parsedInfo = ptt.parse(title);

                results.push({
                    title: title,
                    parsedInfo: parsedInfo,
                    magnet: magnet,
                    seeders: parseInt(seeders) || 0,
                    size: size,
                    source: 'Nyaa.si'
                });
            }
        });

        console.log(`Found ${results.length} results on Nyaa.`);
        return results;

    } catch (error) {
        console.error('Error scraping Nyaa:', error.message);
        return []; // Return empty array on error
    }
}

// We can add scrapeAnimetosho here later following a similar pattern.
// module.exports = { scrapeNyaa, scrapeAnimetosho };
module.exports = { scrapeNyaa };