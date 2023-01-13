import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';
import * as path from 'path';
import { googleMaps, tomtom, waze, wazeAlert } from './api';

const app = express();
const port = 8000;

app.get('/api', async (req, res) => {
  const params = req.query;
  log(`API Endpoint, Query Params: ${JSON.stringify(params)}`);

  const fromLat = +params.from_lat;
  const fromLng = +params.from_lng;
  const toLat = +params.to_lat;
  const toLng = +params.to_lng;

  if (!fromLat || !fromLng || !toLat || !toLng) {
    log('Empty coords!');
    return res.status(500).end();
  }

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    log('Coords could not be parsed to numbers!');
    return res.status(500).end();
  }

  try {
    googleMaps(fromLat, fromLng, toLat, toLng).then((result) => log(`Google Maps Result: ${JSON.stringify(result)}`));
    waze(fromLat, fromLng, toLat, toLng).then((result) => log(`Waze Result: ${JSON.stringify(result)}`));
    tomtom(fromLat, fromLng, toLat, toLng).then((result) => {
      log(`TomTom Result: ${JSON.stringify(result)}`);
      res.json(result);
    });
  } catch (e) {
    res.status(500).end();
  }
});

app.get('/alerts', async (req, res) => {
  const params = req.query;
  log(`Alerts Endpoint, Query Params: ${JSON.stringify(params)}`);

  const lat = +params.lat;
  const lng = +params.lng;

  if (!lat || !lng) {
    log('Empty coords!');
    return res.status(500).end();
  }

  if (isNaN(lat) || isNaN(lng)) {
    log('Coords could not be parsed to numbers!');
    return res.status(500).end();
  }

  try {
    wazeAlert(lat, lng).then((result) => {
      log(`WazeAlert Result: ${JSON.stringify(result)}`);
      res.json(result);
    });
  } catch (e) {
    res.status(500).end();
  }
});

app.get('/crawl', async (req, res) => {
  const params = req.query;
  log(`Crawl Endpoint, Query Params: ${JSON.stringify(params)}`);

  const fromLat = +params.from_lat;
  const fromLng = +params.from_lng;
  const toLat = +params.to_lat;
  const toLng = +params.to_lng;

  if (!fromLat || !fromLng || !toLat || !toLng) {
    log('Empty coords!');
    return res.status(500).end();
  }

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    log('Coords could not be parsed to numbers!');
    return res.status(500).end();
  }

  try {
    const result = await crawl(
      {
        latitude: fromLat,
        longitude: fromLng
      },
      {
        latitude: toLat,
        longitude: toLng
      }
    );
    log(`Result: ${JSON.stringify(result)}`);

    // getting the route with the fastest time
    // const bestResult = result.reduce((prev, curr) => prev.minutes < curr.minutes ? prev : curr);

    // assuming that google will show the fastest/best route as first result
    const bestResult = result[0];

    res.json(bestResult);
  } catch (e) {
    res.status(500).end();
  }
});

app.get('/screenshot', async (req, res) => {
  res.sendFile(path.join(__dirname, `screenshot.png`));
});

app.listen(port, () => {
  // const file = fs.readFileSync('/config/configuration.yml', 'utf8');
  // const result = YAML.parse(file);
  // console.log(result);

  console.log(`TRAFFIC_PROVIDER=${process.env.TRAFFIC_PROVIDER}`);

  log(`server started at port ${port}`);
});