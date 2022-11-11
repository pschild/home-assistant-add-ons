import * as express from 'express';
import { crawl } from './crawler';

const app = express();
const port = 8000;

app.get('/', async (req, res) => {
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

app.listen(port, () => {
  console.log(`server started at port ${port}`);
});