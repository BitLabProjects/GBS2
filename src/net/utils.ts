import * as log from "loglevel";

const DEV: boolean = process.env.NODE_ENV === "development";
if (DEV) {
  // log.enableAll();
  log.disableAll();
}

export function get<K, V>(map: Map<K, V>, key: K): V {
  let result = map.get(key);
  if (result !== undefined) {
    return result;
  }
  throw new Error(`Key ${String(key)} not in Map ${map.toString()}`);
}

export function clone(object: any): any {
  return JSON.parse(JSON.stringify(object));
}

export function copyfields(source: any, dest: any): void {
  for (const [key, value] of Object.entries(source)) {
    dest[key] = value;
  }
}

export function shift<V>(array: Array<V>): V {
  let result = array.shift();
  if (result !== undefined) {
    return result;
  }
  throw new Error(`Shift returned undefined from Array ${array.toString()}`);
}
