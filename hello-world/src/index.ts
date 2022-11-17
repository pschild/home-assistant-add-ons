import * as express from 'express';
import { crawl } from './crawler';
import { log } from './util';

const app = express();
const port = 8000;

app.get('/crawl', async (req, res) => {
  const params = req.query;
  log(`Query Params: ${JSON.stringify(params)}`);

  const fromLat = +params.from_lat;
  const fromLng = +params.from_lng;
  const toLat = +params.to_lat;
  const toLng = +params.to_lng;

  if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
    log('Coords in wrong format!');
    return;
  }

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
  const minResult = result.reduce((prev, curr) => prev.minutes < curr.minutes ? prev : curr);
  res.json(minResult);
});

app.listen(port, () => {
  log(`server started at port ${port}`);
});