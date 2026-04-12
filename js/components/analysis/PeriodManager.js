/**
 * 分析画面の期間計算ロジック
 */

import { formatLocalDate } from '../../store/BaseStore.js';

export function getPeriodDates(state) {
  const ref = new Date(state.referenceDate);
  let start, end;
  switch (state.periodType) {
    case 'week': 
      start = new Date(ref); 
      start.setDate(ref.getDate() - ref.getDay()); 
      start.setHours(0,0,0,0); 
      end = new Date(start); 
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      break;
    case 'month': 
      start = new Date(ref.getFullYear(), ref.getMonth(), 1); 
      end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0); 
      end.setHours(23,59,59,999);
      break;
    case 'year': 
      start = new Date(ref.getFullYear(), 0, 1); 
      end = new Date(ref.getFullYear(), 11, 31); 
      end.setHours(23,59,59,999);
      break;
    case 'custom': 
      start = state.customStart ? new Date(state.customStart + 'T00:00:00') : new Date(ref.getFullYear(), ref.getMonth(), 1); 
      end = state.customEnd ? new Date(state.customEnd + 'T23:59:59') : new Date(); 
      break;
    default: 
      start = new Date(ref.getFullYear(), ref.getMonth(), 1); 
      end = new Date();
  }
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}
