

export const HEADERS = {
  Categories: ['id','name','color','group','budget','icon','lastModified','version','isDeleted'],
  Transactions: ['id','amount','description','categoryId','date','tagIds','lastModified','isDeleted','recurringId','version','userId'],
  Recurring: ['id','amount','description','categoryId','frequency','dayOfMonth','startDate','endDate','lastProcessedDate','active','lastModified','version','isDeleted'],
  Tags: ['id','name','color','lastModified','version','isDeleted'],
  Users: ['id','name','color','lastModified','version','isDeleted'],
  UserSettings: ['userId','key','value','lastModified','version']
} as const;

export type SheetName = keyof typeof HEADERS;

function parseGermanNumber(numString: string): number {
    if (typeof numString !== 'string' || numString.trim() === '') return 0;
    // Remove thousand separators (dots) and then replace comma with a dot for decimal point
    const cleanedString = numString.replace(/\./g, '').replace(',', '.');
    return Number(cleanedString) || 0;
}

function parseGermanDateToISO(dateString: string): string {
    if (!dateString || typeof dateString !== 'string') return '';
    
    // Regex to capture DD.MM.YYYY and optional HH:mm or HH:mm:ss
    const match = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);

    if (match) {
        // Construct a string that `new Date()` can parse reliably: YYYY-MM-DDTHH:mm:ss
        const [, day, month, year, hours, minutes, seconds] = match;
        const isoLikeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours || '00').padStart(2, '0')}:${String(minutes || '00').padStart(2, '0')}:${String(seconds || '00').padStart(2, '0')}`;
        
        const d = new Date(isoLikeString);
        if (!isNaN(d.getTime())) {
            return d.toISOString();
        }
    }
    
    // If it doesn't match the German format, try to parse it as is (might be ISO already)
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
        return d.toISOString();
    }

    // If all fails, return empty string to indicate failure
    return '';
}

export function rowsToObjects(sheet: SheetName, rows: any[][] = []): any[] {
  const headers = HEADERS[sheet];
  const allRows = rows || [];

  return allRows.filter(r => {
      // Filter out empty rows or rows that don't have a valid key.
      if (!Array.isArray(r) || r.length === 0) return false;
      if (sheet === 'UserSettings') {
          // UserSettings needs both userId (r[0]) and key (r[1]) to be non-empty.
          return r[0] && String(r[0]).trim() !== '' && r[1] && String(r[1]).trim() !== '';
      }
      // All other sheets are identified by a non-empty id (r[0]).
      return r[0] && String(r[0]).trim() !== '';
    })
    .map(r => {
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        
        // Robust number parsing for currency fields
        if (sheet === 'Transactions' || sheet === 'Recurring') {
          obj.amount = parseGermanNumber(obj.amount);
        }
        if (sheet === 'Categories') {
            obj.budget = parseGermanNumber(obj.budget);
        }
        
        // Robust date parsing
        if (sheet === 'Transactions') {
          if(obj.date) obj.date = parseGermanDateToISO(obj.date);
        }
        if (sheet === 'Recurring') {
          if (obj.startDate) obj.startDate = parseGermanDateToISO(obj.startDate);
          if (obj.endDate) obj.endDate = parseGermanDateToISO(obj.endDate);
          if (obj.lastProcessedDate) obj.lastProcessedDate = parseGermanDateToISO(obj.lastProcessedDate);
        }
        
        // Transaction-specific transformations
        if (sheet === 'Transactions') {
            // Handle tagIds
            if (obj.tagIds && typeof obj.tagIds === 'string') {
                obj.tagIds = String(obj.tagIds).split(',').map((t: string) => t.trim()).filter(Boolean);
            } else {
                obj.tagIds = [];
            }
            // Map userId from sheet to createdBy in app object
            if (obj.userId) {
                obj.createdBy = obj.userId;
                delete obj.userId;
            }
        }

        // Robust boolean parsing
        obj.isDeleted = obj.isDeleted === 'TRUE';
        if (sheet === 'Recurring') {
          // For recurring transactions, 'active' defaults to true unless the cell is literally 'FALSE'.
          obj.active = obj.active !== 'FALSE';
        }

        return obj;
  });
}

export function objectsToRows(sheet: SheetName, items: any[] = []): any[][] {
  const headers = HEADERS[sheet];
  return items.map(it => headers.map(h => {
      // Map createdBy from app object to userId for the sheet
      const val = h === 'userId' && sheet === 'Transactions' ? it.createdBy : it[h];

      if (Array.isArray(val)) return val.join(',');
      if (typeof val === 'number') return val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (h === 'date' || h === 'startDate' || h === 'endDate' || h === 'lastModified' || h === 'lastProcessedDate') {
          try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) {
                  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
              }
          } catch {}
      }
      return val ?? '';
  }));
}