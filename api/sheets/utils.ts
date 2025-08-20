export const HEADERS = {
  Groups:       ['id','name','sortIndex','lastModified','version','isDeleted', 'color', 'isDefault', 'icon', 'isHiddenInQuickAdd'],
  Categories:   ['id','name','color','budget','icon','lastModified','version','isDeleted', 'groupId', 'sortIndex'],
  Transactions: ['id','amount','description','categoryId','date','tagIds','lastModified','isDeleted','recurringId','version','userId','transactionGroupId','iconOverride','isCorrected','groupBaseAmount','createdAt','notes','isVerified'],
  Recurring:    ['id','amount','description','categoryId','frequency','dayOfMonth','startDate','endDate','lastProcessedDate','active','lastModified','version','isDeleted', 'notes'],
  Tags:         ['id','name','color','lastModified','version','isDeleted'],
  Users:        ['id','name','color','lastModified','version','isDeleted'],
  UserSettings: ['userId','key','value','lastModified','version'],
  TransactionGroups: ['id','targetAmount','createdAt','lastModified','version','isDeleted'],
  Recipes: ['id','name','ingredients','instructions','price','link','lastModified','isDeleted','userId','tags','base','sideSuggestion','isPremium','version'],
  WeeklyPlans: ['weekKey', 'data', 'lastModified', 'version', 'isDeleted'],
  ShoppingLists: ['weekKey', 'data', 'lastModified', 'version', 'isDeleted'],
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
        return r[0] && String(r[0]).trim() !== '' &&
               (r[1] && String(r[1]).trim() !== '' || r[2] && String(r[2]).trim() !== '');
      }
      return r[0] && String(r[0]).trim() !== '';
    })
    .map(r => {
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });

      // Robust number parsing
      if (sheet === 'Transactions' || sheet === 'Recurring' || sheet === 'TransactionGroups') {
        obj.amount = parseGermanNumber(obj.amount);
        obj.targetAmount = parseGermanNumber(obj.targetAmount);
      }
      if (sheet === 'Categories') {
        obj.budget = parseGermanNumber(obj.budget);
        obj.sortIndex = Number(obj.sortIndex) || 0;
      }
      if (sheet === 'Groups') {
          obj.sortIndex = Number(obj.sortIndex) || 0;
      }
       if (sheet === 'Recurring') {
        obj.dayOfMonth = Number(obj.dayOfMonth) || null;
      }
      if (sheet === 'Recipes') {
        obj.price = parseGermanNumber(obj.price);
      }
      if(sheet === 'Transactions'){
          obj.groupBaseAmount = parseGermanNumber(obj.groupBaseAmount);
          if (!obj.groupBaseAmount) {
            obj.groupBaseAmount = obj.amount;
          }
      }

      // Robust date parsing
      if ('lastModified' in obj && obj.lastModified) {
        obj.lastModified = parseGermanDateToISO(obj.lastModified);
      }
      if ('createdAt' in obj && obj.createdAt) {
          obj.createdAt = parseGermanDateToISO(obj.createdAt);
      }
      if (sheet === 'Transactions') {
        if (obj.date) obj.date = parseGermanDateToISO(obj.date);
        // Fallback for createdAt for older records
        if (!obj.createdAt) {
          obj.createdAt = obj.date || new Date().toISOString();
        }
      }
      if (sheet === 'Recurring') {
        if (obj.startDate) obj.startDate = parseGermanDateToISO(obj.startDate);
        if (obj.endDate) obj.endDate = parseGermanDateToISO(obj.endDate);
        if (obj.lastProcessedDate) obj.lastProcessedDate = parseGermanDateToISO(obj.lastProcessedDate);
      }

      // Sheet-specific transformations
      if (sheet === 'Transactions') {
        if (obj.tagIds && typeof obj.tagIds === 'string') {
          obj.tagIds = String(obj.tagIds).split(',').map(t => t.trim()).filter(Boolean);
        } else {
          obj.tagIds = [];
        }
        // Map userId (Sheet) -> createdBy (App)
        if (obj.userId) {
          obj.createdBy = obj.userId;
          delete obj.userId;
        }
      }
      if (sheet === 'Recipes') {
        if (obj.ingredients && typeof obj.ingredients === 'string') {
            obj.ingredients = String(obj.ingredients).split('\n').map(t => t.trim()).filter(Boolean).map(line => {
                const parts = line.split('::');
                if (parts.length === 2) {
                    return { name: parts[0].trim(), category: parts[1].trim() };
                }
                return { name: line, category: 'Sonstiges' };
            });
        } else {
            obj.ingredients = [];
        }
        if (obj.tags && typeof obj.tags === 'string') {
          obj.tags = String(obj.tags).split(',').map(t => t.trim()).filter(Boolean);
        } else {
          obj.tags = [];
        }
      }

      // Booleans & Version normalisieren
      if ('isDeleted' in obj) {
        obj.isDeleted = String(obj.isDeleted).toUpperCase() === 'TRUE';
      } else {
        (obj as any).isDeleted = false;
      }
      if ('isPremium' in obj) {
        obj.isPremium = String(obj.isPremium).toUpperCase() === 'TRUE';
      }
      if(sheet === 'Transactions'){
          obj.isCorrected = String(obj.isCorrected).toUpperCase() === 'TRUE';
          obj.isVerified = String(obj.isVerified).toUpperCase() === 'TRUE';
      }
      
      if (sheet === 'Groups') {
        obj.isDefault = String(obj.isDefault).toUpperCase() === 'TRUE';
        obj.isHiddenInQuickAdd = String(obj.isHiddenInQuickAdd).toUpperCase() === 'TRUE';
      }

      if (sheet === 'Recurring') {
        // active defaultet auf true, außer explizit 'FALSE'
        obj.active = String(obj.active).toUpperCase() !== 'FALSE';
      }

      if ('version' in obj) {
        const parsedVersion = parseInt(String(obj.version).replace(',', '.'), 10);
        obj.version = isNaN(parsedVersion) ? 0 : parsedVersion;
      } else {
        (obj as any).version = 0;
      }
      
      // Initialize structures for JSON-based sheets to prevent render errors on empty/malformed data.
      if (sheet === 'WeeklyPlans') {
        obj.days = [];
        obj.totalEstimate = 0;
        obj.totalOverride = 0;
      }
      if (sheet === 'ShoppingLists') {
        obj.checkedItems = [];
        obj.customItems = [];
      }

      // Parse JSON data, overwriting defaults if successful.
      if ((sheet === 'WeeklyPlans' || sheet === 'ShoppingLists') && obj.data) {
        try {
            const parsedData = JSON.parse(obj.data);
            delete obj.data;
            Object.assign(obj, parsedData);
        } catch (e) {
            console.warn(`Could not parse JSON for ${sheet} with key ${obj.weekKey}`);
            // Defaults will be used in case of error
        }
      }


      return obj;
    });
}

export function objectsToRows(sheet: SheetName, items: any[] = []): any[][] {
  const headers = HEADERS[sheet];

  const processedItems = items.map(it => {
    if (sheet === 'WeeklyPlans') {
      const { weekKey, lastModified, version, isDeleted, days, totalEstimate, totalOverride } = it;
      return { weekKey, lastModified, version, isDeleted, data: { days, totalEstimate, totalOverride } };
    }
    if (sheet === 'ShoppingLists') {
      const { weekKey, lastModified, version, isDeleted, checkedItems, customItems } = it;
      return { weekKey, lastModified, version, isDeleted, data: { checkedItems, customItems } };
    }
    return it;
  });

  return processedItems.map(it => headers.map(h => {
    // Map createdBy (App) -> userId (Sheet) für Transactions
    let val = h === 'userId' && sheet === 'Transactions' ? it.createdBy : it[h];

    if (sheet === 'Recipes') {
      if (h === 'ingredients') {
        val = Array.isArray(it.ingredients) ? it.ingredients.map(i => `${i.name}::${i.category}`).join('\n') : '';
      }
    }
    
    if ((sheet === 'WeeklyPlans' || sheet === 'ShoppingLists') && h === 'data') {
        if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
        }
    }

    if (Array.isArray(val)) return val.join(',');
    if (typeof val === 'number') {
        if (h === 'version' || h === 'sortIndex' || h === 'dayOfMonth') return val;
        return val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    if (h === 'date' || h === 'startDate' || h === 'endDate' || h === 'lastModified' || h === 'lastProcessedDate' || h === 'createdAt') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const dd = d.getDate().toString().padStart(2, '0');
          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
          const yyyy = d.getFullYear();
          const HH = d.getHours().toString().padStart(2, '0');
          const MM = d.getMinutes().toString().padStart(2, '0');
          const SS = d.getSeconds().toString().padStart(2, '0');
          return `${dd}.${mm}.${yyyy} ${HH}:${MM}:${SS}`;
        }
      } catch {}
    }
    return val ?? '';
  }));
}