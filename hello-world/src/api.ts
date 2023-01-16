import axios from 'axios';
import { log } from './util';
import { add, differenceInDays, differenceInHours, differenceInMinutes, format, parse } from 'date-fns';
import { getDistanceBetweenTwoPoints } from 'calculate-distance-between-coordinates';

interface CommutingInfo {
  minutes: number;
  eta: string;
  distance: number;
  delay: string;
}

interface TomTomResponse {
  routes: Array<{
    summary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
      trafficDelayInSeconds: number;
      trafficLengthInMeters: number;
    };
    guidance: {
      instructions: Array<{
        roadNumbers?: string[];
      }>;
    };
  }>;
}

interface WazeResponse {
  alternatives: Array<{
    response: {
      isFastest: boolean;
      jams: Array<{
        id: number;
        severity: number;
      }>;
      routeName: string;
      totalLength: number;
      totalSeconds: number;
    };
  }>;
}

interface WazeAlertsResponse {
  alerts: Array<{
    confidence: number; // 0, 1, 2, ..., 5
    location: { x: number; y: number; };
    pubMillis: number;
    nThumbsUp: number; // 16
    street: string; // A42, A42 > Dortmund
    type: string; // POLICE, HAZARD
    subtype: string; // POLICE_VISIBLE, nur bei type=POLICE
    reportDescription: string; // nicht bei POLICE
  }>;
}

interface BlitzerDeResponse {
  pois: Array<{
    confirm_date: string; // 11:34, 01.01.1970
    create_date: string; // 11:23, 30.03.2015
    lat: string;
    lng: string;
    type: string; // 1, 107, 110
    vmax: string; // 30 (km/h)
    info?: {
      confirmed?: string; // 1
      quality?: string; // 10
      desc?: string; // text
    };
  }>;
}

export function tomtom(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<CommutingInfo> {
  const url = `https://mydrive.api-system.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json\
?key=sATA9OwG11zrMKQcCxR3eSEjj2n8Jsrg\
&routeType=fastest\
&traffic=true\
&maxAlternatives=1\
&travelMode=car\
&instructionsType=tagged\
&language=de-de\
&sectionType=carTrain\
&sectionType=country\
&sectionType=ferry\
&sectionType=motorway\
&sectionType=pedestrian\
&sectionType=tollRoad\
&sectionType=tollVignette\
&sectionType=traffic\
&sectionType=travelMode\
&sectionType=tunnel
`;

  return axios.get<TomTomResponse>(url)
    .then((res) => {
      log('TOMTOM');
      res.data.routes.forEach((route) => {
        log(`${(route.summary.lengthInMeters / 1000).toFixed(1)}km, ${toDuration(route.summary.travelTimeInSeconds)}, +${toDuration(route.summary.trafficDelayInSeconds)}`);
        const autobahnen = new Set(
          route.guidance.instructions
            .map((instruction) => !!instruction.roadNumbers ? instruction.roadNumbers.find((no) => !!no.match(/^A(3|40|42|57)$/)) : undefined)
            .filter(Boolean)
        );
        log(`über ${Array.from(autobahnen).join(', ')}`);
      });
      return res;
    })
    .then((res) => {
      const bestRoute = res.data.routes[0];
      const minutes = Math.ceil(bestRoute.summary.travelTimeInSeconds / 60);
      const eta = format(add(new Date(), { minutes }), 'HH:mm');
      const distance = +((bestRoute.summary.lengthInMeters / 1000).toFixed(1));
      return {
        minutes,
        eta,
        distance,
        delay: 'normal'
      };
    });
}

export function waze(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<CommutingInfo> {
  const url = `https://www.waze.com/live-map/api/user-drive?geo_env=row`;

  return axios.post<WazeResponse>(url, {
    from: { y: fromLat, x: fromLng },
    to: { y: toLat, x: toLng },
    nPaths: 3,
    useCase: 'LIVEMAP_PLANNING',
    interval: 15,
    arriveAt: true
  })
    .then((res) => {
      log('WAZE');
      res.data.alternatives.forEach((alternative) => {
        log(`${(alternative.response.totalLength / 1000).toFixed(1)}km, ${toDuration(alternative.response.totalSeconds)}, Staus: ${alternative.response.jams.length}, schnellste: ${alternative.response.isFastest}`);
        log(`über ${alternative.response.routeName}`);
      });
      return res;
    })
    .then((res) => {
      const bestRoute = res.data.alternatives[0];
      const minutes = Math.ceil(bestRoute.response.totalSeconds / 60);
      const eta = format(add(new Date(), { minutes }), 'HH:mm');
      const distance = +((bestRoute.response.totalLength / 1000).toFixed(1));
      return {
        minutes,
        eta,
        distance,
        delay: 'normal'
      };
    });
}

export function wazeAlert(lat: number, lng: number): Promise<string[]> {
  const DELTA = 0.09;
  const url = `https://www.waze.com/row-rtserver/web/TGeoRSS\
?bottom=${lat - DELTA}\
&left=${lng - DELTA}\
&ma=200\
&mj=200\
&mu=20\
&right=${lng + DELTA}\
&top=${lat + DELTA}\
&types=alerts%2Ctraffic
`;

  return axios.get<WazeAlertsResponse>(url)
    .then((res) => {
      log('WAZE ALERTS');
      res.data.alerts?.filter((alert) => alert.type === 'POLICE' || alert.type === 'HAZARD').forEach((alert) => {
        log(`typ: ${alert.type}, street: ${alert.street}, ${getDistanceBetweenTwoPoints({ lat, lon: lng }, { lat: alert.location.y, lon: alert.location.x }).toFixed(1)}km, since: ${format(new Date(alert.pubMillis), 'dd.MM. HH:mm')}, confidence: ${alert.confidence}, thumbsUp: ${alert.nThumbsUp}, description: ${alert.reportDescription}`);
      });
      return res;
    })
    .then((res) => {
      if (res.data.alerts && res.data.alerts.length > 0) {
        const policeAlerts = res.data.alerts
          .filter((alert) => alert.type === 'POLICE')
          .filter((alert) => !!alert.street?.match(/(A\d+)/))
          .filter((alert) => differenceInHours(new Date(), new Date(alert.pubMillis)) <= 12)
        ;
        return policeAlerts.map((alert) => {
          const sinceHours = differenceInHours(new Date(), new Date(alert.pubMillis));
          const since = sinceHours >= 1 ? `${sinceHours}h` : `${differenceInMinutes(new Date(), new Date(alert.pubMillis))}min`;
          const streetMatch = alert.street.match(/(A\d+)/);
          return `${streetMatch[0]} vor ${since} (${alert.confidence})`;
        });
      }
    });
}

export function blitzerDeAlert(lat: number, lng: number): Promise<{ distance, vmax, since, lastConfirmed }> {
  const DELTA = 0.01;
  // type 1 = Mobiler Blitzer/Teilstationärer Blitzer, 107 = Fester Blitzer, 110 = Fester Blitzer für Rotlicht und Geschwindigkeit, 111 = Fester Blitzer
  const url = `https://cdn3.atudo.net/api/4.0/pois.php\
?type=101,102,103,104,105,106,107,108,109,110,111,112,113,115,114,ts,0,1,2,3,4,5,6\
&z=10\
&box=${lat - DELTA},${lng - DELTA},${lat + DELTA},${lng + DELTA}
`;

  return axios.get<BlitzerDeResponse>(url)
    .then((res) => {
      log('BLITZER.DE');
      res.data.pois?.forEach((poi) => {
        log(`typ: ${poi.type}, vmax: ${poi.vmax}, ${getDistanceBetweenTwoPoints({ lat, lon: lng }, { lat: +poi.lat, lon: +poi.lng }).toFixed(1)}km, since: ${poi.create_date}, confirmed: ${poi.info?.confirmed}}`);
      });
      return res;
    })
    .then((res) => {
      if (res.data.pois && res.data.pois.length > 0) {
        return res.data.pois.map((poi) => {
          const createDate = parseDate(poi.create_date);
          const confirmDate = parseDate(poi.confirm_date);
          let since;
          let lastConfirmed;
          if (poi.type === '1') { // Mobiler Blitzer/Teilstationärer Blitzer
            const sinceDays = differenceInDays(new Date(), createDate);
            const sinceHours = differenceInHours(new Date(), createDate);
            since = sinceDays >= 1
              ? `${sinceDays}d`
              : sinceHours >= 1
              ? `${sinceHours}h`
              : `${differenceInMinutes(new Date(), createDate)}min`;
            const lastConfirmedHours = differenceInHours(new Date(), confirmDate);
            lastConfirmed = lastConfirmedHours >= 1 ? `${lastConfirmedHours}h` : `${differenceInMinutes(new Date(), confirmDate)}min`;
          } else {
            since = undefined;
            lastConfirmed = undefined;
          }
          return {
            distance: getDistanceBetweenTwoPoints({ lat, lon: lng }, { lat: +poi.lat, lon: +poi.lng }),
            vmax: poi.vmax,
            since,
            lastConfirmed,
          };
        });
      }
    })
    .then((list) => {
      if (!list || !list.length) {
        return null;
      }
      const minDistance = Math.min(...list.filter((item) => !!item.distance).map((item) => item.distance));
      const minItem = list.find((item) => item.distance === minDistance);
      return { ...minItem, distance: +minItem.distance.toFixed(1) };
    });
}

export function googleMaps(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<CommutingInfo> {
  const url = `https://www.google.de/maps/preview/directions\
?authuser=0\
&hl=de\
&gl=de\
&pb=!1m4!3m2\
!3d\
${fromLat}\
!4d\
${fromLng}\
!6e2!1m4!3m2\
!3d\
${toLat}\
!4d\
${toLng}\
!6e2!3m9!1m3\
!1d\
68734.00686075684\
!2d\
6.6666666666666\
!3d\
55.555555555555\
!2m0!3m2!1i2156!2i1329!4f13.1!6m23!1m1!18b1!2m3!5m1!6e2!20e3!6m8!4b1!49b1!74i150000!75b1!85b1!89b1!114b1!149b1!10b1!14b1!16b1!17m1!3e1!20m2!1e0!2e3!8m0!15m4!1s91jAY5GfFNyAi-gPq9Sf4Ao!4m1!2i5620!7e81!20m28!1m6!1m2!1i0!2i0!2m2!1i458!2i1329!1m6!1m2!1i2106!2i0!2m2!1i2156!2i1329!1m6!1m2!1i0!2i0!2m2!1i2156!2i20!1m6!1m2!1i0!2i1309!2m2!1i2156!2i1329!27b1!28m0!40i629
`;

  const trafficTypes = ['default', 'light', 'medium', 'heavy'];

  return axios.get<any>(url)
    .then((res) => {
      log('GOOGLE MAPS');
      const json = JSON.parse(res.data.substring(4));
      const routes = json[0][1];
      routes.forEach((route) => {
        const name = route[0][1];
        const distance = route[0][2][0];
        const duration = route[0][10][0][0];
        const trafficType = route[0][10][1];
        const isFastestRoute = !!JSON.stringify(route).match('Schnellste Route');
        const etaTextMatch = JSON.stringify(route).match('Du kommst etwa um (.+) an.');
        log(`${(distance / 1000).toFixed(1)}km, ${toDuration(duration)}, ${trafficTypes[trafficType]}, schnellste: ${isFastestRoute}, etaText: ${etaTextMatch ? etaTextMatch[1] : 'N/A'}`);
        log(`über ${name}`);
      });
      return res;
    })
    .then((res) => {
      const json = JSON.parse(res.data.substring(4));
      const routes = json[0][1];
      const bestRoute = routes[0];
      const minutes = Math.ceil(bestRoute[0][10][0][0] / 60);
      const eta = format(add(new Date(), { minutes }), 'HH:mm');
      const distance = +((bestRoute[0][2][0] / 1000).toFixed(1));
      const delayIndex = bestRoute[0][10][1];
      const delay = trafficTypes[delayIndex];
      return {
        minutes,
        eta,
        distance,
        delay,
      };
    });
}

function toDuration(seconds: number): string {
  return new Date(seconds * 1000).toISOString().substring(11, 16);
}

function parseDate(value: string): Date {
  const timeMatch = value.match(/^(\d{2}:\d{2})$/);
  const dayMatch = value.match(/^(\d{2}.\d{2}.\d{4})$/);
  if (!!timeMatch) {
    return parse(timeMatch[0], 'H:mm', new Date());
  } else if (!!dayMatch) {
    return parse(dayMatch[0], 'dd.M.yyyy', new Date())
  } else {
    log(`Mooep!`);
  }
}