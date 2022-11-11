const http = require('http');
const puppeteer = require('./puppeteer.js');

const port = 8000;

const requestListener = async function(req, res) {
  const result = puppeteer.run();
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  // res.end(`{"message": "This is a JSON response"}`);
  res.end(JSON.stringify(result));
};

const server = http.createServer(requestListener);
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
