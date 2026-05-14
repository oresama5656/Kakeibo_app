# Technical Report: Kakeibo Cloud Sync Architecture & Debugging Log
**Status**: v7.0 (Audit-Logged Sync) Implemented
**Date**: 2026-05-13

## 1. System Overview
- **Frontend**: Vanilla JS (ES Modules), Local-first (localStorage)
- **Backend**: Cloudflare Workers (Auth, Token management via KV)
- **Database**: Google Sheets (Transactions, Categories, Accounts, Shortcuts, Settings)
- **Real-time**: WebSocket via Cloudflare Durable Objects (Sync notification only)

## 2. Core Issue: Initial Sync Collision
### Symptoms
When a user logs in from a fresh environment (e.g., Incognito), the local state starts with "Default Categories/Accounts". During the first sync, these defaults were being merged with existing cloud data, resulting in duplicated or polluted data.

### Evolution of Fixes
- **v1.0 - v4.0**: Simple `mergeData` (Local + Cloud). Caused "Default Data Injection".
- **v5.0**: Introduced `effectivePriority`. Forced `cloud` priority if local was empty.
- **v6.0**: Replaced `mergeData` with a full "Restore" (Replace) logic if `isLocalFresh`. Switched to `batchUpdate` for speed.
- **v6.1**: Tightened "Fresh Start" detection (checked `localStorage` + `transactions.length`). Added `cloud.categories.length` to detection to handle cases with 0 transactions.
- **v7.0 (Current)**: Added **Cloud Logging**. Every sync logs its decision and counts to a `logs` sheet in the Google Spreadsheet.

## 3. Critical Failure Analysis: Data Loss Risk
### The Problem
Earlier versions used a `clearRows` -> `writeRows` pattern. If the write failed (due to Quota or Network), the sheet remained empty.
### The Fix (v6.0+)
Switched to a **Non-Destructive Update** followed by a **Batch Clear** of trailing rows only if necessary. In v7.0, it uses `batchClear` followed by `batchUpdateValues` in two sequential calls.
*Note: A truly atomic update would require `spreadsheets.batchUpdate` with cell-level data, which is more complex but safer.*

## 4. Current Sync Logic (v7.0)
Located in `js/store/SyncManager.js`:
1. **Read**: Fetch all 4 sheets from Google.
2. **Detect Mode**: 
   - If `localStorage` is empty OR `transactions === 0` AND cloud HAS data -> **Restore Mode**.
   - Otherwise -> **Merge Mode**.
3. **Log**: Write start event to `logs` sheet.
4. **Transform**: Compute `nextTx`, `nextCat`, etc. (Restore mode uses `[...cloudData]`).
5. **Safety Guard**: If `cloud` had data but `next` is empty -> **ABORT**.
6. **Write**: 
   - `batchClear` ranges.
   - `batchUpdateValues` with new data.
7. **Log**: Write success event to `logs` sheet.

## 5. Known Gotchas & Next Steps
- **Race Condition**: Multiple devices syncing at once could cause lost updates (Last Write Wins).
- **Quota**: Google Sheets API has a 60/min quota. Aggressive sync (e.g. on every keystroke) will fail. Current implementation uses a debounced `save()` and periodic `visibilitychange` pull.
- **User's Current Mess**: The user has duplicate categories (Defaults + Cloud). Manual deletion in the Google Sheet is the cleanest fix now that the "Restore" logic is fixed.

## 6. How to Debug
Check the `logs` sheet in the user's spreadsheet. It contains:
- `timestamp`: When the sync happened.
- `message`: `mode`, `cloudCount`, `finalCount`, and any `ERROR` messages.
