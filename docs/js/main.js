// 状态与事件（M1：日历 / 列表 / 详情 / 编辑删除）
let entries = [];

const state = {
  view: 'list',            // 当前视图：list | calendar | detail | form
  returnTo: 'list',        // 从详情返回时回到哪个视图
  formFrom: 'list',        // 打开表单前所在的视图
  listQuery: '',
  listProject: '',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(), // 0-based
  selectedDate: todayStr(),
  detailId: null,
  editingId: null,
};

/* ---------- 元素 ---------- */
const views = {
  list: document.getElementById('list-view'),
  calendar: document.getElementById('calendar-view'),
  detail: document.getElementById('detail-view'),
  form: document.getElementById('form-view'),
};
const tabList = document.getElementById('tab-list');
const tabCalendar = document.getElementById('tab-calendar');
const searchInput = document.getElementById('search-input');
const projectFilter = document.getElementById('project-filter');
const entryList = document.getElementById('entry-list');
const listEmpty = document.getElementById('list-empty');
const listNoResult = document.getElementById('list-no-result');
const calTitle = document.getElementById('cal-title');
const calGrid = document.getElementById('cal-grid');
const dayTitle = document.getElementById('day-title');
const dayEntries = document.getElementById('day-entries');
const dayEmpty = document.getElementById('day-empty');
const detailContent = document.getElementById('detail-content');
const form = document.getElementById('entry-form');
const formTitle = document.getElementById('form-title');
const fDate = document.getElementById('f-date');
const fProject = document.getElementById('f-project');
const fSummary = document.getElementById('f-summary');
const fContext = document.getElementById('f-context');
const fBlocker = document.getElementById('f-blocker');
const fOutcome = document.getElementById('f-outcome');
const projectList = document.getElementById('project-list');
const toastEl = document.getElementById('toast');

/* ---------- 工具 ---------- */
function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

let toastTimer;
function toast(msg, duration = 2000) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, duration);
}

function findEntry(id) {
  return entries.find((e) => e.id === id);
}

function dateCounts() {
  const counts = {};
  entries.forEach((e) => { counts[e.date] = (counts[e.date] || 0) + 1; });
  return counts;
}

/* ---------- 视图切换 ---------- */
function switchView(view) {
  state.view = view;
  for (const [key, el] of Object.entries(views)) el.hidden = key !== view;
  tabList.classList.toggle('active', view === 'list');
  tabCalendar.classList.toggle('active', view === 'calendar');
}

/* ---------- 列表 ---------- */
function filteredEntries() {
  const q = state.listQuery.trim().toLowerCase();
  return entries.filter((e) => {
    if (state.listProject && e.project !== state.listProject) return false;
    if (!q) return true;
    return [e.summary, e.context, e.blocker, e.outcome, e.project]
      .some((v) => (v || '').toLowerCase().includes(q));
  });
}

function renderList() {
  const list = filteredEntries();
  renderEntryList(entryList, list);
  listEmpty.hidden = entries.length !== 0;
  listNoResult.hidden = !(entries.length > 0 && list.length === 0);
}

function renderProjectOptions() {
  const names = [...new Set(entries.map((e) => e.project).filter(Boolean))].sort();
  // 表单自动补全
  projectList.innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join('');
  // 列表筛选下拉
  const cur = projectFilter.value;
  projectFilter.innerHTML =
    '<option value="">全部项目</option>' +
    names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  projectFilter.value = names.includes(cur) ? cur : '';
  state.listProject = projectFilter.value;
}

/* ---------- 日历 ---------- */
function renderCalendar() {
  calTitle.textContent = fmtMonthTitle(state.calYear, state.calMonth);
  renderCalendarGrid(calGrid, state.calYear, state.calMonth, dateCounts(), state.selectedDate);
  renderDayPanel();
}

function renderDayPanel() {
  const ds = state.selectedDate;
  const list = entries
    .filter((e) => e.date === ds)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const has = list.length > 0;
  dayTitle.textContent = has ? `${fmtDisplayDate(ds)} · ${list.length} 条记录` : fmtDisplayDate(ds);
  renderEntryList(dayEntries, list);
  dayEntries.hidden = !has;
  dayEmpty.hidden = has;
}

function selectDay(ds) {
  state.selectedDate = ds;
  renderCalendar();
}

function shiftMonth(delta) {
  const d = new Date(state.calYear, state.calMonth + delta, 1);
  state.calYear = d.getFullYear();
  state.calMonth = d.getMonth();
  renderCalendar();
}

/* ---------- 详情 ---------- */
function openDetail(id, returnTo) {
  const e = findEntry(id);
  if (!e) {
    toast('记录不存在');
    return;
  }
  state.detailId = id;
  state.returnTo = returnTo;
  renderDetail(detailContent, e);
  switchView('detail');
}

/* ---------- 表单 ---------- */
function showForm(entry, date) {
  state.formFrom = state.view;
  state.editingId = entry ? entry.id : null;
  form.reset();
  formTitle.textContent = entry ? '编辑记录' : '新增记录';
  fDate.value = entry ? entry.date : (date || todayStr());
  if (entry) {
    fProject.value = entry.project || '';
    fSummary.value = entry.summary || '';
    fContext.value = entry.context || '';
    fBlocker.value = entry.blocker || '';
    fOutcome.value = entry.outcome || '';
  }
  switchView('form');
  fSummary.focus();
}

/* ---------- 事件 ---------- */
tabList.addEventListener('click', () => { switchView('list'); renderList(); });
tabCalendar.addEventListener('click', () => { switchView('calendar'); renderCalendar(); });

document.getElementById('btn-new').addEventListener('click', () => showForm(null));
document.getElementById('btn-backfill').addEventListener('click', () => showForm(null, state.selectedDate));
document.getElementById('btn-cancel').addEventListener('click', () => {
  const back = state.formFrom;
  switchView(back);
  if (back === 'calendar') renderCalendar(); else renderList();
});

document.getElementById('btn-back').addEventListener('click', () => {
  const back = state.returnTo;
  switchView(back);
  if (back === 'calendar') renderCalendar(); else renderList();
});

document.getElementById('btn-edit').addEventListener('click', () => {
  const entry = findEntry(state.detailId);
  if (entry) showForm(entry);
});

document.getElementById('btn-delete').addEventListener('click', async () => {
  const e = findEntry(state.detailId);
  if (!e) return;
  const brief = e.summary.length > 30 ? e.summary.slice(0, 30) + '…' : e.summary;
  if (!confirm(`确定删除「${brief}」吗？删除后不可恢复。`)) return;
  await Store.remove(e.id);
  await loadEntries();
  toast('已删除');
  const back = state.returnTo;
  switchView(back);
  if (back === 'calendar') renderCalendar(); else renderList();
});

// 列表/日历日面板中的卡片点击（事件委托）
entryList.addEventListener('click', (e) => {
  const li = e.target.closest('.entry-card');
  if (li) openDetail(li.dataset.id, 'list');
});
dayEntries.addEventListener('click', (e) => {
  const li = e.target.closest('.entry-card');
  if (li) openDetail(li.dataset.id, 'calendar');
});
calGrid.addEventListener('click', (e) => {
  const cell = e.target.closest('.cal-day');
  if (cell) selectDay(cell.dataset.date);
});

document.getElementById('cal-prev').addEventListener('click', () => shiftMonth(-1));
document.getElementById('cal-next').addEventListener('click', () => shiftMonth(1));
document.getElementById('cal-today').addEventListener('click', () => {
  state.calYear = new Date().getFullYear();
  state.calMonth = new Date().getMonth();
  state.selectedDate = todayStr();
  renderCalendar();
});

searchInput.addEventListener('input', () => {
  state.listQuery = searchInput.value;
  renderList();
});
projectFilter.addEventListener('change', () => {
  state.listProject = projectFilter.value;
  renderList();
});

document.getElementById('btn-export').addEventListener('click', exportBackup);
document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // 允许下次再选同一文件
  if (file) importBackup(file);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!fSummary.value.trim()) {
    toast('请填写第 1 问：一句话概括');
    fSummary.focus();
    return;
  }
  const now = new Date().toISOString();
  if (state.editingId) {
    const old = findEntry(state.editingId);
    await Store.put({
      ...old,
      date: fDate.value,
      summary: fSummary.value.trim(),
      context: fContext.value.trim(),
      blocker: fBlocker.value.trim(),
      outcome: fOutcome.value.trim(),
      project: fProject.value.trim(),
      updated_at: now,
    });
    toast('已更新');
  } else {
    await Store.add({
      id: uid(),
      date: fDate.value,
      summary: fSummary.value.trim(),
      context: fContext.value.trim(),
      blocker: fBlocker.value.trim(),
      outcome: fOutcome.value.trim(),
      project: fProject.value.trim(),
      created_at: now,
      updated_at: now,
    });
    toast('已保存');
  }
  await loadEntries();
  if (state.editingId) {
    const id = state.editingId;
    state.editingId = null;
    openDetail(id, state.returnTo);
  } else {
    switchView('list');
    renderList();
  }
});

/* ---------- 备份与导入 ---------- */
const BACKUP_KEY = 'last_backup_at';

function lastBackupISO() {
  return localStorage.getItem(BACKUP_KEY);
}

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function renderBackupStatus() {
  const el = document.getElementById('backup-status');
  const iso = lastBackupISO();
  if (!iso) {
    el.textContent = '从未导出备份';
    return;
  }
  const d = daysSince(iso);
  el.textContent = d <= 0 ? '上次备份：今天' : d === 1 ? '上次备份：昨天' : `上次备份：${d} 天前`;
}

function remindBackupIfDue() {
  if (entries.length === 0) return;
  const iso = lastBackupISO();
  if (!iso || daysSince(iso) >= 30) toast('已超过 30 天未导出备份，建议在列表底部备份一次', 4000);
}

function exportBackup() {
  const data = {
    format: 'internship-recorder-backup',
    version: 1,
    exported_at: new Date().toISOString(),
    entries,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${todayStr()}.json`;
  document.body.appendChild(a); // Firefox 需要元素在文档中
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  localStorage.setItem(BACKUP_KEY, new Date().toISOString());
  renderBackupStatus();
  toast(`已导出 backup-${todayStr()}.json`);
}

async function importBackup(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    toast('无法解析该文件');
    return;
  }
  if (data.format !== 'internship-recorder-backup' || !Array.isArray(data.entries)) {
    toast('不是有效的备份文件');
    return;
  }

  // 校验条目
  const valid = data.entries.filter(
    (e) => e && typeof e.id === 'string' && typeof e.date === 'string' && typeof e.summary === 'string'
  );
  const skipped = data.entries.length - valid.length;

  // 合并策略：按 id 合并，保留 updated_at 较新的一方（见设计文档 §4.3）
  const existing = new Map(entries.map((x) => [x.id, x]));
  let addCount = 0;
  let updateCount = 0;
  const toWrite = [];
  for (const item of valid) {
    const local = existing.get(item.id);
    if (!local) {
      addCount++;
      toWrite.push(item);
    } else if (new Date(item.updated_at || 0).getTime() > new Date(local.updated_at || 0).getTime()) {
      updateCount++;
      toWrite.push({ ...local, ...item, id: local.id });
    }
  }

  if (addCount + updateCount === 0) {
    toast(skipped > 0 ? `没有可导入的内容（跳过 ${skipped} 条无效记录）` : '没有可导入的新内容');
    return;
  }

  let msg = `将新增 ${addCount} 条`;
  if (updateCount) msg += `、更新 ${updateCount} 条`;
  if (skipped) msg += `，跳过 ${skipped} 条无效记录`;
  if (!confirm(`${msg}，确认导入？`)) return;

  for (const item of toWrite) await Store.put(item);
  await loadEntries();
  toast(`已导入：新增 ${addCount} 条${updateCount ? `、更新 ${updateCount} 条` : ''}`);
}

/* ---------- 数据加载 ---------- */
async function loadEntries() {
  entries = await Store.getAll();
  renderProjectOptions();
  renderList();
}

/* ---------- 启动 ---------- */
// 注册 service worker（仅 HTTPS / localhost 生效；本地 file:// 打开时静默失败）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

(async function init() {
  await loadEntries();
  switchView('list');
  renderBackupStatus();
  remindBackupIfDue();
})();
