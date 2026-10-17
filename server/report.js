import ExcelJS from 'exceljs';

const COLOR_HEX = {
  blue: 'FF3E83F8', green: 'FF30A46C', orange: 'FFF18A2B', pink: 'FFE5487F', purple: 'FF8E4EC6', gray: 'FF8B8D98',
  red: 'FFE5484D', teal: 'FF12A594', yellow: 'FFD4A106', indigo: 'FF5B5BD6',
};
const catName = (t) => (t.category_name ? `${t.category_emoji ? `${t.category_emoji} ` : ''}${t.category_name}` : 'Kateqoriyasız');
const PRIORITY = ['', 'Aşağı', 'Orta', 'Yüksək'];
const PRIORITY_HEX = ['', 'FF8B8D98', 'FFD97706', 'FFE5484D'];
const subtaskText = (t) => {
  let list = [];
  try { list = JSON.parse(t.subtasks || '[]'); } catch { /* ignore */ }
  return list.length ? `${list.filter((x) => x.done).length}/${list.length}` : '';
};
const WEEKDAYS = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];

// "YYYY-MM-DD" → Date (UTC midnight), so Excel shows the plain calendar date
const keyToDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
// ISO timestamp shifted to the viewer's local time, kept as a "UTC" Date for Excel
const localDate = (iso, tzOffsetMin) => new Date(new Date(iso).getTime() - tzOffsetMin * 60000);
const localKey = (iso, tzOffsetMin) => localDate(iso, tzOffsetMin).toISOString().slice(0, 10);

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5BD6' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };
const THIN = { style: 'thin', color: { argb: 'FFE4E7F0' } };

function styleHeader(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle' };
  });
  row.height = 22;
}

function borderAll(sheet) {
  sheet.eachRow((row) => row.eachCell((cell) => {
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  }));
}

/**
 * Builds the workbook.
 * @param {object} opts
 * @param {Array} opts.tasks   rows from the tasks table (already filtered to the period)
 * @param {string} opts.title  report title
 * @param {string} opts.period human-readable period text
 * @param {object} opts.user
 * @param {number} opts.tz     client's getTimezoneOffset() in minutes
 * @param {string} opts.today  client's local "YYYY-MM-DD"
 */
export async function buildReport({ tasks, title, period, user, tz, today }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Task Panel';
  wb.created = new Date();

  const done = tasks.filter((t) => t.done);
  const pending = tasks.filter((t) => !t.done);
  const overdue = pending.filter((t) => t.date < today);
  const rate = tasks.length ? done.length / tasks.length : 0;

  // ---------- Sheet 1: summary ----------
  const s = wb.addWorksheet('Xülasə', { views: [{ showGridLines: false }] });
  s.columns = [{ width: 30 }, { width: 22 }, { width: 18 }, { width: 18 }];

  s.mergeCells('A1:D1');
  s.getCell('A1').value = title;
  s.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF1C2033' } };
  s.getRow(1).height = 30;
  s.mergeCells('A2:D2');
  s.getCell('A2').value = `${period}  ·  ${user.name || ''} (${user.email || ''})`;
  s.getCell('A2').font = { color: { argb: 'FF6B7190' } };

  const kpis = [
    ['Ümumi tapşırıq', tasks.length],
    ['Tamamlanan', done.length],
    ['Gözləyən', pending.length],
    ['Gecikmiş (keçmiş tarixli, bitməmiş)', overdue.length],
    ['Tamamlanma faizi', rate],
  ];
  s.addRow([]);
  styleHeader(s.addRow(['Göstərici', 'Dəyər']));
  for (const [k, v] of kpis) {
    const r = s.addRow([k, v]);
    if (k === 'Tamamlanma faizi') r.getCell(2).numFmt = '0%';
    r.getCell(2).font = { bold: true };
    r.getCell(2).alignment = { horizontal: 'right' };
  }

  // per-day breakdown
  const byDay = new Map();
  for (const t of tasks) {
    const e = byDay.get(t.date) || { total: 0, done: 0 };
    e.total += 1;
    if (t.done) e.done += 1;
    byDay.set(t.date, e);
  }
  s.addRow([]);
  styleHeader(s.addRow(['Gün', 'Tarix', 'Tapşırıq', 'Tamamlanan']));
  for (const key of [...byDay.keys()].sort()) {
    const d = keyToDate(key);
    const e = byDay.get(key);
    const r = s.addRow([WEEKDAYS[d.getUTCDay()], d, e.total, e.done]);
    r.getCell(2).numFmt = 'dd.mm.yyyy';
  }

  // per-category breakdown
  const byColor = new Map();
  for (const t of tasks) {
    const e = byColor.get(catName(t)) || { total: 0, done: 0, color: t.category_color };
    e.total += 1;
    if (t.done) e.done += 1;
    byColor.set(catName(t), e);
  }
  s.addRow([]);
  styleHeader(s.addRow(['Kateqoriya', 'Tapşırıq', 'Tamamlanan', 'Faiz']));
  for (const [name, e] of byColor) {
    const r = s.addRow([name, e.total, e.done, e.total ? e.done / e.total : 0]);
    r.getCell(1).font = { bold: true, color: { argb: COLOR_HEX[e.color] || 'FF1C2033' } };
    r.getCell(4).numFmt = '0%';
  }

  // ---------- Sheet 2: all tasks ----------
  const sheetTasks = (name, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
      { header: '№', key: 'n', width: 6 },
      { header: 'Tapşırıq', key: 'title', width: 42 },
      { header: 'Qeyd', key: 'note', width: 40 },
      { header: 'Planlanan gün', key: 'weekday', width: 18 },
      { header: 'Planlanan tarix', key: 'date', width: 16 },
      { header: 'Vaxt', key: 'time', width: 9 },
      { header: 'Prioritet', key: 'priority', width: 11 },
      { header: 'Alt-tapşırıq', key: 'subtasks', width: 12 },
      { header: 'Təkrar', key: 'recur', width: 9 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Tamamlanma vaxtı', key: 'doneAt', width: 20 },
      { header: 'Kateqoriya', key: 'color', width: 14 },
    ];
    styleHeader(ws.getRow(1));
    rows.forEach((t, i) => {
      const d = keyToDate(t.date);
      const status = t.done ? 'Tamamlanıb' : t.date < today ? 'Gecikib' : 'Gözləyir';
      const r = ws.addRow({
        n: i + 1,
        title: t.title,
        note: t.note || '',
        weekday: WEEKDAYS[d.getUTCDay()],
        date: d,
        time: t.time || '',
        priority: PRIORITY[t.priority] || '',
        subtasks: subtaskText(t),
        recur: t.recur_id ? '🔁' : '',
        status,
        doneAt: t.done_at ? localDate(t.done_at, tz) : null,
        color: catName(t),
      });
      r.getCell('date').numFmt = 'dd.mm.yyyy';
      r.getCell('doneAt').numFmt = 'dd.mm.yyyy hh:mm';
      r.getCell('note').alignment = { wrapText: true, vertical: 'top' };
      r.getCell('title').alignment = { wrapText: true, vertical: 'top' };
      const statusColor = t.done ? 'FF30A46C' : t.date < today ? 'FFE5484D' : 'FFF18A2B';
      r.getCell('status').font = { bold: true, color: { argb: statusColor } };
      if (t.priority) r.getCell('priority').font = { bold: true, color: { argb: PRIORITY_HEX[t.priority] } };
      r.getCell('color').font = { color: { argb: COLOR_HEX[t.category_color] || 'FF1C2033' } };
    });
    ws.autoFilter = { from: 'A1', to: 'L1' };
    borderAll(ws);
    return ws;
  };

  sheetTasks('Bütün tapşırıqlar', tasks);
  sheetTasks('Tamamlananlar', [...done].sort((a, b) => (b.done_at || '').localeCompare(a.done_at || '')));
  sheetTasks('Gözləyənlər', pending);

  // ---------- Sheet: monthly (useful for all-time) ----------
  if (done.length) {
    const byMonth = new Map();
    for (const t of done) {
      const m = localKey(t.done_at || `${t.date}T12:00:00Z`, tz).slice(0, 7);
      byMonth.set(m, (byMonth.get(m) || 0) + 1);
    }
    const ws = wb.addWorksheet('Aylıq');
    ws.columns = [{ header: 'Ay', key: 'm', width: 14 }, { header: 'Tamamlanan', key: 'c', width: 14 }];
    styleHeader(ws.getRow(1));
    for (const m of [...byMonth.keys()].sort()) ws.addRow({ m, c: byMonth.get(m) });
    borderAll(ws);
  }

  return wb.xlsx.writeBuffer();
}
