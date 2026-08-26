// 视图渲染（M1 起拆分）：共享工具 + 列表/日历/详情渲染
// 说明：此文件先于 main.js 加载，函数供 main.js 调用

/* ---------- 工具 ---------- */
function esc(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s ?? '').replace(/[&<>"']/g, (c) => map[c]);
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}月${d}日` : `${y}年${m}月${d}日`;
}

function fmtMonthTitle(year, month) { // month: 0-based
  return `${year}年${month + 1}月`;
}

/* ---------- 记录卡片 ---------- */
function entryCardHTML(e) {
  return `
    <li class="entry-card" data-id="${esc(e.id)}">
      <div class="entry-meta">
        <span class="entry-date">${esc(fmtDisplayDate(e.date))}</span>
        ${e.project ? `<span class="entry-project">${esc(e.project)}</span>` : ''}
      </div>
      <p class="entry-summary">${esc(e.summary)}</p>
    </li>`;
}

function sortByDateDesc(list) {
  return [...list].sort((a, b) =>
    b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  );
}

function renderEntryList(listEl, list) {
  listEl.innerHTML = sortByDateDesc(list).map(entryCardHTML).join('');
}

/* ---------- 日历 ---------- */
function renderCalendarGrid(gridEl, year, month, counts, selectedDate) {
  const heads = ['一', '二', '三', '四', '五', '六', '日'];
  const cells = heads.map((h) => `<div class="cal-cell cal-head">${h}</div>`);

  const startDow = (new Date(year, month, 1).getDay() + 6) % 7; // 周一为 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startDow; i++) cells.push('<div class="cal-cell cal-blank"></div>');

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = counts[ds] || 0;
    const cls = ['cal-cell', 'cal-day'];
    if (ds === selectedDate) cls.push('selected');
    if (ds === todayStr()) cls.push('today');
    const badge = count > 0
      ? `<span class="cal-badge">${count > 99 ? '99+' : count}</span>`
      : '';
    cells.push(`<div class="${cls.join(' ')}" data-date="${ds}">${d}${badge}</div>`);
  }

  gridEl.innerHTML = cells.join('');
}

/* ---------- 详情 ---------- */
function renderDetail(container, e) {
  const fields = [
    ['1. 一句话概括这件事', e.summary],
    ['2. 这件事在项目里是哪一环，解决了什么问题？', e.context],
    ['3. 实践时的卡点是什么？又对此给出了什么样的思路或解决方案？', e.blocker],
    ['4. 最后交付了什么，或者说带来了哪些变化？', e.outcome],
  ];
  container.innerHTML = `
    <div class="detail-card">
      <div class="entry-meta">
        <span class="entry-date">${esc(fmtDisplayDate(e.date))}</span>
        ${e.project ? `<span class="entry-project">${esc(e.project)}</span>` : ''}
      </div>
      ${fields
        .filter(([, a]) => a)
        .map(([q, a]) => `
          <div class="detail-item">
            <p class="detail-q">${q}</p>
            <p class="detail-a">${esc(a)}</p>
          </div>`)
        .join('')}
    </div>`;
}
