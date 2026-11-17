/**
 * رابط تطبيق الويب من Google Apps Script
 * يمكنك وضعه هنا مباشرة قبل الرفع على GitHub Pages، أو إضافته من شاشة الإعدادات في الموقع
 */
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxaxb0SonRRpnaejkrrCm0wDc-YiRx0VUQx_6PBqb18hArYhRz7N4d1dOkbvuQdnT8C8Q/exec';

const STORAGE_KEYS = {
  GAS_URL: 'ohdaty_gas_url',
  DEMO_DATA: 'ohdaty_demo_data',
  THEME: 'ohdaty_theme'
};

// بيانات تجريبية افتراضية للمعاينة قبل الربط
const INITIAL_DEMO_DATA = {
  assets: [
    { id: 'AST-1', code: 'DEV-1001', name: 'لابتوب Dell Latitude 5430', category: 'حاسب محمول', serial: 'DL-883920', totalQty: 10, assignedQty: 3, remainingQty: 7, status: 'متاح', notes: 'مع شاحن أصلي' },
    { id: 'AST-2', code: 'DEV-1002', name: 'جوال iPhone 15 العمل', category: 'هاتف / تابلت', serial: 'AP-441029', totalQty: 5, assignedQty: 2, remainingQty: 3, status: 'متاح', notes: '' },
    { id: 'AST-3', code: 'DEV-1003', name: 'شاشة LG 27 بوصة', category: 'شاشة / ملحقات', serial: 'LG-99210', totalQty: 8, assignedQty: 8, remainingQty: 0, status: 'منفد', notes: '' }
  ],
  employees: [
    { id: 'EMP-1', empNumber: '101', name: 'أحمد محمد العتيبي', department: 'تقنية المعلومات', phone: '0501234567', email: 'ahmed@company.com' },
    { id: 'EMP-2', empNumber: '102', name: 'سارة خالد الدوسري', department: 'الموارد البشرية', phone: '0559876543', email: 'sara@company.com' }
  ],
  transactions: [
    { id: 'TX-1', txNumber: 'OP-00001', type: 'HANDOVER', assetId: 'AST-1', assetName: 'لابتوب Dell Latitude 5430', employeeId: 'EMP-1', employeeName: 'أحمد محمد العتيبي', qty: 1, returnedQty: 0, condition: 'جديد', date: '2026-11-10', notes: 'عهدة عمل', signMethod: 'NONE', signatureUrl: '', status: 'ACTIVE', relatedTxId: '' }
  ]
};

let state = {
  gasUrl: localStorage.getItem(STORAGE_KEYS.GAS_URL) || DEFAULT_GAS_URL,
  assets: [],
  employees: [],
  transactions: [],
  signMode: { ho: 'SCREEN', ret: 'SCREEN' },
  files: { ho: null, ret: null }
};

const canvases = {};

/* ================== التهيئة الأولية ================== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  initDates();
  initSignatureCanvases();
  initSignTabsAndFiles();
  bindForms();
  loadAllData();
});

function isLiveMode() {
  return Boolean(state.gasUrl && state.gasUrl.trim().startsWith('https://script.google.com/'));
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('btnThemeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEYS.THEME, next);
  });
}

function initDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('hoDate').value = today;
  document.getElementById('retDate').value = today;
}

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-item, .m-nav-item');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  document.getElementById('btnOpenSettings').addEventListener('click', () => openSettingsModal());
  document.getElementById('btnMobileSettings').addEventListener('click', () => openSettingsModal());
  document.getElementById('btnSync').addEventListener('click', () => loadAllData());

  document.getElementById('assetSearch').addEventListener('input', renderAssets);
  document.getElementById('empSearch').addEventListener('input', renderEmployees);
  document.getElementById('filterTxType').addEventListener('change', renderMovements);
  document.getElementById('filterTxAsset').addEventListener('change', renderMovements);
  document.getElementById('filterTxEmployee').addEventListener('change', renderMovements);
}

function switchView(viewName) {
  const titles = {
    dashboard: 'لوحة المعلومات والتقارير',
    assets: 'إدارة الأصناف والأرصدة',
    handover: 'تسليم عهدة لموظف',
    return: 'استرجاع عهدة / إخلاء طرف',
    employees: 'الموظفون والأفراد',
    movements: 'سجل حركة العهد والتقارير'
  };
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.getElementById('pageTitle').textContent = titles[viewName] || '';

  document.querySelectorAll('.nav-item, .m-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });

  if (viewName === 'handover') resizeCanvas('ho');
  if (viewName === 'return') resizeCanvas('ret');
}

/* ================== جلب وحفظ البيانات ================== */
async function loadAllData() {
  updateConnectionUI();
  if (!isLiveMode()) {
    const saved = localStorage.getItem(STORAGE_KEYS.DEMO_DATA);
    const data = saved ? JSON.parse(saved) : INITIAL_DEMO_DATA;
    if (!saved) localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify(data));
    state.assets = data.assets;
    state.employees = data.employees;
    state.transactions = data.transactions;
    renderAll();
    return;
  }

  setLoading(true, 'جاري تحميل البيانات من Google Sheets...');
  try {
    const res = await fetch(`${state.gasUrl}?action=getAll`, { redirect: 'follow' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'فشل قراءة البيانات');
    state.assets = data.assets || [];
    state.employees = data.employees || [];
    state.transactions = data.transactions || [];
    renderAll();
  } catch (err) {
    showToast('تعذر الاتصال بجوجل شيت: ' + err.message, true);
  } finally {
    setLoading(false);
  }
}

async function postToBackend(action, payloadData) {
  if (!isLiveMode()) {
    return handleDemoAction(action, payloadData);
  }
  const res = await fetch(state.gasUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data: payloadData })
  });
  const result = await res.json();
  if (!result.success) throw new Error(result.error || 'حدث خطأ أثناء الحفظ');
  return result;
}

function saveDemoData() {
  localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify({
    assets: state.assets,
    employees: state.employees,
    transactions: state.transactions
  }));
}

function handleDemoAction(action, data) {
  const now = new Date().toISOString();
  if (action === 'saveAsset') {
    if (data.id) {
      const idx = state.assets.findIndex(a => a.id === data.id);
      const ast = state.assets[idx];
      if (Number(data.totalQty) < Number(ast.assignedQty)) throw new Error('الكمية الإجمالية أقل من المسلمة');
      ast.name = data.name; ast.category = data.category; ast.code = data.code || ast.code;
      ast.serial = data.serial; ast.totalQty = Number(data.totalQty);
      ast.remainingQty = ast.totalQty - Number(ast.assignedQty);
      ast.status = ast.remainingQty > 0 ? 'متاح' : 'منفد'; ast.notes = data.notes;
    } else {
      const id = 'AST-' + Date.now();
      const qty = Number(data.totalQty);
      state.assets.push({
        id, code: data.code || 'DEV-' + Math.floor(1000 + Math.random() * 9000),
        name: data.name, category: data.category, serial: data.serial,
        totalQty: qty, assignedQty: 0, remainingQty: qty, status: 'متاح', notes: data.notes
      });
      state.transactions.push({
        id: 'TX-' + Date.now(), txNumber: 'OP-' + String(state.transactions.length + 1).padStart(5, '0'),
        type: 'IN_STOCK', assetId: id, assetName: data.name, employeeId: '', employeeName: 'المستودع الرئيسي',
        qty, returnedQty: 0, condition: 'جديد', date: now.slice(0, 10), notes: 'إضافة صنف جديد',
        signMethod: 'NONE', signatureUrl: '', status: 'COMPLETED', relatedTxId: ''
      });
    }
  } else if (action === 'addStock') {
    const ast = state.assets.find(a => a.id === data.assetId);
    const add = Number(data.qty);
    ast.totalQty = Number(ast.totalQty) + add;
    ast.remainingQty = Number(ast.remainingQty) + add;
    ast.status = 'متاح';
    state.transactions.push({
      id: 'TX-' + Date.now(), txNumber: 'OP-' + String(state.transactions.length + 1).padStart(5, '0'),
      type: 'IN_STOCK', assetId: ast.id, assetName: ast.name, employeeId: '', employeeName: 'تغذية المخزون',
      qty: add, returnedQty: 0, condition: 'سليم', date: now.slice(0, 10), notes: data.notes || 'زيادة رصيد',
      signMethod: 'NONE', signatureUrl: '', status: 'COMPLETED', relatedTxId: ''
    });
  } else if (action === 'saveEmployee') {
    if (data.id) {
      const emp = state.employees.find(e => e.id === data.id);
      Object.assign(emp, data);
    } else {
      state.employees.push({
        id: 'EMP-' + Date.now(), empNumber: data.empNumber || String(100 + state.employees.length + 1),
        name: data.name, department: data.department, phone: data.phone, email: data.email
      });
    }
  } else if (action === 'handover') {
    const ast = state.assets.find(a => a.id === data.assetId);
    const emp = state.employees.find(e => e.id === data.employeeId);
    const qty = Number(data.qty);
    if (Number(ast.remainingQty) < qty) throw new Error('الرصيد المتبقي غير كافٍ');
    ast.assignedQty = Number(ast.assignedQty) + qty;
    ast.remainingQty = Number(ast.remainingQty) - qty;
    ast.status = ast.remainingQty > 0 ? 'متاح' : 'منفد';
    state.transactions.push({
      id: 'TX-' + Date.now(), txNumber: 'OP-' + String(state.transactions.length + 1).padStart(5, '0'),
      type: 'HANDOVER', assetId: ast.id, assetName: ast.name, employeeId: emp.id, employeeName: emp.name,
      qty, returnedQty: 0, condition: data.condition, date: data.date, notes: data.notes,
      signMethod: data.signMethod, signatureUrl: data.fileBase64 || '', status: 'ACTIVE', relatedTxId: ''
    });
  } else if (action === 'returnAsset') {
    const orig = state.transactions.find(t => t.id === data.handoverTxId);
    const ast = state.assets.find(a => a.id === orig.assetId);
    const qty = Number(data.qty);
    const outstanding = Number(orig.qty) - Number(orig.returnedQty || 0);
    if (qty > outstanding) throw new Error('الكمية تتجاوز المسلمة للموظف');
    orig.returnedQty = Number(orig.returnedQty || 0) + qty;
    orig.status = orig.returnedQty >= Number(orig.qty) ? 'RETURNED' : 'ACTIVE';
    ast.assignedQty = Math.max(0, Number(ast.assignedQty) - qty);
    ast.remainingQty = Number(ast.remainingQty) + qty;
    ast.status = 'متاح';
    state.transactions.push({
      id: 'TX-' + Date.now(), txNumber: 'OP-' + String(state.transactions.length + 1).padStart(5, '0'),
      type: 'RETURN', assetId: ast.id, assetName: ast.name, employeeId: orig.employeeId, employeeName: orig.employeeName,
      qty, returnedQty: 0, condition: data.condition, date: data.date, notes: data.notes,
      signMethod: data.signMethod, signatureUrl: data.fileBase64 || '', status: 'COMPLETED', relatedTxId: orig.id
    });
  }
  saveDemoData();
  return { success: true, message: 'تم التنفيذ بنجاح (وضع المعاينة)' };
}

/* ================== عرض البيانات والتقارير ================== */
function renderAll() {
  renderDashboard();
  renderAssets();
  renderEmployees();
  populateSelects();
  renderMovements();
}

function renderDashboard() {
  const total = state.assets.reduce((s, a) => s + Number(a.totalQty || 0), 0);
  const remaining = state.assets.reduce((s, a) => s + Number(a.remainingQty || 0), 0);
  const assigned = state.assets.reduce((s, a) => s + Number(a.assignedQty || 0), 0);

  document.getElementById('kpiTotalStock').textContent = total;
  document.getElementById('kpiRemainingStock').textContent = remaining;
  document.getElementById('kpiAssignedStock').textContent = assigned;
  document.getElementById('kpiTotalTx').textContent = state.transactions.length;

  const barsEl = document.getElementById('dashboardBalances');
  barsEl.innerHTML = state.assets.length ? state.assets.slice(0, 6).map(a => {
    const pct = a.totalQty > 0 ? Math.round((a.remainingQty / a.totalQty) * 100) : 0;
    return `
      <div class="balance-item">
        <div class="balance-top">
          <span>${escapeHtml(a.name)}</span>
          <span>متبقي ${a.remainingQty} من ${a.totalQty}</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('') : '<p class="field-hint">لا توجد أصناف مسجلة بعد</p>';

  const recentEl = document.getElementById('dashboardRecentTx');
  const recent = [...state.transactions].reverse().slice(0, 5);
  recentEl.innerHTML = recent.length ? recent.map(tx => `
    <div class="recent-item">
      <div>
        <strong>${escapeHtml(tx.assetName)}</strong>
        <div style="color:var(--text-muted);font-size:12px">${escapeHtml(tx.employeeName)} • ${tx.date}</div>
      </div>
      ${getTxTypeBadge(tx.type)}
    </div>
  `).join('') : '<p class="field-hint">لا توجد حركات مسجلة</p>';
}

function renderAssets() {
  const q = document.getElementById('assetSearch').value.trim().toLowerCase();
  const tbody = document.getElementById('assetsTableBody');
  const filtered = state.assets.filter(a =>
    `${a.code} ${a.name} ${a.serial} ${a.category}`.toLowerCase().includes(q)
  );

  tbody.innerHTML = filtered.length ? filtered.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.code)}</strong></td>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.category)}</td>
      <td>${escapeHtml(a.serial || '-')}</td>
      <td><strong>${a.totalQty}</strong></td>
      <td>${a.assignedQty}</td>
      <td><strong style="color:var(--primary)">${a.remainingQty}</strong></td>
      <td><span class="badge ${a.remainingQty > 0 ? 'badge-success' : 'badge-danger'}">${a.remainingQty > 0 ? 'متاح' : 'منفد'}</span></td>
      <td>
        <button class="btn-sm btn-outline" onclick="quickAddStock('${a.id}')">+ رصيد</button>
        <button class="btn-sm btn-outline" onclick="openAssetModal('${a.id}')">تعديل</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="9" style="text-align:center">لا توجد أصناف مطابقة</td></tr>';
}

function renderEmployees() {
  const q = document.getElementById('empSearch').value.trim().toLowerCase();
  const grid = document.getElementById('employeesGrid');
  const filtered = state.employees.filter(e =>
    `${e.name} ${e.empNumber} ${e.department}`.toLowerCase().includes(q)
  );

  grid.innerHTML = filtered.length ? filtered.map(e => {
    const activeCount = state.transactions
      .filter(t => t.type === 'HANDOVER' && t.employeeId === e.id && t.status === 'ACTIVE')
      .reduce((s, t) => s + (Number(t.qty) - Number(t.returnedQty || 0)), 0);
    return `
      <div class="emp-card">
        <div class="emp-head">
          <div class="emp-avatar">${escapeHtml((e.name || '?')[0])}</div>
          <div>
            <h4>${escapeHtml(e.name)}</h4>
            <small style="color:var(--text-muted)">الرقم الوظيفي: ${escapeHtml(e.empNumber || '-')}</small>
          </div>
        </div>
        <div class="emp-meta">
          <span><i class="fa-solid fa-building"></i> ${escapeHtml(e.department || 'غير محدد')}</span>
          <span><i class="fa-solid fa-phone"></i> ${escapeHtml(e.phone || '-')}</span>
          <span><i class="fa-solid fa-laptop"></i> عهد نشطة بحوزته: <strong>${activeCount}</strong></span>
        </div>
        <button class="btn-sm btn-outline full-width" onclick="openEmployeeModal('${e.id}')">تعديل البيانات</button>
      </div>
    `;
  }).join('') : '<p>لا يوجد موظفون مطابقون</p>';
}

function populateSelects() {
  const hoEmp = document.getElementById('hoEmployee');
  hoEmp.innerHTML = '<option value="">-- اختر الموظف --</option>' +
    state.employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${escapeHtml(e.department || '')})</option>`).join('');

  const hoAsset = document.getElementById('hoAsset');
  hoAsset.innerHTML = '<option value="">-- اختر الجهاز / العهدة --</option>' +
    state.assets.filter(a => Number(a.remainingQty) > 0)
      .map(a => `<option value="${a.id}">${escapeHtml(a.name)} (المتبقي: ${a.remainingQty})</option>`).join('');

  hoAsset.onchange = () => {
    const ast = state.assets.find(a => a.id === hoAsset.value);
    document.getElementById('hoAvailableHint').textContent = ast ? `الرصيد المتاح حالياً بالمستودع: ${ast.remainingQty}` : '';
    document.getElementById('hoQty').max = ast ? ast.remainingQty : 1;
  };

  // العهد النشطة للاسترجاع
  const retSelect = document.getElementById('retActiveTx');
  const activeHandovers = state.transactions.filter(t => t.type === 'HANDOVER' && t.status === 'ACTIVE');
  retSelect.innerHTML = '<option value="">-- اختر العهدة المطلوب استرجاعها --</option>' +
    activeHandovers.map(t => {
      const rem = Number(t.qty) - Number(t.returnedQty || 0);
      return `<option value="${t.id}">${t.txNumber} | ${escapeHtml(t.employeeName)} ← ${escapeHtml(t.assetName)} (متبقي لديه: ${rem})</option>`;
    }).join('');

  retSelect.onchange = () => {
    const tx = state.transactions.find(t => t.id === retSelect.value);
    if (tx) {
      const rem = Number(tx.qty) - Number(tx.returnedQty || 0);
      document.getElementById('retTxInfo').textContent = `تاريخ التسليم الأصلي: ${tx.date} | الكمية المتبقية لدى الموظف: ${rem}`;
      document.getElementById('retQty').value = rem;
      document.getElementById('retQty').max = rem;
    } else {
      document.getElementById('retTxInfo').textContent = '';
    }
  };

  // فلاتر سجل الحركة
  const fAsset = document.getElementById('filterTxAsset');
  const currA = fAsset.value;
  fAsset.innerHTML = '<option value="ALL">كل الأصناف</option>' +
    state.assets.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  fAsset.value = currA || 'ALL';

  const fEmp = document.getElementById('filterTxEmployee');
  const currE = fEmp.value;
  fEmp.innerHTML = '<option value="ALL">كل الموظفين</option>' +
    state.employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  fEmp.value = currE || 'ALL';
}

function getFilteredMovements() {
  const t = document.getElementById('filterTxType').value;
  const a = document.getElementById('filterTxAsset').value;
  const e = document.getElementById('filterTxEmployee').value;
  return [...state.transactions].reverse().filter(tx => {
    if (t !== 'ALL' && tx.type !== t) return false;
    if (a !== 'ALL' && tx.assetId !== a) return false;
    if (e !== 'ALL' && tx.employeeId !== e) return false;
    return true;
  });
}

function renderMovements() {
  const list = getFilteredMovements();
  const tbody = document.getElementById('movementsTableBody');
  tbody.innerHTML = list.length ? list.map(tx => `
    <tr>
      <td><strong>${escapeHtml(tx.txNumber)}</strong></td>
      <td>${getTxTypeBadge(tx.type)}</td>
      <td>${escapeHtml(tx.assetName)}</td>
      <td>${escapeHtml(tx.employeeName)}</td>
      <td><strong>${tx.qty}</strong></td>
      <td>${escapeHtml(String(tx.date).slice(0, 10))}</td>
      <td>${getTxStatusBadge(tx)}</td>
      <td>${tx.signatureUrl ? '<span class="badge badge-success">موثق</span>' : '<span class="badge badge-info">بدون مرفق</span>'}</td>
      <td>
        <button class="btn-sm btn-outline" onclick="showTxDetails('${tx.id}')">التفاصيل</button>
        <button class="btn-sm btn-outline" onclick="printTransactionReceipt('${tx.id}')"><i class="fa-solid fa-print"></i></button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="9" style="text-align:center">لا توجد حركات مطابقة</td></tr>';
}

function getTxTypeBadge(type) {
  if (type === 'HANDOVER') return '<span class="badge badge-warning">تسليم عهدة</span>';
  if (type === 'RETURN') return '<span class="badge badge-success">استرجاع عهدة</span>';
  return '<span class="badge badge-info">تغذية مخزون</span>';
}

function getTxStatusBadge(tx) {
  if (tx.type === 'HANDOVER') {
    return tx.status === 'ACTIVE'
      ? '<span class="badge badge-warning">عهدة نشطة</span>'
      : '<span class="badge badge-success">تم الإرجاع</span>';
  }
  return '<span class="badge badge-success">مكتمل</span>';
}

/* ================== لوحة التوقيع باللمس والماوس ================== */
function initSignatureCanvases() {
  ['ho', 'ret'].forEach(key => {
    const canvas = document.getElementById(`${key}Canvas`);
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let hasStroke = false;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      hasStroke = true;
      const pos = getPos(e);
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    canvases[key] = {
      canvas, ctx,
      isEmpty: () => !hasStroke,
      resetFlag: () => { hasStroke = false; }
    };
    resizeCanvas(key);
  });

  window.addEventListener('resize', () => {
    resizeCanvas('ho');
    resizeCanvas('ret');
  });
}

function resizeCanvas(key) {
  const item = canvases[key];
  if (!item) return;
  const { canvas, ctx } = item;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (!w || !h) return;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  ctx.scale(ratio, ratio);
  item.resetFlag();
}

function clearCanvas(key) {
  const item = canvases[key];
  if (!item) return;
  item.ctx.clearRect(0, 0, item.canvas.width, item.canvas.height);
  item.resetFlag();
}

function initSignTabsAndFiles() {
  document.querySelectorAll('.sign-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target;
      const mode = tab.dataset.mode;
      state.signMode[target] = mode;

      document.querySelectorAll(`.sign-tab[data-target="${target}"]`).forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.getElementById(`${target}ScreenSignBox`).classList.toggle('hidden', mode !== 'SCREEN');
      document.getElementById(`${target}UploadSignBox`).classList.toggle('hidden', mode !== 'UPLOAD');
      if (mode === 'SCREEN') resizeCanvas(target);
    });
  });

  ['ho', 'ret'].forEach(key => {
    const input = document.getElementById(`${key}FileInput`);
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        showToast('حجم الملف يجب ألا يتجاوز 4 ميجابايت', true);
        input.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        state.files[key] = { base64: reader.result, name: file.name, type: file.type };
        document.getElementById(`${key}FileName`).textContent = `تم اختيار الملف: ${file.name}`;
      };
      reader.readAsDataURL(file);
    });
  });
}

/* ================== إرسال النماذج ================== */
function bindForms() {
  // حفظ صنف
  document.getElementById('assetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      id: document.getElementById('assetId').value || '',
      name: document.getElementById('assetName').value.trim(),
      category: document.getElementById('assetCategory').value,
      code: document.getElementById('assetCode').value.trim(),
      serial: document.getElementById('assetSerial').value.trim(),
      totalQty: document.getElementById('assetQty').value,
      notes: document.getElementById('assetNotes').value.trim()
    };
    setLoading(true, 'جاري حفظ الصنف...');
    try {
      await postToBackend('saveAsset', payload);
      closeModal('modal-asset');
      showToast('تم حفظ الصنف بنجاح');
      await loadAllData();
    } catch (err) {
      showToast(err.message, true);
    } finally { setLoading(false); }
  });

  // حفظ موظف
  document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      id: document.getElementById('empId').value || '',
      name: document.getElementById('empName').value.trim(),
      empNumber: document.getElementById('empNumber').value.trim(),
      department: document.getElementById('empDept').value.trim(),
      phone: document.getElementById('empPhone').value.trim(),
      email: document.getElementById('empEmail').value.trim()
    };
    setLoading(true, 'جاري حفظ بيانات الموظف...');
    try {
      await postToBackend('saveEmployee', payload);
      closeModal('modal-employee');
      showToast('تم حفظ بيانات الموظف');
      await loadAllData();
    } catch (err) {
      showToast(err.message, true);
    } finally { setLoading(false); }
  });

  // تسليم عهدة
  document.getElementById('handoverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = state.signMode.ho;
    let filePayload = {};
    if (mode === 'SCREEN') {
      if (canvases.ho.isEmpty()) return showToast('يرجى التوقيع على الشاشة أو رفع نموذج موقع', true);
      filePayload = { fileBase64: canvases.ho.canvas.toDataURL('image/png'), fileName: `handover_${Date.now()}.png`, mimeType: 'image/png' };
    } else {
      if (!state.files.ho) return showToast('يرجى اختيار ملف النموذج الموقع لرفعه', true);
      filePayload = { fileBase64: state.files.ho.base64, fileName: state.files.ho.name, mimeType: state.files.ho.type };
    }

    const payload = Object.assign({
      employeeId: document.getElementById('hoEmployee').value,
      assetId: document.getElementById('hoAsset').value,
      qty: document.getElementById('hoQty').value,
      date: document.getElementById('hoDate').value,
      condition: document.getElementById('hoCondition').value,
      notes: document.getElementById('hoNotes').value.trim(),
      signMethod: mode
    }, filePayload);

    setLoading(true, 'جاري توثيق التسليم وحفظ التوقيع...');
    try {
      await postToBackend('handover', payload);
      e.target.reset();
      initDates();
      clearCanvas('ho');
      state.files.ho = null;
      document.getElementById('hoFileName').textContent = 'اضغط لاختيار صورة النموذج الموقع أو ملف PDF';
      showToast('تم تسليم العهدة بنجاح');
      await loadAllData();
      switchView('movements');
    } catch (err) {
      showToast(err.message, true);
    } finally { setLoading(false); }
  });

  // استرجاع عهدة
  document.getElementById('returnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = state.signMode.ret;
    let filePayload = {};
    if (mode === 'SCREEN') {
      if (canvases.ret.isEmpty()) return showToast('يرجى التوقيع على الشاشة أو رفع نموذج التسليم الموقع', true);
      filePayload = { fileBase64: canvases.ret.canvas.toDataURL('image/png'), fileName: `return_${Date.now()}.png`, mimeType: 'image/png' };
    } else {
      if (!state.files.ret) return showToast('يرجى اختيار ملف نموذج التسليم الموقع', true);
      filePayload = { fileBase64: state.files.ret.base64, fileName: state.files.ret.name, mimeType: state.files.ret.type };
    }

    const payload = Object.assign({
      handoverTxId: document.getElementById('retActiveTx').value,
      qty: document.getElementById('retQty').value,
      date: document.getElementById('retDate').value,
      condition: document.getElementById('retCondition').value,
      notes: document.getElementById('retNotes').value.trim(),
      signMethod: mode
    }, filePayload);

    setLoading(true, 'جاري تسجيل استرجاع العهدة وتحديث المخزون...');
    try {
      await postToBackend('returnAsset', payload);
      e.target.reset();
      initDates();
      clearCanvas('ret');
      state.files.ret = null;
      document.getElementById('retFileName').textContent = 'اضغط لاختيار صورة النموذج الموقع أو ملف PDF';
      showToast('تم استرجاع العهدة وإعادتها للرصيد بنجاح');
      await loadAllData();
      switchView('movements');
    } catch (err) {
      showToast(err.message, true);
    } finally { setLoading(false); }
  });
}

async function quickAddStock(assetId) {
  const qty = prompt('أدخل الكمية المضافة لرصيد هذا الصنف:', '1');
  if (!qty || isNaN(qty) || Number(qty) <= 0) return;
  setLoading(true, 'جاري إضافة الرصيد...');
  try {
    await postToBackend('addStock', { assetId, qty: Number(qty), notes: 'تغذية رصيد' });
    showToast('تم تحديث الرصيد بنجاح');
    await loadAllData();
  } catch (err) {
    showToast(err.message, true);
  } finally { setLoading(false); }
}

/* ================== الطباعة والتصدير ================== */
function printBlankOrCurrentForm(type) {
  const isHandover = type === 'HANDOVER';
  const empSelect = document.getElementById('hoEmployee');
  const assetSelect = document.getElementById('hoAsset');
  const empName = isHandover && empSelect.value ? empSelect.options[empSelect.selectedIndex].text : '...........................................';
  const assetName = isHandover && assetSelect.value ? assetSelect.options[assetSelect.selectedIndex].text : '...........................................';
  const qty = isHandover ? document.getElementById('hoQty').value : document.getElementById('retQty').value;
  const date = isHandover ? document.getElementById('hoDate').value : document.getElementById('retDate').value;

  document.getElementById('printArea').innerHTML = `
    <div class="print-doc">
      <div class="print-header">
        <div>
          <h2>${isHandover ? 'نموذج استلام عهدة (أجهزة ومعدات)' : 'نموذج تسليم عهدة وإخلاء طرف'}</h2>
          <p>إدارة الأصول والعهد - نظام عهدتي</p>
        </div>
        <div><strong>التاريخ:</strong> ${date}</div>
      </div>
      <p>${isHandover ? 'أقر أنا الموضح بياناتي أدناه باستلام العهدة التالية بحالة سليمة وأتعهد بالمحافظة عليها وإعادتها عند الطلب:' : 'نقر باستلام العهدة الموضحة أدناه من الموظف وإخلاء طرفه حسب الحالة المسجلة:'}</p>
      <table class="print-table">
        <tr><th>اسم الموظف</th><td>${escapeHtml(empName)}</td></tr>
        <tr><th>الصنف / الجهاز</th><td>${escapeHtml(assetName)}</td></tr>
        <tr><th>الكمية</th><td>${qty}</td></tr>
        <tr><th>ملاحظات / الحالة</th><td>${isHandover ? escapeHtml(document.getElementById('hoNotes').value || '-') : escapeHtml(document.getElementById('retCondition').value)}</td></tr>
      </table>
      <div class="print-signs">
        <div class="print-sign-box"><strong>توقيع الموظف</strong><br><br>.........................</div>
        <div class="print-sign-box"><strong>توقيع مسؤول العهد</strong><br><br>.........................</div>
      </div>
    </div>
  `;
  window.print();
}

function printTransactionReceipt(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;
  const sigImg = tx.signatureUrl && (tx.signatureUrl.startsWith('data:image') || tx.signatureUrl.includes('thumbnail'))
    ? `<img src="${tx.signatureUrl}" alt="التوقيع" />`
    : (tx.signatureUrl ? `<p>تم إرفاق نموذج موقع في Google Drive</p>` : '<p>بدون توقيع رقمي</p>');

  document.getElementById('printArea').innerHTML = `
    <div class="print-doc">
      <div class="print-header">
        <div>
          <h2>سند ${tx.type === 'HANDOVER' ? 'استلام عهدة' : (tx.type === 'RETURN' ? 'إرجاع وإخلاء عهدة' : 'حركة مخزون')}</h2>
          <p>رقم السند: <strong>${escapeHtml(tx.txNumber)}</strong></p>
        </div>
        <div><strong>التاريخ:</strong> ${escapeHtml(String(tx.date).slice(0, 10))}</div>
      </div>
      <table class="print-table">
        <tr><th>الصنف / الجهاز</th><td>${escapeHtml(tx.assetName)}</td></tr>
        <tr><th>الطرف / الموظف</th><td>${escapeHtml(tx.employeeName)}</td></tr>
        <tr><th>الكمية</th><td>${tx.qty}</td></tr>
        <tr><th>الحالة</th><td>${escapeHtml(tx.condition || '-')}</td></tr>
        <tr><th>ملاحظات</th><td>${escapeHtml(tx.notes || '-')}</td></tr>
      </table>
      <div class="print-signs">
        <div class="print-sign-box"><strong>التوقيع / الإثبات</strong><br>${sigImg}</div>
        <div class="print-sign-box"><strong>ختم / اعتماد الإدارة</strong><br><br>.........................</div>
      </div>
    </div>
  `;
  window.print();
}

function printMovementsReport() {
  const list = getFilteredMovements();
  document.getElementById('printArea').innerHTML = `
    <div class="print-doc">
      <div class="print-header">
        <h2>تقرير حركة العهد والأرصدة</h2>
        <div>تاريخ الطباعة: ${new Date().toISOString().slice(0, 10)}</div>
      </div>
      <table class="print-table">
        <thead><tr><th>رقم العملية</th><th>النوع</th><th>الصنف</th><th>الموظف</th><th>الكمية</th><th>التاريخ</th></tr></thead>
        <tbody>
          ${list.map(t => `<tr><td>${t.txNumber}</td><td>${t.type}</td><td>${escapeHtml(t.assetName)}</td><td>${escapeHtml(t.employeeName)}</td><td>${t.qty}</td><td>${String(t.date).slice(0,10)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  window.print();
}

function exportMovementsCSV() {
  const list = getFilteredMovements();
  const headers = ['رقم العملية', 'النوع', 'الصنف', 'الموظف', 'الكمية', 'الحالة عند العملية', 'التاريخ', 'ملاحظات'];
  const rows = list.map(t => [
    t.txNumber,
    t.type === 'HANDOVER' ? 'تسليم' : (t.type === 'RETURN' ? 'استرجاع' : 'تغذية مخزون'),
    t.assetName, t.employeeName, t.qty, t.condition, String(t.date).slice(0, 10), t.notes || ''
  ]);
  const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `تقرير_حركة_العهد_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}

/* ================== النوافذ والإعدادات ================== */
function openAssetModal(id = '') {
  document.getElementById('assetForm').reset();
  document.getElementById('assetId').value = id;
  if (id) {
    const a = state.assets.find(x => x.id === id);
    document.getElementById('assetModalTitle').textContent = 'تعديل بيانات الصنف';
    document.getElementById('assetName').value = a.name;
    document.getElementById('assetCategory').value = a.category;
    document.getElementById('assetCode').value = a.code;
    document.getElementById('assetSerial').value = a.serial;
    document.getElementById('assetQty').value = a.totalQty;
    document.getElementById('assetNotes').value = a.notes || '';
  } else {
    document.getElementById('assetModalTitle').textContent = 'إضافة جهاز / صنف جديد';
  }
  openModal('modal-asset');
}

function openEmployeeModal(id = '') {
  document.getElementById('employeeForm').reset();
  document.getElementById('empId').value = id;
  if (id) {
    const e = state.employees.find(x => x.id === id);
    document.getElementById('empModalTitle').textContent = 'تعديل بيانات الموظف';
    document.getElementById('empName').value = e.name;
    document.getElementById('empNumber').value = e.empNumber;
    document.getElementById('empDept').value = e.department;
    document.getElementById('empPhone').value = e.phone;
    document.getElementById('empEmail').value = e.email;
  } else {
    document.getElementById('empModalTitle').textContent = 'إضافة موظف جديد';
  }
  openModal('modal-employee');
}

function showTxDetails(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;
  let sigHtml = '<p>لا يوجد توقيع أو مرفق</p>';
  if (tx.signatureUrl) {
    if (tx.signatureUrl.startsWith('data:image') || tx.signatureUrl.includes('thumbnail')) {
      sigHtml = `<img src="${tx.signatureUrl}" style="max-width:100%;border:1px solid var(--border);border-radius:10px;background:#fff;padding:8px" />`;
    } else {
      sigHtml = `<a href="${tx.signatureUrl}" target="_blank" class="btn-primary">فتح المرفق الموقع في Google Drive</a>`;
    }
  }
  document.getElementById('txDetailsBody').innerHTML = `
    <div style="display:grid;gap:10px;font-size:14px">
      <div><strong>رقم العملية:</strong> ${escapeHtml(tx.txNumber)}</div>
      <div><strong>الصنف:</strong> ${escapeHtml(tx.assetName)} (الكمية: ${tx.qty})</div>
      <div><strong>الموظف / الطرف:</strong> ${escapeHtml(tx.employeeName)}</div>
      <div><strong>التاريخ:</strong> ${escapeHtml(String(tx.date).slice(0, 10))}</div>
      <div><strong>الحالة:</strong> ${escapeHtml(tx.condition || '-')}</div>
      <div><strong>الملاحظات:</strong> ${escapeHtml(tx.notes || '-')}</div>
      <div style="margin-top:8px"><strong>التوقيع / المستند المرفق:</strong><div style="margin-top:8px">${sigHtml}</div></div>
    </div>
  `;
  openModal('modal-tx-details');
}

function openSettingsModal() {
  document.getElementById('gasUrlInput').value = state.gasUrl || '';
  openModal('modal-settings');
}

function saveGasSettings() {
  const url = document.getElementById('gasUrlInput').value.trim();
  state.gasUrl = url;
  localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
  closeModal('modal-settings');
  showToast(url ? 'تم حفظ رابط Google Script، جاري المزامنة...' : 'تم التحويل لوضع المعاينة التجريبي');
  loadAllData();
}

async function testAndInitGAS() {
  const url = document.getElementById('gasUrlInput').value.trim();
  if (!url) return showToast('أدخل رابط Web App أولاً', true);
  setLoading(true, 'جاري الاتصال وتهيئة الجداول تلقائياً...');
  try {
    const res = await fetch(`${url}?action=init`, { redirect: 'follow' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'فشلت التهيئة');
    showToast('تم الاتصال وإنشاء جداول Assets و Employees و Transactions ومجلد Drive بنجاح!');
  } catch (err) {
    showToast('خطأ في الاتصال: ' + err.message, true);
  } finally { setLoading(false); }
}

function updateConnectionUI() {
  const live = isLiveMode();
  const badge = document.getElementById('connectionBadge');
  badge.className = `status-pill ${live ? 'live' : 'demo'}`;
  badge.innerHTML = `<i class="fa-solid fa-circle"></i> ${live ? 'متصل بـ Google Sheets' : 'وضع المعاينة التجريبي'}`;
  document.getElementById('demoBanner').classList.toggle('hidden', live);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function setLoading(show, text = '') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.toggle('hidden', !show);
}

function showToast(msg, isError = false) {
  const el = document.createElement('div');
  el.className = `toast ${isError ? 'error' : ''}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}