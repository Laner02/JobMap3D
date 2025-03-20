const path = require('path');

module.exports = {
    mode: 'development',
    entry: {                                                    // Entry JS files for bundles
        main: './jobmapweb/assets/main.js',
    },
    output: {
        filename: '[name].bundle.js',                           // The bundle has the same name as the asset
        path: path.resolve(__dirname, './jobmapweb/static'),   // Saves the bundle into the django static folder
    },
};