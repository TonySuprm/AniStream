const { serveHTTP } = require("stremio-addon-sdk");
const addonInterface = require("./addon"); // Assuming your main addon logic is in addon.js

const port = process.env.PORT || 7000;

serveHTTP(addonInterface, { port: port });

console.log(`Addon server running on port ${port}`);
console.log(`Visit http://127.0.0.1:${port}/manifest.json to install.`);
