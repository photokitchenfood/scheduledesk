#!/usr/bin/env node
/**
 * sync-trello.js
 *
 * Pulls the live Photokitchen "Town Hall" board from Trello and writes
 * data/townhall.json in the exact shape Schedule Desk's dashboard expects
 * (see the MOCK object in scheduler_dashboard.html).
 *
 * Whitelist approach: only the lists below are ever read. Regie, Lins,
 * Gilbert, and Birthdays are never touched, by construction — they're
 * simply not in this list.
 *
 * Requires two GitHub Actions secrets:
 *   TRELLO_KEY   — Trello API key   (trello.com/app-key)
 *   TRELLO_TOKEN — Trello API token (generated from the same page)
 *
 * Run locally for testing:
 *   TRELLO_KEY=xxx TRELLO_TOKEN=yyy node sync-trello.js
 */

const fs = require('fs');
const path = require('path');

const KEY = process.env.TRELLO_KEY;
const TOKEN = process.env.TRELLO_TOKEN;
if (!KEY || !TOKEN) {
  console.error('Missing TRELLO_KEY or TRELLO_TOKEN environment variables.');
  process.exit(1);
}

// Board: "1 • Town Hall"
const LISTS = {
  meeting: [
    '5d7876b46c30dd7128b718c6', // Meetings and Team Activities
  ],
  shoot: [
    '677b6fbef2258fb159162fcf', // Shoots This Week
    '677b6fd773f115c4f9360744', // Shoots Next Week
    '677b6fdb3332c0d195f45c69', // Shoots Later This Month
    '58943a7a6f61b6858b3d643b', // Shoots Next Months
  ],
  leave: [
    '5a266e85044c2a7afd89cde7', // Leaves and Offset
  ],
  holiday: [
    '5f3b5accb75c52146b2c1654', // Holidays
  ],
};

function toDateStr(dueIso) {
  if (!dueIso) return null;
  return dueIso.slice(0, 10); // Trello 'due' is ISO 8601, e.g. 2026-08-21T00:00:00.000Z
}

function extractTime(name) {
  const m = name.match(/@\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const isPM = /pm/i.test(m[3]);
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

function extractLeavePeople(name) {
  // Card names look like "Aug 14: Chin on Leave (Check-up)" or
  // "Aug 14: Mye & Ikay on Leave (2PM onwards)". Strip the date prefix,
  // isolate the text before " on Leave"/" on Offset", split on & , and.
  const afterColon = name.includes(':') ? name.split(':').slice(1).join(':').trim() : name;
  const m = afterColon.match(/^(.*?)\s+on\s+(Leave|Offset)/i);
  if (!m) return [];
  return m[1]
    .split(/&|,|\band\b/i)
    .map(s => s.trim())
    .filter(Boolean);
}

async function fetchList(listId) {
  const url = `https://api.trello.com/1/lists/${listId}/cards?key=${KEY}&token=${TOKEN}&filter=open&fields=name,due`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Trello API error for list ${listId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const cards = [];
  const leaves = [];

  for (const [kind, listIds] of Object.entries(LISTS)) {
    for (const listId of listIds) {
      const trelloCards = await fetchList(listId);
      for (const c of trelloCards) {
        const date = toDateStr(c.due);
        if (!date) continue; // skip cards with no due date, can't place them on the calendar

        if (kind === 'leave') {
          const people = extractLeavePeople(c.name);
          people.forEach(person => leaves.push({ date, person }));
          continue;
        }

        const entry = { date, title: c.name, kind };
        if (kind === 'shoot' && /tentative/i.test(c.name)) entry.tentative = true;
        if (kind === 'meeting') {
          const time = extractTime(c.name);
          if (time) entry.time = time;
        }
        cards.push(entry);
      }
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    cards,
    leaves,
  };

  const outPath = path.join(__dirname, 'data', 'townhall.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${cards.length} cards and ${leaves.length} leave entries to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
