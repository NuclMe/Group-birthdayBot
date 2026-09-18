import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { parseExcel } from '../src/excel.js';

test('parses and normalizes birthday rows', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Birthdays');
  sheet.addRow(['id', 'name', 'birthday', 'username']);
  sheet.addRow(['one', 'Иван', '14.03', '@ivan']);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  assert.deepEqual(await parseExcel(buffer), [
    {
      id: 'one',
      name: 'Иван',
      birthdayDay: 14,
      birthdayMonth: 3,
      username: 'ivan',
    },
  ]);
});

test('rejects duplicate ids', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Birthdays');
  sheet.addRow(['id', 'name', 'birthday']);
  sheet.addRow(['one', 'Иван', '14.03']);
  sheet.addRow(['one', 'Ольга', '15.03']);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await assert.rejects(() => parseExcel(buffer), /дублирующийся id/);
});
