import assert from 'node:assert/strict';
import test from 'node:test';
import { birthdayMessage, monthlyMessage } from '../src/messages.js';
import type { Birthday } from '../src/types.js';

const record: Birthday = {
  id: 'one',
  name: 'Иван Иванов',
  birthdayDay: 14,
  birthdayMonth: 3,
  username: 'ivan',
};

test('monthly message uses username when available', () => {
  assert.match(monthlyMessage([record], 3), /14 марта — @ivan/);
});

test('birthday message uses name without username', () => {
  assert.match(
    birthdayMessage({ ...record, username: undefined }),
    /Иван Иванов/,
  );
  assert.doesNotMatch(
    birthdayMessage({ ...record, username: undefined }),
    /undefined/,
  );
});
