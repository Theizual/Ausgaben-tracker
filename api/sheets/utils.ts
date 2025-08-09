export const HEADERS = {
  Categories: ['id','name','color','group','budget','icon','lastModified','version','isDeleted'],
  Transactions: ['id','date','description','amount','categoryId','tags','userId','recurringId','lastModified','version','isDeleted'],
  Recurring: ['id','amount','description','categoryId','frequency','dayOfMonth','startDate','endDate','active','lastModified','version','isDeleted'],
  Tags: ['id','name','color','lastModified','version','isDeleted'],
  Users: ['id','name','color','lastModified','version','isDeleted'],
  UserSettings: ['userId','key','value','lastModified','version']
} as const;

export type SheetName = keyof typeof HEADERS;

export function rowsToObjects(sheet: SheetName, rows: any[][] = []): any[] {
  const headers = HEADERS[sheet];
  return rows.map(r => {
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
    
    if (sheet === 'Transactions' || sheet === 'Recurring') {
      if (obj.amount !== '') obj.amount = Number(String(obj.amount).replace(',', '.')) || 0;
    }
    if (obj.tags && typeof obj.tags === 'string') {
        obj.tags = obj.tags ? String(obj.tags).split(',').map((t: string) => t.trim()) : [];
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
  return items.map(it => headers.map(h => Array.isArray(it[h]) ? it[h].join(',') : (it[h] ?? '')));
}