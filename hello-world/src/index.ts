import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';
import * as path from 'path';
import axios from 'axios';

const app = express();
const port = 8000;

app.get('/crawl', async (req, res) => {
  const params = req.query;
  log(`Query Params: ${JSON.stringify(params)}`);

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

app.get('/test', async (req, res) => {
  const response = await axios.get(`https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282/data=!3m1!4b1!4m2!4m1!3e0`)
    .catch(err => console.log('Error axios:', err));
  console.log((response as any).data);
  // res.send({ size: (response as any).data.length });
  res.send((response as any).data);
});

app.get('/screenshot', async (req, res) => {
  res.sendFile(path.join(__dirname, `screenshot.png`));
});

app.listen(port, () => {
  // const file = fs.readFileSync('/config/configuration.yml', 'utf8');
  // const result = YAML.parse(file);
  // console.log(result);

  log(`server started at port ${port}`);
});