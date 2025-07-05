// server.js
const express = require('express');
const addonInterface = require('./addon');

const app = express();
const port = process.env.PORT || 7000;

// Mount the addon interface
app.use('/', addonInterface);

app.listen(port, () => {
    console.log(`Stremio addon server listening on http://localhost:${port}`);
    console.log(`Install link: http://localhost:${port}/manifest.json`);
});