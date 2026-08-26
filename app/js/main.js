// 入口与状态管理（M0：录入 + 持久化 + 简易最近列表；日历/搜索/编辑删除在 M1）
const listView = document.getElementById('list-view');
const formView = document.getElementById('form-view');
const formTitle = document.getElementById('form-title');
const entryList = document.getElementById('entry-list');
const emptyHint = document.getElementById('empty-hint');
const form = document.getElementById('entry-form');
const fDate = document.getElementById('f-date');
const fProject = document.getElementById('f-project');
const fSummary = document.getElementById('f-summary');
const fContext = document.getElementById('f-context');
const fBlocker = document.getElementById('f-blocker');
const fOutcome = document.getElementById('f-outcome');
const projectList = document.getElementById('project-list');
const toastEl = document.getElementById('toast');

let entries = [];

/* ---------- 工具 ---------- */
function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function esc(s) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s ?? '').replace(/[&<>"']/g, (c) => map[c]);
}

function fmtDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return y === new Date().getFullYear() ? `${m}月${d}日` : `${y}年${m}月${d}日`;
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2000);
}

/* ---------- 视图 ---------- */
function showList() {
  formView.hidden = true;
  listView.hidden = false;
}

function showForm() {
  form.reset();
  fDate.value = todayStr();
  formTitle.textContent = '新增记录';
  listView.hidden = true;
  formView.hidden = false;
  fSummary.focus();
}

function renderList() {
  const sorted = [...entries].sort((a, b) =>
    b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  );
  entryList.innerHTML = sorted.map((e) => `
    <li class="entry-card">
      <div class="entry-meta">
        <span class="entry-date">${esc(fmtDisplayDate(e.date))}</span>
        ${e.project ? `<span class="entry-project">${esc(e.project)}</span>` : ''}
      </div>
      <p class="entry-summary">${esc(e.summary)}</p>
    </li>`).join('');
  emptyHint.hidden = entries.length > 0;
}

function renderProjectOptions() {
  const names = [...new Set(entries.map((e) => e.project).filter(Boolean))].sort();
  projectList.innerHTML = names.map((n) => `<option value="${esc(n)}"></option>`).join('');
}

async function loadEntries() {
  entries = await Store.getAll();
  renderList();
  renderProjectOptions();
}

/* ---------- 事件 ---------- */
document.getElementById('btn-new').addEventListener('click', showForm);
document.getElementById('btn-cancel').addEventListener('click', showList);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!fSummary.value.trim()) {
    toast('请填写第 1 问：一句话概括');
    fSummary.focus();
    return;
  }
  const now = new Date().toISOString();
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
  showList();
  await loadEntries();
});

/* ---------- 启动 ---------- */
(async function init() {
  await loadEntries();
  showList();
})();
