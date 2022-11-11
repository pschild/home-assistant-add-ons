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
    await page.goto('https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282/data=!3m1!4b1!4m2!4m1!3e0');
    const acceptButton = await page.$x('.//button/span[contains(text(), "Alle akzeptieren")]');
    if (!!acceptButton && acceptButton.length) {
      console.log('Accept cookies ...');
      await acceptButton[0].click();
    }
    console.log('Wait for trips visible ...');
    await page.waitFor(`#section-directions-trip-0`);
    console.log('Evaluating page ...');
    const trips = await page.evaluate(() => {
      const DURATION_ROW_SELECTOR = `section-directions-trip-`;

      // loop over all trips and collect raw text/html for each
      return Array.from(document.querySelectorAll(`[id^="${DURATION_ROW_SELECTOR}"]`))
        .filter(e => e.id.match(new RegExp(`${DURATION_ROW_SELECTOR}\\d$`)))
        .map(row => ({ text: row.innerText, html: row.innerHTML }))
  });
  console.log('success');
  console.log(trips);
  await browser.close();
}
run();
