import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';

const app = express();
const port = 8000;

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
  const [fromLat, fromLng] = req.params.fromLatLng.split(',');
  const [toLat, toLng] = req.params.toLatLng.split(',');
  log(`Query Params: [${fromLat},${fromLng}] -> [${toLat},${toLng}]`);
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
});

app.listen(port, () => {
  log(`server started at port ${port}`);
});