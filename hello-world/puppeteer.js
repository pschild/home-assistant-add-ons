const puppeteer = require('puppeteer');

let launchOptions = {
  headless: true,
  defaultViewport: { width: 1024, height: 768 },
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox']
};

async function run () {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.pschild.de/');
    await page.screenshot({path: 'screenshot.png'});
    browser.close();
}
run();