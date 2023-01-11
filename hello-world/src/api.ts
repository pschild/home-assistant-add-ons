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
  const TOM_TOM_ROUTE = `https://mydrive.api-system.tomtom.com/routing/1/calculateRoute/${fromLat},${fromLng}:${toLat},${toLng}/json\
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

  return axios.get<TomTomResponse>(TOM_TOM_ROUTE)
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

function toDuration(seconds: number): string {
  return new Date(seconds * 1000).toISOString().substring(11, 16);
}
