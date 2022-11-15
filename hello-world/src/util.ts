import { format } from 'date-fns';

export function log(logMessage: string): void {
  console.log(`${format(new Date(), 'dd.MM.yyyy HH:mm:ss.SSS')}: ${logMessage}`);
}
