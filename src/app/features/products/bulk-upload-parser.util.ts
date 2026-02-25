import { BulkPreviewRow } from './bulk-upload-preview-modal.component';

const COL_NAME = 0;
const COL_SKU = 1;
const COL_BARCODE = 2;
const COL_PRICE = 3;
const COL_CATEGORY = 4;
const COL_INITIAL_STOCK = 5;
const COL_LOW_STOCK_THRESHOLD = 6;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim().replace(/""/g, '"'));
      cur = '';
    } else if (c === '\n' || c === '\r') {
      break;
    } else {
      cur += c;
    }
  }
  out.push(cur.trim().replace(/""/g, '"'));
  return out;
}

function validateRowBase(cells: string[]): string[] {
  const errors: string[] = [];

  // Price: optional, but if present must be a non-negative number.
  const priceStr = (cells[COL_PRICE] ?? '').trim();
  if (priceStr) {
    const num = parseFloat(priceStr);
    if (Number.isNaN(num)) errors.push('Invalid price');
    else if (num < 0) errors.push('Price must be ≥ 0');
  }

  // Initial stock: optional, but if present must be ≥ 0.
  const stockStr = (cells[COL_INITIAL_STOCK] ?? '').trim();
  if (stockStr) {
    const n = parseInt(stockStr, 10);
    if (Number.isNaN(n) || n < 0) errors.push('Initial stock must be ≥ 0');
  }

  // Low stock threshold: optional, but if present must be ≥ 0.
  const lowStr = (cells[COL_LOW_STOCK_THRESHOLD] ?? '').trim();
  if (lowStr) {
    const n = parseInt(lowStr, 10);
    if (Number.isNaN(n) || n < 0) errors.push('Low stock threshold must be ≥ 0');
  }

  return errors;
}

// Validation when treating a row as a NEW product (no existing SKU).
function validateRowAsNew(cells: string[], rowIndex: number): string[] {
  const errors = validateRowBase(cells);
  const name = (cells[COL_NAME] ?? '').trim();
  if (!name) errors.push('Name required');
  const priceStr = (cells[COL_PRICE] ?? '').trim();
  if (!priceStr) errors.push('Price required');
  return errors;
}

// Validation when treating a row as an UPDATE to an existing SKU.
function validateRowAsUpdate(cells: string[], rowIndex: number): string[] {
  const errors = validateRowBase(cells);
  const skuStr = (cells[COL_SKU] ?? '').trim();
  if (!skuStr) {
    errors.push('SKU required for update');
  }
  return errors;
}

// Initial validation at parse time (before we know which SKUs exist) –
// treat everything as a potential NEW product.
function validateRowInitial(cells: string[], rowIndex: number): string[] {
  return validateRowAsNew(cells, rowIndex);
}

function cellAt(cells: string[], index: number): string {
  if (index >= cells.length) return '';
  const s = cells[index];
  return s != null ? String(s).trim() : '';
}

export function parseCsvFile(file: File): Promise<BulkPreviewRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = (reader.result as string) || '';
      const lines = text.split(/\r?\n/).filter(l => l.length > 0);
      if (lines.length < 2) {
        resolve([]);
        return;
      }
      const rows: BulkPreviewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        if (cells.length === 0) continue;
        const hasAnyValue = cells.some(c => (c ?? '').toString().trim().length > 0);
        if (!hasAnyValue) continue;
        const rowIndex = i + 1;
        const errors = validateRowInitial(cells, rowIndex);
        rows.push({
          rowIndex,
          name: cellAt(cells, COL_NAME),
          sku: cellAt(cells, COL_SKU),
          barcode: cellAt(cells, COL_BARCODE),
          price: cellAt(cells, COL_PRICE),
          category: cellAt(cells, COL_CATEGORY),
          initialStock: cellAt(cells, COL_INITIAL_STOCK),
          lowStockThreshold: cellAt(cells, COL_LOW_STOCK_THRESHOLD),
          errors
        });
      }
      resolve(rows);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

// Dynamic import to avoid loading xlsx until needed
async function loadXlsx(): Promise<typeof import('xlsx')> {
  const mod = await import('xlsx');
  return mod;
}

export async function parseExcelFile(file: File): Promise<BulkPreviewRow[]> {
  const XLSX = await loadXlsx();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }
        const sheet = wb.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        const rows: BulkPreviewRow[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const raw = rawRows[i] ?? [];
          const cells = Array.isArray(raw) ? raw.map(c => (c != null ? String(c).trim() : '')) : [];
          const hasAnyValue = cells.some(c => (c ?? '').toString().trim().length > 0);
          if (!hasAnyValue) continue;
          const rowIndex = i + 1;
          const errors = validateRowInitial(cells, rowIndex);
          rows.push({
            rowIndex,
            name: cells[COL_NAME] ?? '',
            sku: cells[COL_SKU] ?? '',
            barcode: cells[COL_BARCODE] ?? '',
            price: cells[COL_PRICE] ?? '',
            category: cells[COL_CATEGORY] ?? '',
            initialStock: cells[COL_INITIAL_STOCK] ?? '',
            lowStockThreshold: cells[COL_LOW_STOCK_THRESHOLD] ?? '',
            errors
          });
        }
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseBulkFile(file: File): Promise<BulkPreviewRow[]> {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv')) return parseCsvFile(file);
  return parseExcelFile(file);
}

/** Re-validate a single row (e.g. after edit). */
export function validatePreviewRow(row: BulkPreviewRow): string[] {
  const cells = [
    row.name,
    row.sku,
    row.barcode,
    row.price,
    row.category,
    row.initialStock,
    row.lowStockThreshold
  ];
  return row.skuExists ? validateRowAsUpdate(cells, row.rowIndex) : validateRowAsNew(cells, row.rowIndex);
}

/** Build a CSV file from current rows for upload (handles commas in values). */
function escapeCsvValue(val: string): string {
  const s = String(val ?? '').trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCsvFileFromRows(rows: BulkPreviewRow[], fileName = 'bulk-upload.csv'): File {
  const header = 'Name,SKU,Barcode,Price,Category,Initial Stock,Low Stock Threshold';
  const lines = [
    header,
    ...rows.map(r =>
      [
        escapeCsvValue(r.name),
        escapeCsvValue(r.sku),
        escapeCsvValue(r.barcode),
        escapeCsvValue(r.price),
        escapeCsvValue(r.category),
        escapeCsvValue(r.initialStock),
        escapeCsvValue(r.lowStockThreshold)
      ].join(',')
    )
  ];
  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  return new File([blob], fileName, { type: 'text/csv' });
}
