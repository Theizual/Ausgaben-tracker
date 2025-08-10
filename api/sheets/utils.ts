export const HEADERS = {
  Categories:   ['id','name','color','group','budget','icon','lastModified','version','isDeleted'],
  Transactions: ['id','amount','description','categoryId','date','tagIds','lastModified','isDeleted','recurringId','version','userId'],
  Recurring:    ['id','amount','description','categoryId','frequency','dayOfMonth','startDate','endDate','lastProcessedDate','active','lastModified','version','isDeleted'],
  Tags:         ['id','name','color','lastModified','version','isDeleted'],
  Users:        ['id','name','color','lastModified','version','isDeleted'],
  UserSettings: ['userId','key','value','lastModified','version'] // bleibt wie in 0.503
} as const;

export type SheetName = keyof typeof HEADERS;

function parseGermanNumber(numString: string): number {
  if (typeof numString !== 'string' || numString.trim() === '') return 0;
  const cleanedString = numString.replace(/\./g, '').replace(',', '.');
  return Number(cleanedString) || 0;
}

function parseGermanDateToISO(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') return '';

  const match = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const [, day, month, year, hours, minutes, seconds] = match;
    const isoLikeString = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hours || '00').padStart(2,'0')}:${String(minutes || '00').padStart(2,'0')}:${String(seconds || '00').padStart(2,'0')}`;
    const d = new Date(isoLikeString);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const d = new Date(dateString);
  return !isNaN(d.getTime()) ? d.toISOString() : '';
}

export function rowsToObjects(sheet: SheetName, rows: any[][] = []): any[] {
  const headers = HEADERS[sheet];
  const allRows = rows || [];

  return allRows
    .filter(r => {
      if (!Array.isArray(r) || r.length === 0) return false;
      if (sheet === 'UserSettings') {
        // key oder settingKey akzeptieren
        return r[0] && String(r[0]).trim() !== '' &&
               (r[1] && String(r[1]).trim() !== '' || r[headers.indexOf('key')] || r[headers.indexOf('value')]);
      }
      return r[0] && String(r[0]).trim() !== '';
    })
    .map(r => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });

      // Backwards-Compat: settingKey/settingValue auf key/value mappen
      if (sheet === 'UserSettings') {
        if (!obj.key && (obj as any).settingKey) obj.key = (obj as any).settingKey;
        if (!obj.value && (obj as any).settingValue) obj.value = (obj as any).settingValue;
      }

      if (sheet === 'Transactions' || sheet === 'Recurring') {
        obj.amount = parseGermanNumber(obj.amount);
      }
      if (sheet === 'Categories') {
        obj.budget = parseGermanNumber(obj.budget);
      }

      if (sheet === 'Transactions') {
        if (obj.date) obj.date = parseGermanDateToISO(obj.date);
      }
      if (sheet === 'Recurring') {
        if (obj.startDate) obj.startDate = parseGermanDateToISO(obj.startDate);
        if (obj.endDate) obj.endDate = parseGermanDateToISO(obj.endDate);
        if (obj.lastProcessedDate) obj.lastProcessedDate = parseGermanDateToISO(obj.lastProcessedDate);
      }

      if (sheet === 'Transactions') {
        if (obj.tagIds && typeof obj.tagIds === 'string') {
          obj.tagIds = String(obj.tagIds).split(',').map(t => t.trim()).filter(Boolean);
        } else {
          obj.tagIds = [];
        }
        if (obj.userId) {
          obj.createdBy = obj.userId;
          delete obj.userId;
        }
      }

      if ('isDeleted' in obj) {
        obj.isDeleted = String(obj.isDeleted).toUpperCase() === 'TRUE';
      }
