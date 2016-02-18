const mbgl = require('mapbox-gl-native');
const fs = require('fs');
const path = require('path');
// const test_style = require('./styles/mapzen.json');
const sharp = require('sharp');
const request = require('request');
const url = require('url');
const _ = require('lodash');

const defaultOptions = {
    request(req, callback) {

        const opts = {
            url: req.url,
            encoding: null,
            gzip: true
        };

        if (url.parse(req.url).protocol === 'mapbox:') {
            opts.url = req.url.replace('mapbox://fonts/mapbox', 'https://a.tiles.mapbox.com/v4/fontstack');
            opts.qs = { access_token: 'pk.eyJ1IjoiYmNhbXBlciIsImEiOiJWUmh3anY0In0.1fgSTNWpQV8-5sBjGbBzGg'};
        }

        if (url.parse(opts.url).protocol === 'https:') {
            console.log('request tile:', opts.url);
            request(opts, (err, res, body) => {
                if (err) {
                    console.log('request error:', err);
                    callback(err);
                } else if (res.statusCode == 200) {
                    const response = {};

                    if (res.headers.modified) { response.modified = new Date(res.headers.modified); }
                    if (res.headers.expires) { response.expires = new Date(res.headers.expires); }
                    if (res.headers.etag) { response.etag = res.headers.etag; }

                    response.data = body;

                    callback(null, response);
                } else {
                    callback(new Error(JSON.parse(body).message));
                }
            });
        } else {
            // local file
            fs.readFile(path.join(__dirname, req.url), (err, data) => {
                console.log('local file:', path.join(__dirname, req.url));
                callback(err, { data: data });
            });
        }

    },
    ratio: 1
};

mbgl.on('message', (msg) => {
    console.log('mbgl:',msg);
});

const StaticMap = function(options){
    options = options || defaultOptions;
    this.map = new mbgl.Map(options);

};

StaticMap.prototype.load = function(style){
    style = style || 'mapzen';
    // Style name or json file path
    const style_path = style.indexOf('.json') > -1 ? style : './styles/' + style + '.json';
    this.map.load(require(style_path));
};

StaticMap.prototype.render = function(options, callback){
    options = _.assign({
        zoom: 12,
        center: [-119.698190, 34.420831],
        width: 1024,
        height: 1024
    }, options);
    this.map.render(options, (err, image) => {
        if (err) throw err;
        this.map.release();
        console.time('Image processing');
        image = sharp(image, {raw: {
            width: options.width,
            height: options.height,
            channels: 4
        }}).png().toBuffer((err, outputBuffer) => {
            if (err) throw err;
            console.timeEnd('Image processing');
            callback && callback(outputBuffer);
        });
    });
};

StaticMap.router = function(req, res, next){
    console.time('Total request');
    const options = {
        zoom: +req.query.zoom,
        center: req.query.center.split(',').map(parseFloat),
        width: +req.query.width || 256,
        height: +req.query.height || 256
    };
    const map = new StaticMap();
    const style = req.query.style;
    map.load(style);
    map.render(options, (image) => {
        res.type('png').send(image);
        console.timeEnd('Total request');
    });

};

module.exports = StaticMap;
