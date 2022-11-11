const puppeteer = require('puppeteer');

const launchOptions = {
  headless: true,
  defaultViewport: { width: 1024, height: 768 },
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox']
};

async function run () {
  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // pass logs within headless browser to main console
    page.on('console', consoleObj => {
      if (consoleObj.type() === 'log') {
        console.log(consoleObj.text());
      }
    });

    console.log('Go to page ...');
    // Example: https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282/data=!3m1!4b1!4m2!4m1!3e0
    await page.goto(
      // `https://www.google.de/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}/data=!3m1!4b1!4m2!4m1!3e0`
      'https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282/data=!3m1!4b1!4m2!4m1!3e0'
    );
    console.log('Check if we need to accept cookies ...');
    const acceptButton = await page.$x('.//button/span[contains(text(), "Alle akzeptieren")]');
    if (!!acceptButton && acceptButton.length) {
      console.log('Accept cookies ...');
      acceptButton[0].click();
    }

    console.log('Wait for trips visible ...');
    // take the first trip as indicator for the page finished loading
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
  } catch(error) {
    console.error(error);
  } finally {
    console.log('Closing browser ...');
    await browser.close();
  }
}
run();