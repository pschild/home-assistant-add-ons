import * as puppeteer from 'puppeteer';
import { log } from './util';
import * as path from 'path';
import { add, format } from 'date-fns';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export enum TrafficDelay {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
  DEFAULT = 'default'
}

export interface CrawlResultItem {
  minutes: number;
  distance: number;
  delay: TrafficDelay;
}

export const crawl = async (origin: LatLng, destination: LatLng) => {
  const launchOptions = {
    headless: true,
    defaultViewport: { width: 1024, height: 768 },
    // executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox']
  };

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // pass logs within headless browser to main console
    page.on('console', consoleObj => {
      if (consoleObj.type() === 'log') {
        log(consoleObj.text());
      }
    });

    log('Go to page ...');
    // Example: https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282/data=!3m1!4b1!4m2!4m1!3e0
    await page.goto(
      `https://www.google.de/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}/data=!3m1!4b1!4m2!4m1!3e0`
    );
    log('Check if we need to accept cookies ...');
    const acceptButton = await page.$x('.//button/span[contains(text(), "Alle akzeptieren")]');
    if (!!acceptButton && acceptButton.length) {
      log('Accept cookies ...');
      await acceptButton[0].click();
    }

    log('Wait for trips visible ...');
    // take the first trip as indicator for the page finished loading
    await page.waitFor(`#section-directions-trip-0`);

    log('Evaluating page ...');
    const trips: { text: string; html: string }[] = await page.evaluate(() => {
      const DURATION_ROW_SELECTOR = `section-directions-trip-`;

      // loop over all trips and collect raw text/html for each
      return Array.from(document.querySelectorAll(`[id^="${DURATION_ROW_SELECTOR}"]`))
        .filter(e => e.id.match(new RegExp(`${DURATION_ROW_SELECTOR}\\d$`)))
        .map(row => ({ text: (row as HTMLElement).innerText, html: row.innerHTML }))
    });

    // Screenshot
    // await page.waitFor(10000);
    // log('Saving screenshot ...');
    // await page.screenshot({
    //   path: path.join(__dirname, `screenshot.png`),
    //   clip: { x: 435, y: 110, width: 1024 - 435, height: 768 - 110 * 2 }
    // });

    return trips.map(trip => {
      const minutes = parseDuration(trip.text);
      const eta = format(add(new Date(), { minutes }), 'HH:mm');
      const distance = parseDistance(trip.text);
      const delay = parseDelayClass(trip.html);
      log(`duration=${minutes}, distance=${distance}, delay=${delay}`);
      return { minutes, eta, distance, delay };
    });

  } catch (error) {
    log(`Error! ${error}`);
    throw new Error(`Puppeteer parsing failed: ${error}`);

  } finally {
    log('Closing browser ...');
    await browser.close();
  }
};

const parseDelayClass = (html: string): TrafficDelay => {
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

/**
 * @param text Raw text from website
 * @returns Duration (in minutes)
 */
const parseDuration = (text: string): number => {
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

/**
 * @param text Raw text from website
 * @returns Distance (in km)
 */
const parseDistance = (text: string): number => {
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