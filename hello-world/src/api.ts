import axios from 'axios';
import { log } from './util';
import { add, format } from 'date-fns';

interface ApiResponse {
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

export function tomtom(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<ApiResponse> {
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

export function waze(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<ApiResponse> {
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

export function googleMaps(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<ApiResponse> {
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
