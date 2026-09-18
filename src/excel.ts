import ExcelJS from 'exceljs';
import type { Birthday } from './types.js';

const requiredColumns = ['id', 'name', 'birthday'];

function cellText(value: ExcelJS.CellValue): string {
  if (value instanceof Date)
    return `${String(value.getDate()).padStart(2, '0')}.${String(value.getMonth() + 1).padStart(2, '0')}`;
  if (typeof value === 'object' && value !== null && 'text' in value)
    return String(value.text);
  return String(value ?? '').trim();
}

function parseBirthday(
  value: ExcelJS.CellValue,
  rowNumber: number,
): { day: number; month: number } {
  const text = cellText(value);
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(text);
  if (!match)
    throw new Error(
      `Строка ${rowNumber}: birthday должна быть в формате DD.MM`,
    );
  const day = Number(match[1]);
  const month = Number(match[2]);
  const date = new Date(Date.UTC(2024, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Строка ${rowNumber}: некорректная дата ${text}`);
  }
  return { day, month };
}

export async function parseExcel(buffer: Buffer): Promise<Birthday[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Excel-файл не содержит листов');

  const headers = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell((cell, column) =>
      headers.set(cellText(cell.value).toLowerCase(), column),
    );
  for (const column of requiredColumns) {
    if (!headers.has(column))
      throw new Error(`Отсутствует обязательная колонка: ${column}`);
  }

  const result: Birthday[] = [];
  const ids = new Set<string>();
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;
    const id = cellText(row.getCell(headers.get('id')!).value);
    const name = cellText(row.getCell(headers.get('name')!).value);
    if (!id && !name) continue;
    if (!id || !name)
      throw new Error(`Строка ${rowNumber}: id и name обязательны`);
    if (ids.has(id))
      throw new Error(`Строка ${rowNumber}: дублирующийся id ${id}`);
    ids.add(id);
    const birthday = parseBirthday(
      row.getCell(headers.get('birthday')!).value,
      rowNumber,
    );
    const usernameColumn = headers.get('username');
    const username = usernameColumn
      ? cellText(row.getCell(usernameColumn).value).replace(/^@/, '')
      : undefined;
    result.push({
      id,
      name,
      birthdayDay: birthday.day,
      birthdayMonth: birthday.month,
      ...(username ? { username } : {}),
    });
  }
  return result;
}
