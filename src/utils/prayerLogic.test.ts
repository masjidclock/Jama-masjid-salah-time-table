import test from 'node:test';
import assert from 'node:assert/strict';
import { toMin, fmt12, untilSeconds, getPrayerIndices, getWxEmoji, defaultConfig } from './prayerLogic';

test('toMin converts HH:mm correctly', () => {
  assert.equal(toMin("00:00"), 0);
  assert.equal(toMin("04:26"), 4 * 60 + 26);
  assert.equal(toMin("12:00"), 720);
  assert.equal(toMin("23:59"), 23 * 60 + 59);
});

test('fmt12 formats 24h to 12h accurately', () => {
  assert.deepEqual(fmt12("04:26"), { time: "04:26", period: "AM" });
  assert.deepEqual(fmt12("00:15"), { time: "12:15", period: "AM" });
  assert.deepEqual(fmt12("12:00"), { time: "12:00", period: "PM" });
  assert.deepEqual(fmt12("15:47"), { time: "03:47", period: "PM" });
  assert.deepEqual(fmt12("18:56"), { time: "06:56", period: "PM" });
});

test('untilSeconds wraps correctly across midnight', () => {
  // Current time: 10:00:00 (36000 sec)
  // Target: 11:37:00 (41820 sec)
  const diff = untilSeconds("11:37", 36000);
  assert.equal(diff, 41820 - 36000);

  // Target already passed today (e.g. Fajr 04:26 is 15960 sec, now is 36000 sec)
  const wrappedDiff = untilSeconds("04:26", 36000);
  assert.equal(wrappedDiff, 15960 - 36000 + 86400);
});

test('getPrayerIndices identifies current and next prayer', () => {
  const prayers = defaultConfig.prayers;
  // 10:00 AM (600 min) is after Fajr (04:26 = 266 min) and before Zuhar (11:37 = 697 min)
  const { currentIndex, nextIndex } = getPrayerIndices(prayers, 600);
  assert.equal(currentIndex, 0); // Fajr
  assert.equal(nextIndex, 1);    // Zuhar

  // 19:00 (1140 min) is after Isha (18:41 = 1121 min)
  const evening = getPrayerIndices(prayers, 1140);
  assert.equal(evening.currentIndex, 4); // Isha
  assert.equal(evening.nextIndex, 0);    // Fajr (next day)
});

test('getWxEmoji matches WMO weather codes', () => {
  assert.equal(getWxEmoji(0), "☀️");
  assert.equal(getWxEmoji(2), "⛅");
  assert.equal(getWxEmoji(61), "🌧️");
  assert.equal(getWxEmoji(95), "⛈️");
});
