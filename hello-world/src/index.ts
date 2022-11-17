import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';
import { differenceInMinutes } from 'date-fns';

const app = express();
const port = 8000;

// let LAST_CRAWL_DATE: Date = null;

app.get('/crawl', async (req, res) => {
  log(`Query Params: ${JSON.stringify(req.query)}`);
  res.json({
    minutes: 42 + Math.random() * 10,
    distance: 4.2 + Math.random() * 100,
    delay: 'light'
  });
});

app.get('/crawl/:fromLatLng/:toLatLng', async (req, res) => {
  // const now = new Date();

  const [fromLat, fromLng] = req.params.fromLatLng.split(',');
  const [toLat, toLng] = req.params.toLatLng.split(',');
  log(`Path Params: [${fromLat},${fromLng}] -> [${toLat},${toLng}]`);
  log(`Query Params: ${JSON.stringify(req.query)}`);

  if (isNaN(+fromLat) || isNaN(+fromLng) || isNaN(+toLat) || isNaN(+toLng)) {
    log('Coords in wrong format!');
    return;
  }

  // if (LAST_CRAWL_DATE && differenceInMinutes(now, LAST_CRAWL_DATE) < 5) {
  //   log(`Cancelling request, passed time since last crawl: ${differenceInMinutes(now, LAST_CRAWL_DATE)}`);
  //   return;
  // }

  const result = await crawl(
    {
      latitude: +fromLat,
      longitude: +fromLng
    },
    {
      latitude: +toLat,
      longitude: +toLng
    }
  );
  log(JSON.stringify(result));
  const minResult = result.reduce((prev, curr) => prev.minutes < curr.minutes ? prev : curr);
  res.json(minResult);

  // LAST_CRAWL_DATE = now;
});

app.listen(port, () => {
  log(`server started at port ${port}`);
});