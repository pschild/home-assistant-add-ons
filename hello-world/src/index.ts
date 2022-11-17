import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';
import { differenceInMinutes } from 'date-fns';

const app = express();
const port = 8000;

let LAST_CRAWL_DATE: Date = null;

app.get('/crawl', async (req, res) => {
  const crawlResult = await crawl(
    {
      latitude: 51.5045685,
      longitude: 6.9971393
    },
    {
      latitude: 51.668189,
      longitude: 6.148282
    }
  );
  res.json(crawlResult);
});

app.get('/crawl/:fromLatLng/:toLatLng', async (req, res) => {
  const now = new Date();

  const [fromLat, fromLng] = req.params.fromLatLng.split(',');
  const [toLat, toLng] = req.params.toLatLng.split(',');
  log(`Path Params: [${fromLat},${fromLng}] -> [${toLat},${toLng}]`);
  log(`Query Params: ${JSON.stringify(req.query)}`);

  if (isNaN(+fromLat) || isNaN(+fromLng) || isNaN(+toLat) || isNaN(+toLng)) {
    log('Coords in wrong format!');
    return;
  }

  if (LAST_CRAWL_DATE && differenceInMinutes(now, LAST_CRAWL_DATE) < 5) {
    log(`Cancelling request, passed time since last crawl: ${differenceInMinutes(now, LAST_CRAWL_DATE)}`);
    return;
  }

  const crawlResult = await crawl(
    {
      latitude: +fromLat,
      longitude: +fromLng
    },
    {
      latitude: +toLat,
      longitude: +toLng
    }
  );
  res.json(crawlResult);

  LAST_CRAWL_DATE = now;
});

app.listen(port, () => {
  log(`server started at port ${port}`);
});