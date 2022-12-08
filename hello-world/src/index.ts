import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';
import * as path from 'path';

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
    return;
  }

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    log('Coords could not be parsed to numbers!');
    return;
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
    res.status(500);
  }
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