// IndexedDB 封装：数据库 internship_recorder / 对象仓库 entries
const DB_NAME = 'internship_recorder';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const os = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        os.createIndex('date', 'date');
        os.createIndex('project', 'project');
        os.createIndex('updated_at', 'updated_at');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 在单个事务里执行 fn(objectStore)，事务完成后返回该请求的结果
function run(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE_NAME, mode);
        const os = t.objectStore(STORE_NAME);
        let result;
        const req = fn(os);
        if (req) req.onsuccess = () => { result = req.result; };
        t.oncomplete = () => resolve(result);
        t.onerror = () => reject(t.error);
      })
  );
}

const Store = {
  add(entry) { return run('readwrite', (os) => os.add(entry)); },
  getAll() { return run('readonly', (os) => os.getAll()); },
  put(entry) { return run('readwrite', (os) => os.put(entry)); },
  remove(id) { return run('readwrite', (os) => os.delete(id)); },
};
