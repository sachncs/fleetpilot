export interface DeliveryImportRow {
  ref: string;
  kind: 'delivery' | 'pickup' | 'pair';
  pairRefId?: string;
  priority: number;
  windowStart?: string;
  windowEnd?: string;
  processingMin: number;
  quantity: number;
  lat: number;
  lng: number;
  region?: string;
  status: 'unassigned';
}

export const DELIVERY_CSV_TEMPLATE = [
  'ref,latitude,longitude,quantity,window_start,window_end,priority,service_minutes,region,kind',
  'DEL-1001,28.6139,77.2090,24,09:00,12:00,3,10,Central,delivery',
  'DEL-1002,28.5355,77.3910,12,13:00,17:00,4,8,East,delivery',
].join('\n');

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const character = text[index]!;
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === ',') {
      row.push(field.trim());
      field = '';
    } else if (character === '\n') {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted value.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function requiredNumber(value: string | undefined, label: string, line: number): number {
  const parsed = Number(value);
  if (!value || !Number.isFinite(parsed)) throw new Error(`Line ${line}: ${label} must be a number.`);
  return parsed;
}

function optionalNumber(value: string | undefined, fallback: number, label: string, line: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Line ${line}: ${label} must be a number.`);
  return parsed;
}

/** Parse the operator-facing manifest format into API-ready delivery rows. */
export function parseDeliveryCsv(text: string): DeliveryImportRow[] {
  const matrix = parseCsv(text.replace(/^\uFEFF/, ''));
  if (matrix.length < 2) throw new Error('Add a header row and at least one delivery.');
  const headers = matrix[0]!.map(normalizedHeader);
  const indexOf = (...names: string[]): number => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
  const indexes = {
    ref: indexOf('ref', 'reference', 'order_ref'),
    lat: indexOf('lat', 'latitude'),
    lng: indexOf('lng', 'lon', 'longitude'),
    quantity: indexOf('quantity', 'qty', 'load'),
    start: indexOf('window_start', 'start', 'earliest'),
    end: indexOf('window_end', 'end', 'latest'),
    priority: indexOf('priority'),
    service: indexOf('service_minutes', 'processing_min', 'service_time'),
    region: indexOf('region', 'zone'),
    kind: indexOf('kind', 'type'),
    pairRef: indexOf('pair_ref_id', 'pair_ref'),
  };
  if (indexes.ref < 0 || indexes.lat < 0 || indexes.lng < 0) {
    throw new Error('Required columns: ref, latitude, longitude.');
  }

  const rows = matrix.slice(1).map((values, rowIndex): DeliveryImportRow => {
    const line = rowIndex + 2;
    const get = (index: number): string | undefined => index >= 0 ? values[index]?.trim() : undefined;
    const ref = get(indexes.ref);
    if (!ref) throw new Error(`Line ${line}: ref is required.`);
    const lat = requiredNumber(get(indexes.lat), 'latitude', line);
    const lng = requiredNumber(get(indexes.lng), 'longitude', line);
    if (lat < -90 || lat > 90) throw new Error(`Line ${line}: latitude must be between -90 and 90.`);
    if (lng < -180 || lng > 180) throw new Error(`Line ${line}: longitude must be between -180 and 180.`);
    const quantity = optionalNumber(get(indexes.quantity), 1, 'quantity', line);
    const priority = optionalNumber(get(indexes.priority), 3, 'priority', line);
    const processingMin = optionalNumber(get(indexes.service), 0, 'service_minutes', line);
    if (quantity < 0) throw new Error(`Line ${line}: quantity cannot be negative.`);
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) throw new Error(`Line ${line}: priority must be a whole number from 1 to 5.`);
    if (!Number.isInteger(processingMin) || processingMin < 0) throw new Error(`Line ${line}: service_minutes must be a non-negative whole number.`);
    const kind = (get(indexes.kind)?.toLowerCase() || 'delivery') as DeliveryImportRow['kind'];
    if (!['delivery', 'pickup', 'pair'].includes(kind)) throw new Error(`Line ${line}: kind must be delivery, pickup, or pair.`);
    const pairRefId = get(indexes.pairRef);
    if (kind === 'pair' && !pairRefId) throw new Error(`Line ${line}: pair_ref_id is required for paired work.`);
    const windowStart = get(indexes.start);
    const windowEnd = get(indexes.end);
    const clock = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    if (windowStart && !clock.test(windowStart)) throw new Error(`Line ${line}: window_start must use HH:MM.`);
    if (windowEnd && !clock.test(windowEnd)) throw new Error(`Line ${line}: window_end must use HH:MM.`);
    if (windowStart && windowEnd && windowStart > windowEnd) throw new Error(`Line ${line}: window_start cannot be after window_end.`);

    return {
      ref,
      kind,
      ...(pairRefId ? { pairRefId } : {}),
      priority,
      ...(windowStart ? { windowStart } : {}),
      ...(windowEnd ? { windowEnd } : {}),
      processingMin,
      quantity,
      lat,
      lng,
      ...(get(indexes.region) ? { region: get(indexes.region) } : {}),
      status: 'unassigned',
    };
  });

  const refs = new Set<string>();
  for (const row of rows) {
    const normalized = row.ref.toLowerCase();
    if (refs.has(normalized)) throw new Error(`Duplicate ref in file: ${row.ref}.`);
    refs.add(normalized);
  }
  if (rows.length > 500) throw new Error('A manifest can contain at most 500 deliveries.');
  return rows;
}
