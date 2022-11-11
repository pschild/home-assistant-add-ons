const puppeteer = require('puppeteer');

let launchOptions = {
  headless: true,
  defaultViewport: { width: 1024, height: 768 },
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox']
};

const parseDelayClass = (html) => {
  if (html.includes('delay-light')) {
    return TrafficDelay.LIGHT;
  } else if (html.includes('delay-medium')) {
    return TrafficDelay.MEDIUM;
  } else if (html.includes('delay-heavy')) {
    return TrafficDelay.HEAVY;
  } else {
    return TrafficDelay.DEFAULT;
  }
}

const parseDuration = (text) => {
  // Attention! "(?= (Std.|h))" does not work as lookahead pattern, as we cannot be sure if a normal space or a "different kind" of space (?) is in front of "Std." or "h".
  // So we need to match for a single character with . instead... => "(?=.(Std.|h))". Same applies for parsing the minutes.
  const hours = text.match(/\d+(?=.(Std.|h))/g);
  const mins = text.match(/\d+(?=.(Min.|min))/g);

  let duration = 0;
  if (hours) {
    duration += +hours[0] * 60;
  }
  if (mins) {
    duration += +mins[0];
  }
  return duration;
}

const parseDistance = (text) => {
  const distancePartKm = text.match(/\d+,?\d+(?=.(km))/g); // match "1,0 km", "63,7 km", "163 km"
  if (Array.isArray(distancePartKm) && distancePartKm.length) {
    return +distancePartKm[0].replace(',', '.');
  }

  // no km found, check for meters
  const distancePartM = text.match(/\d+(?=.(m\n))/g); // match "450 m"
  if (Array.isArray(distancePartM) && distancePartM.length) {
    return +distancePartM[0] / 1_000;
  }
}

export async function run() {
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
  
  return trips.map(trip => {
    const minutes = parseDuration(trip.text);
    const distance = parseDistance(trip.text);
    const delay = parseDelayClass(trip.html);
    console.log(`duration=${minutes}, distance=${distance}, delay=${delay}`);
    return { minutes, distance, delay };
  });

  await browser.close();
}
run();
