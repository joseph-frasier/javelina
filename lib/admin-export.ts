import * as XLSX from 'xlsx';

/**
 * Export utilities for admin portal
 * Supports CSV, JSON, and Excel exports
 */

export type ExportFormat = 'csv' | 'json' | 'excel';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * Generate filename with timestamp
 */
function getFilename(basename: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `${basename}_${timestamp}.${extension}`;
}

/**
 * Flatten nested objects for export
 */
function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};
  
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      flattened[prefix + key] = '';
    } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
    } else if (Array.isArray(obj[key])) {
      flattened[prefix + key] = obj[key].length;
    } else {
      flattened[prefix + key] = obj[key];
    }
  }
  
  return flattened;
}

/**
 * Format data for export (flatten nested objects, format dates)
 */
function prepareData(data: any[]): any[] {
  return data.map(item => {
    const flattened = flattenObject(item);
    
    // Format dates
    for (const key in flattened) {
      const value = flattened[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        flattened[key] = new Date(value).toLocaleString();
      }
    }
    
    return flattened;
  });
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], basename: string, options: ExportOptions = {}): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const prepared = prepareData(data);
  const headers = Object.keys(prepared[0]);
  
  // Create CSV content
  const csvRows = [
    headers.join(','),
    ...prepared.map(row =>
      headers.map(header => {
        const value = row[header];
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  const filename = options.filename || getFilename(basename, 'csv');
  
  // Download file
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], basename: string, options: ExportOptions = {}): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const filename = options.filename || getFilename(basename, 'json');
  
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any[], basename: string, options: ExportOptions = {}): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const prepared = prepareData(data);
  
  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(prepared);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Data');
  
  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(prepared[0]).map(key => ({
    wch: Math.min(
      maxWidth,
      Math.max(
        key.length,
        ...prepared.map(row => String(row[key] || '').length)
      )
    )
  }));
  worksheet['!cols'] = colWidths;
  
  const filename = options.filename || getFilename(basename, 'xlsx');
  
  // Download file
  XLSX.writeFile(workbook, filename);
}

/**
 * Helper function to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data in specified format
 */
export function exportData(
  data: any[],
  format: ExportFormat,
  basename: string,
  options: ExportOptions = {}
): void {
  try {
    switch (format) {
      case 'csv':
        exportToCSV(data, basename, options);
        break;
      case 'json':
        exportToJSON(data, basename, options);
        break;
      case 'excel':
        exportToExcel(data, basename, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

