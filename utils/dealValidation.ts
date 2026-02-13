/**
 * Validación de datos para DealManagement
 * NACE, coordenadas, valores monetarios, etc.
 */

import { EUAssetType } from '../types';

// Formato NACE: Letra (sección) + opcional .XX.XX (ej: D, D.35, D.35.11, A.01)
const NACE_REGEX = /^[A-U](\.\d{2,4})*$/i;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNACE(value: string): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) return { valid: false, error: 'El sector NACE es requerido' };
  if (!NACE_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Formato NACE inválido. Use ej: D.35.11, A.01'
    };
  }
  return { valid: true };
}

export function validateLat(lat: number): ValidationResult {
  if (lat === undefined || lat === null || isNaN(lat)) {
    return { valid: false, error: 'Latitud requerida' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitud debe estar entre -90 y 90' };
  }
  return { valid: true };
}

export function validateLng(lng: number): ValidationResult {
  if (lng === undefined || lng === null || isNaN(lng)) {
    return { valid: false, error: 'Longitud requerida' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitud debe estar entre -180 y 180' };
  }
  return { valid: true };
}

export function validateCoordinates(lat: number, lng: number): ValidationResult {
  const latRes = validateLat(lat);
  if (!latRes.valid) return latRes;
  const lngRes = validateLng(lng);
  if (!lngRes.valid) return lngRes;
  if (lat === 0 && lng === 0) {
    return { valid: false, error: 'Introduzca unas coordenadas válidas (no 0,0)' };
  }
  return { valid: true };
}

export function validatePositiveNumber(value: number, fieldName: string): ValidationResult {
  if (value === undefined || value === null || isNaN(value)) {
    return { valid: false, error: `${fieldName} es requerido` };
  }
  if (value <= 0) {
    return { valid: false, error: `${fieldName} debe ser mayor a 0` };
  }
  return { valid: true };
}

export function validateOptionalPositive(value: number | undefined, fieldName: string): ValidationResult {
  if (value === undefined || value === null || value === 0) return { valid: true };
  if (isNaN(value)) return { valid: false, error: `${fieldName} debe ser un número` };
  if (value < 0) return { valid: false, error: `${fieldName} no puede ser negativo` };
  return { valid: true };
}

export function validateRequiredString(value: string, fieldName: string): ValidationResult {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { valid: false, error: `${fieldName} es requerido` };
  }
  return { valid: true };
}

export function isValidAssetType(value: string): value is EUAssetType {
  return Object.values(EUAssetType).includes(value as EUAssetType);
}

export function parseAssetType(raw: string): EUAssetType {
  const normalized = (raw || '').trim();
  if (isValidAssetType(normalized)) return normalized;
  // Fallback por similitud
  const lower = normalized.toLowerCase();
  if (lower.includes('solar') || lower === 'solar pv') return EUAssetType.SOLAR_PV;
  if (lower.includes('wind') && lower.includes('off')) return EUAssetType.WIND_OFFSHORE;
  if (lower.includes('wind')) return EUAssetType.WIND_ONSHORE;
  return EUAssetType.SOLAR_PV;
}

/** Parsea CSV/TSV desde texto (Excel copia con tabs) */
export function parseDelimitedText(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const sep = line.includes('\t') ? '\t' : ',';
    return line.split(sep).map(cell => cell.replace(/^"|"$/g, '').trim());
  });
}

export interface BulkParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: { row: number; message: string }[];
}

export function parseBulkCsv(text: string, requiredHeaders: string[]): BulkParseResult {
  const lines = parseDelimitedText(text);
  const errors: { row: number; message: string }[] = [];
  if (lines.length < 2) {
    return { headers: [], rows: [], errors: [{ row: 0, message: 'El archivo debe tener cabecera y al menos una fila de datos' }] };
  }
  const headers = lines[0].map(h => h.trim().toLowerCase());
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  if (missing.length > 0) {
    return {
      headers,
      rows: [],
      errors: [{ row: 1, message: `Faltan columnas: ${missing.join(', ')}` }]
    };
  }
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    if (!row['deal_name']?.trim()) continue;
    const lat = parseFloat(row['lat'] || '0');
    const lng = parseFloat(row['lng'] || '0');
    const exposed = parseFloat(row['exposed_value'] || '0');
    if (isNaN(lat) || lat < -90 || lat > 90) errors.push({ row: i + 1, message: `Latitud inválida: ${row['lat']}` });
    if (isNaN(lng) || lng < -180 || lng > 180) errors.push({ row: i + 1, message: `Longitud inválida: ${row['lng']}` });
    if (!row['asset_name']?.trim()) errors.push({ row: i + 1, message: 'Nombre de asset vacío' });
    if (isNaN(exposed) || exposed <= 0) errors.push({ row: i + 1, message: `Valor expuesto inválido: ${row['exposed_value']}` });
    rows.push(row);
  }
  return { headers, rows, errors };
}
