/**
 * نظام عهدتي - سندات متعددة الأصناف، طباعة إجبارية بالتوقيع، وتقارير تفصيلية
 */
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzxn0UCX-J6E0Xe7Nmz4Z-uIP2EAwLRavSJTjCqfUdhgkGCC6BcIlAO9On5jpvYXOPPug/exec';

const STORAGE_KEYS = {
  GAS_URL: 'ohdaty_gas_url',
  DEMO_DATA: 'ohdaty_demo_data_v2',
  THEME: 'ohdaty_theme'
};

const INITIAL_DEMO_DATA = {
  assets: [
    { id: 'AST-1', code: 'DEV-1001', name: 'لابتوب Dell Latitude 5430', category: 'حاسب محمول', serial: 'DL-883920', totalQty: 10, assignedQty: 2, remainingQty: 8, status: 'متاح', notes: 'مع شاحن أصلي' },
    { id: 'AST-2', code: 'DEV-1002', name: 'شاشة LG 27 بوصة', category: 'شاشة / ملحقات', serial: 'LG-99210', totalQty: 8, assignedQty: 1, remainingQty: 7, status: 'متاح', notes: 'مع كابل HDMI' },
    { id: 'AST-3', code: 'DEV-1003', name: 'جوال iPhone 15 العمل', category: 'هاتف / تابلت', serial: 'AP-441029', totalQty: 5, assignedQty: 0, remainingQty: 5, status: 'متاح', notes: '' }
  ],
  employees: [
    { id: 'EMP-1', empNumber: '101', name: 'أحمد محمد العتيبي', department: 'تقنية المعلومات', phone: '0501234567', email: 'ahmed@company.com' },
    { id: 'EMP-2', empNumber: '102', name: 'سارة خالد الدوسري', department: 'الموارد البشرية', phone: '0559876543', email: 'sara@company.com' }
  ],
  vouchers: [
    { id: 'VCH-1', voucherNumber: 'HND-00001', type: 'HANDOVER', employeeId: 'EMP-1', employeeName: 'أحمد محمد العتيبي', employeeNumber: '101', employeeDept: 'تقنية المعلومات', date: '2026-11-10', totalItems: 2, totalQty: 3, notes: 'تجهيز محطة العمل', signMethod: 'NONE', signatureUrl: '', signaturePreview: '', status: 'ACTIVE', relatedVoucherId: '', relatedVoucherNumber: '' }
  ],
  voucherItems: [
    { id: 'ITM-1', voucherId: 'VCH-1', voucherNumber: 'HND-00001', type: 'HANDOVER', assetId: 'AST-1', assetCode: 'DEV-1001', assetName: 'لابتوب Dell Latitude 5430', assetSerial: 'DL-883920', assetCategory: 'حاسب محمول', employeeId: 'EMP-1', employeeName: 'أحمد محمد العتيبي', qty: 2, returnedQty: 0, condition: 'جديد', date: '2026-11-10', notes: 'مع الشواحن', status: 'ACTIVE', relatedItemId: '' },
    { id: 'ITM-2', voucherId: 'VCH-1', voucherNumber: 'HND-00001', type: 'HANDOVER', assetId: 'AST-2', assetCode: 'DEV-1002', assetName: 'شاشة LG 27 بوصة', assetSerial: 'LG-99210', assetCategory: 'شاشة / ملحقات', employeeId: 'EMP-1', employeeName: 'أحمد محمد العتيبي', qty: 1, returnedQty: 0, condition: 'جديد', date: '2026-11-10', notes: '', status: 'ACTIVE', relatedItemId: '' }
  ]
};

let state = {
  gasUrl: localStorage.getItem(STORAGE_KEYS.GAS_URL) || DEFAULT_GAS_URL,
  assets: [],
  employees: [],
  vouchers: [],
  voucherItems: [],
  hoCart: [],
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

function toggleMobileDrawer(open) {
  document.getElementById('sidebar').classList.toggle('mobile-open', open);
  document.getElementById('drawerBackdrop').classList.toggle('open', open);
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
  document.querySelectorAll('.nav-item, .m-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      toggleMobileDrawer(false);
    });
  });
  document.getElementById('btnOpenSettings').addEventListener('click', openSettingsModal);
  document.getElementById('btnMobileSettings').addEventListener('click', openSettingsModal);
  document.getElementById('btnSync').addEventListener('click', loadAllData);

  document.getElementById('assetSearch').addEventListener('input', renderAssets);
  document.getElementById('empSearch').addEventListener('input', renderEmployees);
  document.getElementById('voucherSearch').addEventListener('input', renderVouchers);
  document.getElementById('filterVoucherType').addEventListener('change', renderVouchers);
  document.getElementById('filterVoucherStatus').addEventListener('change', renderVouchers);
}

function switchView(viewName) {
  const titles = {
    dashboard: 'لوحة المعلومات والتقارير',
    assets: 'الأصناف والأرصدة',
    handover: 'تسليم عهدة (سند جديد)',
    return: 'استرجاع / إخلاء عهدة',
    vouchers: 'أرشيف السندات والطباعة',
    employees: 'الموظفون والأفراد',
    reports: 'التقارير التفصيلية'
  };
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.getElementById('pageTitle').textContent = titles[viewName] || '';

  document.querySelectorAll('.nav-item, .m-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === viewName);
  });

  if (viewName === 'handover') resizeCanvas('ho');
  if (viewName === 'return') resizeCanvas('ret');
  if (viewName === 'reports') { renderAssetReport(); renderEmployeeReport(); }
}

/* ================== الاتصال بالبيانات ================== */
async function loadAllData() {
  updateConnectionUI();
  if (!isLiveMode()) {
    const saved = localStorage.getItem(STORAGE_KEYS.DEMO_DATA);
    const data = saved ? JSON.parse(saved) : INITIAL_DEMO_DATA;
    if (!saved) localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify(data));
    state.assets = data.assets || [];
    state.employees = data.employees || [];
    state.vouchers = data.vouchers || [];
    state.voucherItems = data.voucherItems || [];
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
    state.vouchers = data.vouchers || [];
    state.voucherItems = data.voucherItems || [];
    renderAll();
  } catch (err) {
    showToast('تعذر الاتصال بجوجل شيت: ' + err.message, true);
  } finally {
    setLoading(false);
  }
}

async function postToBackend(action, payloadData) {
  if (!isLiveMode()) return handleDemoAction(action, payloadData);
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
    assets: state.assets, employees: state.employees,
    vouchers: state.vouchers, voucherItems: state.voucherItems
  }));
}

function handleDemoAction(action, data) {
  const now = new Date().toISOString();
  if (action === 'saveAsset') {
    if (data.id) {
      const ast = state.assets.find(a => a.id === data.id);
      if (Number(data.totalQty) < Number(ast.assignedQty)) throw new Error('الكمية الإجمالية أقل من المسلمة');
      ast.name = data.name; ast.category = data.category; ast.code = data.code || ast.code;
      ast.serial = data.serial; ast.totalQty = Number(data.totalQty);
      ast.remainingQty = ast.totalQty - Number(ast.assignedQty);
      ast.status = ast.remainingQty > 0 ? 'متاح' : 'منفد'; ast.notes = data.notes;
    } else {
      const id = 'AST-' + Date.now();
      const code = data.code || 'DEV-' + Math.floor(1000 + Math.random() * 9000);
      const qty = Number(data.totalQty);
      state.assets.push({ id, code, name: data.name, category: data.category, serial: data.serial, totalQty: qty, assignedQty: 0, remainingQty: qty, status: 'متاح', notes: data.notes });
      const vId = 'VCH-' + Date.now();
      const vNum = 'STK-' + String(state.vouchers.length + 1).padStart(5, '0');
      state.vouchers.push({ id: vId, voucherNumber: vNum, type: 'IN_STOCK', employeeId: '', employeeName: 'المستودع الرئيسي', employeeNumber: '-', employeeDept: 'المستودع', date: now.slice(0,10), totalItems: 1, totalQty: qty, notes: 'رصيد افتتاحي', signMethod: 'NONE', signatureUrl: '', signaturePreview: '', status: 'COMPLETED' });
      state.voucherItems.push({ id: 'ITM-' + Date.now(), voucherId: vId, voucherNumber: vNum, type: 'IN_STOCK', assetId: id, assetCode: code, assetName: data.name, assetSerial: data.serial, assetCategory: data.category, employeeId: '', employeeName: 'المستودع الرئيسي', qty, returnedQty: 0, condition: 'جديد', date: now.slice(0,10), notes: 'إضافة صنف', status: 'COMPLETED', relatedItemId: '' });
    }
    saveDemoData();
    return { success: true };
  }
  if (action === 'addStock') {
    const ast = state.assets.find(a => a.id === data.assetId);
    const add = Number(data.qty);
    ast.totalQty = Number(ast.totalQty) + add; ast.remainingQty = Number(ast.remainingQty) + add; ast.status = 'متاح';
    const vId = 'VCH-' + Date.now();
    const vNum = 'STK-' + String(state.vouchers.length + 1).padStart(5, '0');
    state.vouchers.push({ id: vId, voucherNumber: vNum, type: 'IN_STOCK', employeeId: '', employeeName: 'المستودع الرئيسي', employeeNumber: '-', employeeDept: 'المستودع', date: now.slice(0,10), totalItems: 1, totalQty: add, notes: data.notes || 'زيادة رصيد', signMethod: 'NONE', signatureUrl: '', signaturePreview: '', status: 'COMPLETED' });
    state.voucherItems.push({ id: 'ITM-' + Date.now(), voucherId: vId, voucherNumber: vNum, type: 'IN_STOCK', assetId: ast.id, assetCode: ast.code, assetName: ast.name, assetSerial: ast.serial, assetCategory: ast.category, employeeId: '', employeeName: 'المستودع الرئيسي', qty: add, returnedQty: 0, condition: 'سليم', date: now.slice(0,10), notes: data.notes || 'زيادة رصيد', status: 'COMPLETED', relatedItemId: '' });
    saveDemoData();
    return { success: true };
  }
  if (action === 'saveEmployee') {
    if (data.id) Object.assign(state.employees.find(e => e.id === data.id), data);
    else state.employees.push({ id: 'EMP-' + Date.now(), empNumber: data.empNumber || String(100 + state.employees.length + 1), name: data.name, department: data.department, phone: data.phone, email: data.email });
    saveDemoData();
    return { success: true };
  }
  if (action === 'handover') {
    const emp = state.employees.find(e => e.id === data.employeeId);
    const reqTotals = {};
    data.items.forEach(i => reqTotals[i.assetId] = (reqTotals[i.assetId] || 0) + Number(i.qty));
    Object.keys(reqTotals).forEach(aid => {
      const ast = state.assets.find(a => a.id === aid);
      if (Number(ast.remainingQty) < reqTotals[aid]) throw new Error('الرصيد غير كافٍ للصنف: ' + ast.name);
    });
    Object.keys(reqTotals).forEach(aid => {
      const ast = state.assets.find(a => a.id === aid);
      ast.assignedQty = Number(ast.assignedQty) + reqTotals[aid];
      ast.remainingQty = Number(ast.remainingQty) - reqTotals[aid];
      ast.status = ast.remainingQty > 0 ? 'متاح' : 'منفد';
    });

    const vId = 'VCH-' + Date.now();
    const vNum = 'HND-' + String(state.vouchers.length + 1).padStart(5, '0');
    let totalQty = 0;
    const createdItems = data.items.map((item, idx) => {
      const ast = state.assets.find(a => a.id === item.assetId);
      const q = Number(item.qty); totalQty += q;
      const itm = {
        id: 'ITM-' + Date.now() + '-' + idx, voucherId: vId, voucherNumber: vNum, type: 'HANDOVER',
        assetId: ast.id, assetCode: ast.code, assetName: ast.name, assetSerial: ast.serial, assetCategory: ast.category,
        employeeId: emp.id, employeeName: emp.name, qty: q, returnedQty: 0, condition: item.condition,
        date: data.date, notes: item.notes, status: 'ACTIVE', relatedItemId: ''
      };
      state.voucherItems.push(itm);
      return itm;
    });
    const voucherObj = {
      id: vId, voucherNumber: vNum, type: 'HANDOVER', employeeId: emp.id, employeeName: emp.name,
      employeeNumber: emp.empNumber, employeeDept: emp.department, date: data.date, totalItems: createdItems.length,
      totalQty, notes: data.notes, signMethod: data.signMethod, signatureUrl: data.fileBase64 || '',
      signaturePreview: data.signaturePreview || '', status: 'ACTIVE', relatedVoucherId: '', relatedVoucherNumber: ''
    };
    state.vouchers.push(voucherObj);
    saveDemoData();
    return { success: true, voucher: voucherObj, items: createdItems };
  }
  if (action === 'returnAsset') {
    const origV = state.vouchers.find(v => v.id === data.handoverVoucherId);
    const vId = 'VCH-' + Date.now();
    const vNum = 'RET-' + String(state.vouchers.length + 1).padStart(5, '0');
    let totalQty = 0;
    const createdItems = data.items.map((retItem, idx) => {
      const origItm = state.voucherItems.find(i => i.id === retItem.handoverItemId);
      const ast = state.assets.find(a => a.id === origItm.assetId);
      const rQty = Number(retItem.qty); totalQty += rQty;
      origItm.returnedQty = Number(origItm.returnedQty || 0) + rQty;
      origItm.status = origItm.returnedQty >= Number(origItm.qty) ? 'RETURNED' : 'ACTIVE';
      ast.assignedQty = Math.max(0, Number(ast.assignedQty) - rQty);
      ast.remainingQty = Number(ast.remainingQty) + rQty;
      ast.status = 'متاح';
      const newItm = {
        id: 'ITM-' + Date.now() + '-' + idx, voucherId: vId, voucherNumber: vNum, type: 'RETURN',
        assetId: origItm.assetId, assetCode: origItm.assetCode, assetName: origItm.assetName,
        assetSerial: origItm.assetSerial, assetCategory: origItm.assetCategory,
        employeeId: origV.employeeId, employeeName: origV.employeeName, qty: rQty, returnedQty: 0,
        condition: retItem.condition, date: data.date, notes: retItem.notes, status: 'COMPLETED', relatedItemId: origItm.id
      };
      state.voucherItems.push(newItm);
      return newItm;
    });
    const vItems = state.voucherItems.filter(i => i.voucherId === origV.id);
    const allRet = vItems.every(i => Number(i.returnedQty || 0) >= Number(i.qty));
    origV.status = allRet ? 'RETURNED' : 'PARTIAL_RETURN';

    const voucherObj = {
      id: vId, voucherNumber: vNum, type: 'RETURN', employeeId: origV.employeeId, employeeName: origV.employeeName,
      employeeNumber: origV.employeeNumber, employeeDept: origV.employeeDept, date: data.date, totalItems: createdItems.length,
      totalQty, notes: data.notes, signMethod: data.signMethod, signatureUrl: data.fileBase64 || '',
      signaturePreview: data.signaturePreview || '', status: 'COMPLETED', relatedVoucherId: origV.id, relatedVoucherNumber: origV.voucherNumber
    };
    state.vouchers.push(voucherObj);
    saveDemoData();
    return { success: true, voucher: voucherObj, items: createdItems };
  }
}

/* ================== عرض الشاشات ================== */
function renderAll() {
  renderDashboard();
  renderAssets();
  renderEmployees();
  populateSelects();
  renderHoCart();
  renderVouchers();
  renderAssetReport();
  renderEmployeeReport();
}

function renderDashboard() {
  const total = state.assets.reduce((s, a) => s + Number(a.totalQty || 0), 0);
  const remaining = state.assets.reduce((s, a) => s + Number(a.remainingQty || 0), 0);
  const assigned = state.assets.reduce((s, a) => s + Number(a.assignedQty || 0), 0);

  document.getElementById('kpiTotalStock').textContent = total;
  document.getElementById('kpiRemainingStock').textContent = remaining;
  document.getElementById('kpiAssignedStock').textContent = assigned;
  document.getElementById('kpiTotalVouchers').textContent = state.vouchers.length;

  document.getElementById('dashboardBalances').innerHTML = state.assets.length
    ? state.assets.slice(0, 6).map(a => {
        const pct = a.totalQty > 0 ? Math.round((a.remainingQty / a.totalQty) * 100) : 0;
        return `
          <div class="balance-item">
            <div class="balance-top"><span>${escapeHtml(a.name)}</span><span>متبقي ${a.remainingQty} من ${a.totalQty}</span></div>
            <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join('')
    : '<p class="field-hint">لا توجد أصناف مسجلة بعد</p>';

  const recent = [...state.vouchers].reverse().slice(0, 5);
  document.getElementById('dashboardRecentVouchers').innerHTML = recent.length
    ? recent.map(v => `
        <div class="recent-item">
          <div>
            <strong>${escapeHtml(v.voucherNumber)}</strong> — ${escapeHtml(v.employeeName)}
            <div style="color:var(--text-muted);font-size:12px">${v.totalItems} أصناف (${v.totalQty} قطعة) • ${String(v.date).slice(0,10)}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${getVoucherTypeBadge(v.type)}
            <button class="btn-sm btn-outline" onclick="printVoucherById('${v.id}')" title="طباعة"><i class="fa-solid fa-print"></i></button>
          </div>
        </div>
      `).join('')
    : '<p class="field-hint">لا توجد سندات مسجلة</p>';
}

function renderAssets() {
  const q = document.getElementById('assetSearch').value.trim().toLowerCase();
  const filtered = state.assets.filter(a => `${a.code} ${a.name} ${a.serial} ${a.category}`.toLowerCase().includes(q));
  document.getElementById('assetsTableBody').innerHTML = filtered.length
    ? filtered.map(a => `
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
      `).join('')
    : '<tr><td colspan="9" style="text-align:center">لا توجد أصناف مطابقة</td></tr>';
}

function renderEmployees() {
  const q = document.getElementById('empSearch').value.trim().toLowerCase();
  const filtered = state.employees.filter(e => `${e.name} ${e.empNumber} ${e.department}`.toLowerCase().includes(q));
  document.getElementById('employeesGrid').innerHTML = filtered.length
    ? filtered.map(e => {
        const activeQty = state.voucherItems
          .filter(i => i.type === 'HANDOVER' && i.employeeId === e.id && i.status === 'ACTIVE')
          .reduce((s, i) => s + (Number(i.qty) - Number(i.returnedQty || 0)), 0);
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
              <span><i class="fa-solid fa-laptop"></i> عهد نشطة بذمته: <strong>${activeQty} قطعة</strong></span>
            </div>
            <div class="emp-actions">
              <button class="btn-sm btn-outline" style="flex:1" onclick="openEmployeeModal('${e.id}')">تعديل</button>
              <button class="btn-sm btn-primary" style="flex:1" onclick="openEmployeeReportDirect('${e.id}')">تقرير الموظف</button>
            </div>
          </div>`;
      }).join('')
    : '<p>لا يوجد موظفون مطابقون</p>';
}

function populateSelects() {
  document.getElementById('hoEmployee').innerHTML = '<option value="">-- اختر الموظف --</option>' +
    state.employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${escapeHtml(e.department || '')})</option>`).join('');

  const pickAsset = document.getElementById('hoPickAsset');
  pickAsset.innerHTML = '<option value="">-- اختر الجهاز / الصنف --</option>' +
    state.assets.filter(a => Number(a.remainingQty) > 0)
      .map(a => `<option value="${a.id}">${escapeHtml(a.name)} [${escapeHtml(a.code)}] (المتاح: ${a.remainingQty})</option>`).join('');

  pickAsset.onchange = () => {
    const ast = state.assets.find(a => a.id === pickAsset.value);
    const inCart = state.hoCart.filter(c => c.assetId === pickAsset.value).reduce((s, c) => s + Number(c.qty), 0);
    const avail = ast ? Math.max(0, Number(ast.remainingQty) - inCart) : 0;
    document.getElementById('hoAvailableHint').textContent = ast ? `المتاح للإضافة من "${ast.name}": ${avail}` : '';
    document.getElementById('hoPickQty').max = avail || 1;
  };

  // تصفية سندات الاسترجاع
  const retFilterEmp = document.getElementById('retFilterEmployee');
  const prevRetEmp = retFilterEmp.value;
  retFilterEmp.innerHTML = '<option value="ALL">جميع الموظفين</option>' +
    state.employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  retFilterEmp.value = prevRetEmp || 'ALL';
  retFilterEmp.onchange = populateReturnVouchersSelect;
  populateReturnVouchersSelect();

  // قوائم التقارير
  const repAsset = document.getElementById('repAssetSelect');
  const prevRepA = repAsset.value;
  repAsset.innerHTML = '<option value="ALL">جميع الأصناف (تقرير شامل)</option>' +
    state.assets.map(a => `<option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.code)})</option>`).join('');
  if (prevRepA) repAsset.value = prevRepA;

  const repEmp = document.getElementById('repEmpSelect');
  const prevRepE = repEmp.value;
  repEmp.innerHTML = '<option value="ALL">جميع الموظفين (تقرير شامل)</option>' +
    state.employees.map(e => `<option value="${e.id}">${escapeHtml(e.name)} (${escapeHtml(e.department || '')})</option>`).join('');
  if (prevRepE) repEmp.value = prevRepE;
}

/* ================== إدارة سلة تسليم العهدة (متعددة الأجهزة) ================== */
function addHoCartItem() {
  const assetId = document.getElementById('hoPickAsset').value;
  const qty = Number(document.getElementById('hoPickQty').value || 0);
  const condition = document.getElementById('hoPickCondition').value;
  const notes = document.getElementById('hoPickNote').value.trim();

  if (!assetId) return showToast('اختر الجهاز أو الصنف أولاً', true);
  if (qty <= 0) return showToast('الكمية يجب أن تكون 1 على الأقل', true);

  const asset = state.assets.find(a => a.id === assetId);
  const inCart = state.hoCart.filter(c => c.assetId === assetId).reduce((s, c) => s + Number(c.qty), 0);
  if (inCart + qty > Number(asset.remainingQty)) {
    return showToast(`الكمية المطلوبة تتجاوز الرصيد المتبقي (${asset.remainingQty - inCart})`, true);
  }

  state.hoCart.push({
    assetId: asset.id, assetCode: asset.code, assetName: asset.name,
    assetSerial: asset.serial || '', qty, condition, notes
  });

  document.getElementById('hoPickQty').value = 1;
  document.getElementById('hoPickNote').value = '';
  document.getElementById('hoPickAsset').dispatchEvent(new Event('change'));
  renderHoCart();
}

function removeHoCartItem(index) {
  state.hoCart.splice(index, 1);
  document.getElementById('hoPickAsset').dispatchEvent(new Event('change'));
  renderHoCart();
}

function renderHoCart() {
  const tbody = document.getElementById('hoCartTableBody');
  const totalQty = state.hoCart.reduce((s, i) => s + Number(i.qty), 0);
  document.getElementById('hoCartSummary').textContent = `${state.hoCart.length} أصناف | ${totalQty} قطعة`;

  tbody.innerHTML = state.hoCart.length
    ? state.hoCart.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(item.assetName)}</strong></td>
          <td>${escapeHtml(item.assetCode)} ${item.assetSerial ? '/ ' + escapeHtml(item.assetSerial) : ''}</td>
          <td><strong>${item.qty}</strong></td>
          <td>${escapeHtml(item.condition)}</td>
          <td>${escapeHtml(item.notes || '-')}</td>
          <td><button type="button" class="btn-danger-sm" onclick="removeHoCartItem(${idx})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
      `).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">لم يتم إضافة أجهزة للسند بعد</td></tr>';
}

/* ================== إدارة الاسترجاع متعدد الأجهزة ================== */
function populateReturnVouchersSelect() {
  const empFilter = document.getElementById('retFilterEmployee').value;
  const activeVouchers = state.vouchers.filter(v =>
    v.type === 'HANDOVER' && (v.status === 'ACTIVE' || v.status === 'PARTIAL_RETURN') &&
    (empFilter === 'ALL' || v.employeeId === empFilter)
  );
  const select = document.getElementById('retActiveVoucher');
  const prev = select.value;
  select.innerHTML = '<option value="">-- اختر سند التسليم --</option>' +
    activeVouchers.map(v => `<option value="${v.id}">${v.voucherNumber} | ${escapeHtml(v.employeeName)} | ${String(v.date).slice(0,10)} (${v.totalItems} أصناف)</option>`).join('');
  if (activeVouchers.some(v => v.id === prev)) select.value = prev;
  select.onchange = renderReturnItemsTable;
  renderReturnItemsTable();
}

function renderReturnItemsTable() {
  const voucherId = document.getElementById('retActiveVoucher').value;
  const tbody = document.getElementById('retItemsTableBody');
  const infoEl = document.getElementById('retVoucherInfo');

  if (!voucherId) {
    infoEl.textContent = '';
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">اختر سند تسليم لعرض الأجهزة المرتبطة به</td></tr>';
    return;
  }

  const voucher = state.vouchers.find(v => v.id === voucherId);
  infoEl.textContent = `الموظف: ${voucher.employeeName} | تاريخ التسليم: ${String(voucher.date).slice(0,10)} | الحالة: ${voucher.status === 'PARTIAL_RETURN' ? 'إرجاع جزئي سابق' : 'نشط'}`;

  const items = state.voucherItems.filter(i => i.voucherId === voucherId && (Number(i.qty) - Number(i.returnedQty || 0)) > 0);
  tbody.innerHTML = items.length
    ? items.map(item => {
        const rem = Number(item.qty) - Number(item.returnedQty || 0);
        return `
          <tr data-item-id="${item.id}">
            <td><input type="checkbox" class="ret-check" checked /></td>
            <td><strong>${escapeHtml(item.assetName)}</strong><div style="font-size:11px;color:var(--text-muted)">${escapeHtml(item.assetCode)}</div></td>
            <td><strong>${rem}</strong> من ${item.qty}</td>
            <td><input type="number" class="ret-inline-input ret-qty" min="1" max="${rem}" value="${rem}" /></td>
            <td>
              <select class="ret-inline-select ret-cond">
                <option value="سليم وبحالة ممتازة">سليم وبحالة ممتازة</option>
                <option value="سليم مع استهلاك طبيعي">سليم مع استهلاك طبيعي</option>
                <option value="بحاجة لصيانة">بحاجة لصيانة</option>
                <option value="تالف">تالف</option>
              </select>
            </td>
            <td><input type="text" class="ret-inline-note ret-note" placeholder="ملاحظة..." /></td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="text-align:center">تم إرجاع كافة أجهزة هذا السند</td></tr>';
}

function toggleSelectAllReturnItems(checked) {
  document.querySelectorAll('#retItemsTableBody .ret-check').forEach(cb => cb.checked = checked);
}

function goToReturnForVoucher(voucherId) {
  switchView('return');
  document.getElementById('retFilterEmployee').value = 'ALL';
  populateReturnVouchersSelect();
  document.getElementById('retActiveVoucher').value = voucherId;
  renderReturnItemsTable();
}

/* ================== أرشيف السندات ================== */
function renderVouchers() {
  const q = document.getElementById('voucherSearch').value.trim().toLowerCase();
  const typeF = document.getElementById('filterVoucherType').value;
  const statusF = document.getElementById('filterVoucherStatus').value;

  const list = [...state.vouchers].reverse().filter(v => {
    if (typeF !== 'ALL' && v.type !== typeF) return false;
    if (statusF !== 'ALL' && v.status !== statusF) return false;
    if (q && !`${v.voucherNumber} ${v.employeeName} ${v.notes}`.toLowerCase().includes(q)) return false;
    return true;
  });

  document.getElementById('vouchersTableBody').innerHTML = list.length
    ? list.map(v => {
        const items = state.voucherItems.filter(i => i.voucherId === v.id);
        const previewNames = items.slice(0, 2).map(i => `${i.assetName} (${i.qty})`).join('، ') + (items.length > 2 ? ` +${items.length - 2}` : '');
        const canReturn = v.type === 'HANDOVER' && (v.status === 'ACTIVE' || v.status === 'PARTIAL_RETURN');
        return `
          <tr>
            <td><strong>${escapeHtml(v.voucherNumber)}</strong></td>
            <td>${getVoucherTypeBadge(v.type)}</td>
            <td>${escapeHtml(v.employeeName)}</td>
            <td><div>${escapeHtml(previewNames || '-')}</div><small style="color:var(--text-muted)">${v.totalItems} أصناف | ${v.totalQty} قطعة</small></td>
            <td>${String(v.date).slice(0, 10)}</td>
            <td>${getVoucherStatusBadge(v)}</td>
            <td>${(v.signaturePreview || v.signatureUrl) ? '<span class="badge badge-success">موقع</span>' : '<span class="badge badge-info">بدون</span>'}</td>
            <td style="white-space:nowrap">
              <button class="btn-sm btn-outline" onclick="showVoucherDetails('${v.id}')">معاينة</button>
              <button class="btn-sm btn-primary" onclick="printVoucherById('${v.id}')"><i class="fa-solid fa-print"></i> طباعة</button>
              ${canReturn ? `<button class="btn-sm btn-outline" onclick="goToReturnForVoucher('${v.id}')">استرجاع</button>` : ''}
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="8" style="text-align:center">لا توجد سندات مطابقة</td></tr>';
}

function getVoucherTypeBadge(type) {
  if (type === 'HANDOVER') return '<span class="badge badge-warning">تسليم عهدة</span>';
  if (type === 'RETURN') return '<span class="badge badge-success">إرجاع عهدة</span>';
  return '<span class="badge badge-info">تغذية مخزون</span>';
}

function getVoucherStatusBadge(v) {
  if (v.type === 'HANDOVER') {
    if (v.status === 'ACTIVE') return '<span class="badge badge-warning">نشط</span>';
    if (v.status === 'PARTIAL_RETURN') return '<span class="badge badge-info">إرجاع جزئي</span>';
    return '<span class="badge badge-success">مرتجع بالكامل</span>';
  }
  return '<span class="badge badge-success">مكتمل</span>';
}

/* ================== التقارير التفصيلية (بالصنف والموظف) ================== */
function switchReportMode(mode) {
  document.querySelectorAll('.rep-tab').forEach(b => b.classList.toggle('active', b.dataset.rep === mode));
  document.getElementById('report-asset-panel').classList.toggle('hidden', mode !== 'asset');
  document.getElementById('report-employee-panel').classList.toggle('hidden', mode !== 'employee');
  if (mode === 'asset') renderAssetReport(); else renderEmployeeReport();
}

function openEmployeeReportDirect(empId) {
  switchView('reports');
  switchReportMode('employee');
  document.getElementById('repEmpSelect').value = empId;
  renderEmployeeReport();
}

function daysBetween(dateStr) {
  const d = new Date(String(dateStr).slice(0, 10));
  if (isNaN(d)) return '-';
  const diff = Math.max(0, Math.floor((new Date() - d) / (1000 * 60 * 60 * 24)));
  return `${diff} يوم`;
}

function filterByDateRange(items, fromId, toId) {
  const from = document.getElementById(fromId).value;
  const to = document.getElementById(toId).value;
  return items.filter(i => {
    const d = String(i.date).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

function renderAssetReport() {
  const assetId = document.getElementById('repAssetSelect').value;
  const targetAssets = assetId === 'ALL' ? state.assets : state.assets.filter(a => a.id === assetId);

  const total = targetAssets.reduce((s, a) => s + Number(a.totalQty || 0), 0);
  const assigned = targetAssets.reduce((s, a) => s + Number(a.assignedQty || 0), 0);
  const remaining = targetAssets.reduce((s, a) => s + Number(a.remainingQty || 0), 0);
  const utilPct = total > 0 ? Math.round((assigned / total) * 100) : 0;

  document.getElementById('repAssetSummaryCards').innerHTML = `
    <div class="kpi-card indigo"><div class="kpi-icon"><i class="fa-solid fa-boxes-stacked"></i></div><div class="kpi-info"><span>الرصيد الكلي</span><h3>${total}</h3></div></div>
    <div class="kpi-card amber"><div class="kpi-icon"><i class="fa-solid fa-hand-holding"></i></div><div class="kpi-info"><span>المسلم للأفراد</span><h3>${assigned}</h3></div></div>
    <div class="kpi-card emerald"><div class="kpi-icon"><i class="fa-solid fa-warehouse"></i></div><div class="kpi-info"><span>المتبقي بالمستودع</span><h3>${remaining}</h3></div></div>
    <div class="kpi-card rose"><div class="kpi-icon"><i class="fa-solid fa-percent"></i></div><div class="kpi-info"><span>نسبة التشغيل / الصرف</span><h3>${utilPct}%</h3></div></div>
  `;

  // من بحوزته هذا الصنف حالياً
  const activeHolders = state.voucherItems.filter(i =>
    i.type === 'HANDOVER' && i.status === 'ACTIVE' &&
    (assetId === 'ALL' || i.assetId === assetId) &&
    (Number(i.qty) - Number(i.returnedQty || 0)) > 0
  );

  document.getElementById('repAssetHoldersBody').innerHTML = activeHolders.length
    ? activeHolders.map(i => {
        const emp = state.employees.find(e => e.id === i.employeeId) || {};
        const rem = Number(i.qty) - Number(i.returnedQty || 0);
        return `
          <tr>
            <td><strong>${escapeHtml(i.employeeName)}</strong></td>
            <td>${escapeHtml(emp.department || '-')}</td>
            <td><strong>${escapeHtml(i.voucherNumber)}</strong></td>
            <td>${i.qty}</td>
            <td>${i.returnedQty || 0}</td>
            <td><strong style="color:var(--amber)">${rem}</strong></td>
            <td>${String(i.date).slice(0, 10)}</td>
            <td>${daysBetween(i.date)}</td>
            <td><button class="btn-sm btn-outline" onclick="goToReturnForVoucher('${i.voucherId}')">استرجاع</button></td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="9" style="text-align:center">لا توجد عهد نشطة لهذا الصنف حالياً</td></tr>';

  // سجل حركة الصنف
  let movements = state.voucherItems.filter(i => assetId === 'ALL' || i.assetId === assetId);
  movements = filterByDateRange(movements, 'repAssetFrom', 'repAssetTo').reverse();

  document.getElementById('repAssetMovementsBody').innerHTML = movements.length
    ? movements.map(m => `
        <tr>
          <td>${String(m.date).slice(0, 10)}</td>
          <td><strong>${escapeHtml(m.voucherNumber)}</strong></td>
          <td>${getVoucherTypeBadge(m.type)}</td>
          <td>${escapeHtml(m.assetName)}</td>
          <td>${escapeHtml(m.employeeName)}</td>
          <td><strong>${m.qty}</strong></td>
          <td>${escapeHtml(m.condition || '-')}</td>
          <td>${escapeHtml(m.notes || '-')}</td>
          <td><button class="btn-sm btn-outline" onclick="printVoucherById('${m.voucherId}')"><i class="fa-solid fa-print"></i></button></td>
        </tr>
      `).join('')
    : '<tr><td colspan="9" style="text-align:center">لا توجد حركات مطابقة</td></tr>';
}

function renderEmployeeReport() {
  const empId = document.getElementById('repEmpSelect').value;
  const activeItems = state.voucherItems.filter(i =>
    i.type === 'HANDOVER' && i.status === 'ACTIVE' &&
    (empId === 'ALL' || i.employeeId === empId) &&
    (Number(i.qty) - Number(i.returnedQty || 0)) > 0
  );

  let history = state.voucherItems.filter(i =>
    (i.type === 'HANDOVER' || i.type === 'RETURN') &&
    (empId === 'ALL' || i.employeeId === empId)
  );
  history = filterByDateRange(history, 'repEmpFrom', 'repEmpTo').reverse();

  const totalHanded = history.filter(i => i.type === 'HANDOVER').reduce((s, i) => s + Number(i.qty), 0);
  const totalReturned = history.filter(i => i.type === 'RETURN').reduce((s, i) => s + Number(i.qty), 0);
  const activeQty = activeItems.reduce((s, i) => s + (Number(i.qty) - Number(i.returnedQty || 0)), 0);
  const voucherCount = new Set(history.map(h => h.voucherId)).size;

  document.getElementById('repEmpSummaryCards').innerHTML = `
    <div class="kpi-card amber"><div class="kpi-icon"><i class="fa-solid fa-laptop"></i></div><div class="kpi-info"><span>عهد نشطة بذمته</span><h3>${activeQty} قطعة</h3></div></div>
    <div class="kpi-card indigo"><div class="kpi-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div><div class="kpi-info"><span>إجمالي ما استلمه</span><h3>${totalHanded}</h3></div></div>
    <div class="kpi-card emerald"><div class="kpi-icon"><i class="fa-solid fa-rotate-left"></i></div><div class="kpi-info"><span>إجمالي ما أرجعه</span><h3>${totalReturned}</h3></div></div>
    <div class="kpi-card rose"><div class="kpi-icon"><i class="fa-solid fa-file-invoice"></i></div><div class="kpi-info"><span>عدد السندات</span><h3>${voucherCount}</h3></div></div>
  `;

  document.getElementById('repEmpActiveBody').innerHTML = activeItems.length
    ? activeItems.map(i => {
        const rem = Number(i.qty) - Number(i.returnedQty || 0);
        return `
          <tr>
            <td><strong>${escapeHtml(i.employeeName)}</strong></td>
            <td>${escapeHtml(i.assetName)}</td>
            <td>${escapeHtml(i.assetCode)} ${i.assetSerial ? '/ ' + escapeHtml(i.assetSerial) : ''}</td>
            <td><strong>${escapeHtml(i.voucherNumber)}</strong></td>
            <td>${i.qty}</td>
            <td><strong style="color:var(--amber)">${rem}</strong></td>
            <td>${String(i.date).slice(0, 10)}</td>
            <td>${daysBetween(i.date)}</td>
            <td>
              <button class="btn-sm btn-outline" onclick="printVoucherById('${i.voucherId}')"><i class="fa-solid fa-print"></i></button>
              <button class="btn-sm btn-primary" onclick="goToReturnForVoucher('${i.voucherId}')">إرجاع</button>
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="9" style="text-align:center">لا توجد عهد نشطة حالياً</td></tr>';

  document.getElementById('repEmpHistoryBody').innerHTML = history.length
    ? history.map(m => `
        <tr>
          <td>${String(m.date).slice(0, 10)}</td>
          <td><strong>${escapeHtml(m.voucherNumber)}</strong></td>
          <td>${getVoucherTypeBadge(m.type)}</td>
          <td>${escapeHtml(m.employeeName)}</td>
          <td>${escapeHtml(m.assetName)}</td>
          <td><strong>${m.qty}</strong></td>
          <td>${escapeHtml(m.condition || '-')}</td>
          <td>${escapeHtml(m.notes || '-')}</td>
          <td><button class="btn-sm btn-outline" onclick="printVoucherById('${m.voucherId}')"><i class="fa-solid fa-print"></i></button></td>
        </tr>
      `).join('')
    : '<tr><td colspan="9" style="text-align:center">لا توجد حركات مسجلة</td></tr>';
}

/* ================== التوقيع والملفات ================== */
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

    const start = (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e) => {
      if (!drawing) return;
      e.preventDefault();
      hasStroke = true;
      const p = getPos(e);
      ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f172a';
      ctx.lineTo(p.x, p.y); ctx.stroke();
    };
    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    canvases[key] = { canvas, ctx, isEmpty: () => !hasStroke, resetFlag: () => { hasStroke = false; } };
    resizeCanvas(key);
  });
  window.addEventListener('resize', () => { resizeCanvas('ho'); resizeCanvas('ret'); });
}

function resizeCanvas(key) {
  const item = canvases[key];
  if (!item) return;
  const { canvas, ctx } = item;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  if (!w || !h) return;
  canvas.width = w * ratio; canvas.height = h * ratio;
  ctx.scale(ratio, ratio);
  item.resetFlag();
}

function clearCanvas(key) {
  const item = canvases[key];
  if (!item) return;
  item.ctx.clearRect(0, 0, item.canvas.width, item.canvas.height);
  item.resetFlag();
}

function createCompactSignatureDataUrl(canvas) {
  // إنشاء نسخة خفيفة وواضحة من التوقيع للطباعة والحفظ الفوري في الجدول
  const temp = document.createElement('canvas');
  temp.width = 420; temp.height = 150;
  const tCtx = temp.getContext('2d');
  tCtx.fillStyle = '#ffffff';
  tCtx.fillRect(0, 0, temp.width, temp.height);
  tCtx.drawImage(canvas, 0, 0, temp.width, temp.height);
  return temp.toDataURL('image/png');
}

function createCompressedImagePreview(dataUrl) {
  return new Promise(resolve => {
    if (!dataUrl.startsWith('data:image/')) return resolve('');
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const maxW = 450;
      const scale = Math.min(1, maxW / img.width);
      c.width = img.width * scale; c.height = img.height * scale;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });
}

function initSignTabsAndFiles() {
  document.querySelectorAll('.sign-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target, mode = tab.dataset.mode;
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
      if (file.size > 4 * 1024 * 1024) { showToast('حجم الملف يجب ألا يتجاوز 4 ميجابايت', true); input.value = ''; return; }
      const reader = new FileReader();
      reader.onload = async () => {
        const preview = await createCompressedImagePreview(reader.result);
        state.files[key] = { base64: reader.result, preview, name: file.name, type: file.type };
        document.getElementById(`${key}FileName`).textContent = `تم اختيار الملف: ${file.name}`;
      };
      reader.readAsDataURL(file);
    });
  });
}

/* ================== حفظ النماذج + الطباعة الإجبارية ================== */
function bindForms() {
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
      closeModal('modal-asset'); showToast('تم حفظ الصنف بنجاح'); await loadAllData();
    } catch (err) { showToast(err.message, true); } finally { setLoading(false); }
  });

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
    setLoading(true, 'جاري حفظ الموظف...');
    try {
      await postToBackend('saveEmployee', payload);
      closeModal('modal-employee'); showToast('تم حفظ بيانات الموظف'); await loadAllData();
    } catch (err) { showToast(err.message, true); } finally { setLoading(false); }
  });

  // حفظ سند التسليم + طباعة إجبارية فورية بالتوقيع
  document.getElementById('handoverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.hoCart.length) return showToast('أضف جهازاً واحداً على الأقل للسند قبل الحفظ', true);

    const mode = state.signMode.ho;
    let filePayload = {};
    let instantSigDataUrl = '';

    if (mode === 'SCREEN') {
      if (canvases.ho.isEmpty()) return showToast('التوقيع على الشاشة إلزامي لاعتماد السند والطباعة', true);
      instantSigDataUrl = createCompactSignatureDataUrl(canvases.ho.canvas);
      filePayload = { fileBase64: instantSigDataUrl, signaturePreview: instantSigDataUrl, fileName: `handover_${Date.now()}.png`, mimeType: 'image/png' };
    } else {
      if (!state.files.ho) return showToast('يرجى رفع ملف النموذج الموقع', true);
      instantSigDataUrl = state.files.ho.preview || '';
      filePayload = { fileBase64: state.files.ho.base64, signaturePreview: state.files.ho.preview, fileName: state.files.ho.name, mimeType: state.files.ho.type };
    }

    const payload = Object.assign({
      employeeId: document.getElementById('hoEmployee').value,
      date: document.getElementById('hoDate').value,
      notes: document.getElementById('hoNotes').value.trim(),
      items: state.hoCart,
      signMethod: mode
    }, filePayload);

    setLoading(true, 'جاري حفظ سند التسليم وتجهيزه للطباعة...');
    try {
      const res = await postToBackend('handover', payload);
      const savedVoucher = res.voucher;
      const savedItems = res.items;
      if (instantSigDataUrl && !savedVoucher.signaturePreview) savedVoucher.signaturePreview = instantSigDataUrl;

      state.hoCart = [];
      e.target.reset();
      initDates();
      clearCanvas('ho');
      state.files.ho = null;
      document.getElementById('hoFileName').textContent = 'اضغط لاختيار صورة النموذج الموقع أو ملف PDF';

      await loadAllData();
      showToast('تم حفظ السند، جاري فتح الطباعة الإجبارية...');
      await triggerVoucherPrint(savedVoucher, savedItems, instantSigDataUrl);
      switchView('vouchers');
    } catch (err) {
      showToast(err.message, true);
    } finally { setLoading(false); }
  });

  // حفظ سند الاسترجاع + طباعة إجبارية فورية بالتوقيع
  document.getElementById('returnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const voucherId = document.getElementById('retActiveVoucher').value;
    if (!voucherId) return showToast('اختر سند التسليم أولاً', true);

    const selectedItems = [];
    document.querySelectorAll('#retItemsTableBody tr[data-item-id]').forEach(tr => {
      if (tr.querySelector('.ret-check').checked) {
        selectedItems.push({
          handoverItemId: tr.dataset.itemId,
          qty: Number(tr.querySelector('.ret-qty').value),
          condition: tr.querySelector('.ret-cond').value,
          notes: tr.querySelector('.ret-note').value.trim()
        });
      }
    });
    if (!selectedItems.length) return showToast('حدد جهازاً واحداً على الأقل للإرجاع', true);

    const mode = state.signMode.ret;
    let filePayload = {};
    let instantSigDataUrl = '';

    if (mode === 'SCREEN') {
      if (canvases.ret.isEmpty()) return showToast('التوقيع على الشاشة إلزامي لإثبات الإرجاع والطباعة', true);
      instantSigDataUrl = createCompactSignatureDataUrl(canvases.ret.canvas);
      filePayload = { fileBase64: instantSigDataUrl, signaturePreview: instantSigDataUrl, fileName: `return_${Date.now()}.png`, mimeType: 'image/png' };
    } else {
      if (!state.files.ret) return showToast('يرجى رفع ملف نموذج التسليم الموقع', true);
      instantSigDataUrl = state.files.ret.preview || '';
      filePayload = { fileBase64: state.files.ret.base64, signaturePreview: state.files.ret.preview, fileName: state.files.ret.name, mimeType: state.files.ret.type };
    }

    const payload = Object.assign({
      handoverVoucherId: voucherId,
      date: document.getElementById('retDate').value,
      notes: document.getElementById('retNotes').value.trim(),
      items: selectedItems,
      signMethod: mode
    }, filePayload);

    setLoading(true, 'جاري حفظ سند الإرجاع وتحديث الأرصدة...');
    try {
      const res = await postToBackend('returnAsset', payload);
      const savedVoucher = res.voucher;
      const savedItems = res.items;
      if (instantSigDataUrl && !savedVoucher.signaturePreview) savedVoucher.signaturePreview = instantSigDataUrl;

      e.target.reset();
      initDates();
      clearCanvas('ret');
      state.files.ret = null;
      document.getElementById('retFileName').textContent = 'اضغط لاختيار صورة النموذج الموقع أو ملف PDF';

      await loadAllData();
      showToast('تم حفظ سند الإرجاع، جاري فتح الطباعة الإجبارية...');
      await triggerVoucherPrint(savedVoucher, savedItems, instantSigDataUrl);
      switchView('vouchers');
    } catch (err) {
      showToast(err.message, true);
    } finally { setLoading(false); }
  });
}

async function quickAddStock(assetId) {
  const qty = prompt('أدخل الكمية المضافة لرصيد هذا الصنف:', '1');
  if (!qty || isNaN(qty) || Number(qty) <= 0) return;
  setLoading(true, 'جاري تحديث الرصيد...');
  try {
    await postToBackend('addStock', { assetId, qty: Number(qty), notes: 'تغذية رصيد' });
    showToast('تم تحديث الرصيد بنجاح');
    await loadAllData();
  } catch (err) { showToast(err.message, true); } finally { setLoading(false); }
}

/* ================== نظام الطباعة الاحترافي A4 ================== */
function printVoucherById(voucherId) {
  const voucher = state.vouchers.find(v => v.id === voucherId);
  if (!voucher) return;
  const items = state.voucherItems.filter(i => i.voucherId === voucherId);
  triggerVoucherPrint(voucher, items, voucher.signaturePreview || voucher.signatureUrl || '');
}

function printDraftHandover() {
  const empId = document.getElementById('hoEmployee').value;
  const emp = state.employees.find(e => e.id === empId) || { name: '.........................', empNumber: '-', department: '-' };
  const draftVoucher = {
    voucherNumber: 'مسودة',
    type: 'HANDOVER',
    employeeName: emp.name,
    employeeNumber: emp.empNumber || '-',
    employeeDept: emp.department || '-',
    date: document.getElementById('hoDate').value,
    notes: document.getElementById('hoNotes').value,
    status: 'DRAFT',
    signMethod: 'NONE'
  };
  const items = state.hoCart.length ? state.hoCart : [{ assetCode: '-', assetName: '.........................', assetSerial: '-', qty: '-', condition: '-', notes: '-' }];
  triggerVoucherPrint(draftVoucher, items, '');
}

async function triggerVoucherPrint(voucher, items, sigOverride = '') {
  const isReturn = voucher.type === 'RETURN';
  const isStock = voucher.type === 'IN_STOCK';
  const title = isReturn ? 'سند استرجاع عهدة وإخلاء طرف' : (isStock ? 'سند تغذية وإضافة مخزون' : 'سند تسليم واستلام عهدة');
  const sigSrc = sigOverride || voucher.signaturePreview || voucher.signatureUrl || '';
  const isImageSig = sigSrc && (sigSrc.startsWith('data:image') || sigSrc.includes('thumbnail'));

  let sigHtml = '<span style="color:#94a3b8;font-size:11px">توقيع يدوي / مسودة</span>';
  if (isImageSig) {
    sigHtml = `<img id="printSigImg" src="${sigSrc}" alt="توقيع الموظف" />`;
  } else if (sigSrc) {
    sigHtml = '<span style="color:#0f766e;font-weight:700;font-size:11px">✓ تم إرفاق نموذج موقع في Google Drive</span>';
  }

  const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const declaration = isReturn
    ? 'نقر نحن إدارة الأصول والعهد باستلام الأجهزة والمعدات الموضحة في الجدول أدناه من الموظف وإخلاء طرفه منها وفقاً للحالة المذكورة لكل صنف.'
    : 'أقر أنا الموظف الموضحة بياناتي أعلاه باستلام الأجهزة والعهد المبينة في الجدول أدناه بحالة سليمة، وأتعهد بالمحافظة عليها واستخدامها لأغراض العمل فقط وإعادتها عند الطلب أو عند انتهاء الخدمة.';

  const empObj = state.employees.find(e => e.id === voucher.employeeId) || {};

  document.getElementById('printArea').innerHTML = `
    <div class="p-sheet">
      <div class="p-top-banner">
        <div class="p-brand">
          <div class="p-logo-box">ع</div>
          <div class="p-title">
            <h1>${title}</h1>
            <p>نظام إدارة الأصول والعهد المؤسسية | عُهدتي</p>
          </div>
        </div>
        <div class="p-doc-meta">
          <div class="p-voucher-num">${escapeHtml(voucher.voucherNumber)}</div>
          <div><strong>التاريخ:</strong> ${escapeHtml(String(voucher.date).slice(0, 10))}</div>
          ${voucher.relatedVoucherNumber ? `<div><strong>مرجع التسليم:</strong> ${escapeHtml(voucher.relatedVoucherNumber)}</div>` : ''}
        </div>
      </div>

      <div class="p-info-grid">
        <div class="p-info-box">
          <h4>بيانات الموظف / الطرف</h4>
          <div class="p-info-row"><span>الاسم:</span><strong>${escapeHtml(voucher.employeeName)}</strong></div>
          <div class="p-info-row"><span>الرقم الوظيفي:</span><strong>${escapeHtml(voucher.employeeNumber || empObj.empNumber || '-')}</strong></div>
          <div class="p-info-row"><span>القسم / الإدارة:</span><strong>${escapeHtml(voucher.employeeDept || empObj.department || '-')}</strong></div>
          <div class="p-info-row"><span>رقم الجوال:</span><strong>${escapeHtml(empObj.phone || '-')}</strong></div>
        </div>
        <div class="p-info-box">
          <h4>بيانات السند</h4>
          <div class="p-info-row"><span>نوع السند:</span><strong>${title}</strong></div>
          <div class="p-info-row"><span>عدد الأصناف:</span><strong>${items.length}</strong></div>
          <div class="p-info-row"><span>إجمالي القطع:</span><strong>${totalQty}</strong></div>
          <div class="p-info-row"><span>طريقة التوثيق:</span><strong>${voucher.signMethod === 'SCREEN' ? 'توقيع إلكتروني على الشاشة' : (voucher.signMethod === 'UPLOAD' ? 'نموذج مرفوع' : 'ورقي')}</strong></div>
        </div>
      </div>

      <div class="p-declaration">${declaration}</div>

      <table class="p-table">
        <thead>
          <tr>
            <th style="width:36px">م</th>
            <th>كود الصنف</th>
            <th>اسم الجهاز / الصنف</th>
            <th>الرقم التسلسلي</th>
            <th style="width:65px">الكمية</th>
            <th>الحالة</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(it.assetCode || '-')}</td>
              <td><strong>${escapeHtml(it.assetName)}</strong></td>
              <td>${escapeHtml(it.assetSerial || '-')}</td>
              <td><strong>${it.qty}</strong></td>
              <td>${escapeHtml(it.condition || '-')}</td>
              <td>${escapeHtml(it.notes || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4">الإجمالي الكلي للسند</td>
            <td colspan="3">${items.length} أصناف — بإجمالي ${totalQty} قطعة</td>
          </tr>
        </tfoot>
      </table>

      ${voucher.notes ? `<div class="p-notes-box"><strong>ملاحظات عامة:</strong> ${escapeHtml(voucher.notes)}</div>` : ''}

      <div class="p-signatures">
        <div class="p-sign-card">
          <div class="p-sign-title">${isReturn ? 'توقيع الموظف المُسلِّم' : 'توقيع الموظف المستلم'}</div>
          <div class="p-sign-body">${sigHtml}</div>
          <div class="p-sign-footer">${escapeHtml(voucher.employeeName)}</div>
        </div>
        <div class="p-sign-card">
          <div class="p-sign-title">توقيع مسؤول العهد / المستودع</div>
          <div class="p-sign-body"></div>
          <div class="p-sign-footer">الاسم والتوقيع</div>
        </div>
        <div class="p-sign-card">
          <div class="p-sign-title">الختم الرسمي</div>
          <div class="p-sign-body"></div>
          <div class="p-sign-footer">اعتماد الإدارة</div>
        </div>
      </div>

      <div class="p-footer">
        <span>تم إنشاء هذا المستند عبر نظام إدارة العهد (عهدتي)</span>
        <span>تاريخ ووقت الطباعة: ${new Date().toLocaleString('ar-SA')}</span>
      </div>
    </div>
  `;

  // انتظار تحميل صورة التوقيع قبل فتح نافذة الطباعة لضمان ظهورها دائماً
  const img = document.getElementById('printSigImg');
  if (img && !img.complete) {
    await new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 1500);
    });
  }
  window.print();
}

function printAssetReport() {
  const assetId = document.getElementById('repAssetSelect').value;
  const targetAssets = assetId === 'ALL' ? state.assets : state.assets.filter(a => a.id === assetId);
  const titleName = assetId === 'ALL' ? 'جميع الأصناف' : (targetAssets[0]?.name || '');
  const movements = filterByDateRange(state.voucherItems.filter(i => assetId === 'ALL' || i.assetId === assetId), 'repAssetFrom', 'repAssetTo');

  document.getElementById('printArea').innerHTML = `
    <div class="p-sheet">
      <div class="p-top-banner">
        <div class="p-brand"><div class="p-logo-box">ت</div><div class="p-title"><h1>تقرير حركة ورصيد الصنف</h1><p>${escapeHtml(titleName)}</p></div></div>
        <div class="p-doc-meta"><div>تاريخ التقرير: ${new Date().toISOString().slice(0,10)}</div></div>
      </div>
      <table class="p-table">
        <thead><tr><th>الصنف</th><th>الكود</th><th>الرصيد الكلي</th><th>المسلم</th><th>المتبقي</th></tr></thead>
        <tbody>${targetAssets.map(a => `<tr><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.code)}</td><td>${a.totalQty}</td><td>${a.assignedQty}</td><td>${a.remainingQty}</td></tr>`).join('')}</tbody>
      </table>
      <h4 style="margin:12px 0 8px">سجل الحركات التفصيلي:</h4>
      <table class="p-table">
        <thead><tr><th>التاريخ</th><th>رقم السند</th><th>النوع</th><th>الصنف</th><th>الموظف</th><th>الكمية</th><th>الحالة</th></tr></thead>
        <tbody>${movements.map(m => `<tr><td>${String(m.date).slice(0,10)}</td><td>${m.voucherNumber}</td><td>${m.type === 'HANDOVER' ? 'تسليم' : (m.type === 'RETURN' ? 'استرجاع' : 'تغذية')}</td><td>${escapeHtml(m.assetName)}</td><td>${escapeHtml(m.employeeName)}</td><td>${m.qty}</td><td>${escapeHtml(m.condition || '-')}</td></tr>`).join('')}</tbody>
      </table>
    </div>
  `;
  window.print();
}

function printEmployeeReport() {
  const empId = document.getElementById('repEmpSelect').value;
  const emp = state.employees.find(e => e.id === empId);
  const titleName = emp ? `${emp.name} (${emp.department || ''})` : 'جميع الموظفين';
  const activeItems = state.voucherItems.filter(i => i.type === 'HANDOVER' && i.status === 'ACTIVE' && (empId === 'ALL' || i.employeeId === empId) && (Number(i.qty) - Number(i.returnedQty || 0)) > 0);

  document.getElementById('printArea').innerHTML = `
    <div class="p-sheet">
      <div class="p-top-banner">
        <div class="p-brand"><div class="p-logo-box">ك</div><div class="p-title"><h1>كشف العهد النشطة للموظف</h1><p>${escapeHtml(titleName)}</p></div></div>
        <div class="p-doc-meta"><div>تاريخ الكشف: ${new Date().toISOString().slice(0,10)}</div></div>
      </div>
      <table class="p-table">
        <thead><tr><th>الموظف</th><th>الصنف / الجهاز</th><th>الكود / التسلسلي</th><th>رقم السند</th><th>المتبقي بذمته</th><th>تاريخ التسليم</th></tr></thead>
        <tbody>${activeItems.length ? activeItems.map(i => `<tr><td>${escapeHtml(i.employeeName)}</td><td>${escapeHtml(i.assetName)}</td><td>${escapeHtml(i.assetCode)}</td><td>${i.voucherNumber}</td><td><strong>${Number(i.qty) - Number(i.returnedQty || 0)}</strong></td><td>${String(i.date).slice(0,10)}</td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center">لا توجد عهد نشطة بذمته</td></tr>'}</tbody>
      </table>
      <div class="p-signatures">
        <div class="p-sign-card"><div class="p-sign-title">توقيع الموظف بالمطابقة</div><div class="p-sign-body"></div><div class="p-sign-footer">${escapeHtml(emp?.name || '')}</div></div>
        <div class="p-sign-card"><div class="p-sign-title">مسؤول العهد</div><div class="p-sign-body"></div><div class="p-sign-footer">التوقيع</div></div>
        <div class="p-sign-card"><div class="p-sign-title">الختم</div><div class="p-sign-body"></div><div class="p-sign-footer">إدارة الأصول</div></div>
      </div>
    </div>
  `;
  window.print();
}

/* ================== تصدير CSV ================== */
function downloadCSV(filename, headers, rows) {
  const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function exportVouchersCSV() {
  const headers = ['رقم السند', 'النوع', 'الموظف', 'القسم', 'عدد الأصناف', 'إجمالي القطع', 'التاريخ', 'الحالة', 'ملاحظات'];
  const rows = state.vouchers.map(v => [v.voucherNumber, v.type, v.employeeName, v.employeeDept, v.totalItems, v.totalQty, String(v.date).slice(0,10), v.status, v.notes]);
  downloadCSV(`سجل_السندات_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
}

function exportAssetReportCSV() {
  const assetId = document.getElementById('repAssetSelect').value;
  const list = filterByDateRange(state.voucherItems.filter(i => assetId === 'ALL' || i.assetId === assetId), 'repAssetFrom', 'repAssetTo');
  const headers = ['التاريخ', 'رقم السند', 'نوع الحركة', 'كود الصنف', 'الصنف', 'الموظف', 'الكمية', 'الحالة', 'ملاحظات'];
  const rows = list.map(m => [String(m.date).slice(0,10), m.voucherNumber, m.type, m.assetCode, m.assetName, m.employeeName, m.qty, m.condition, m.notes]);
  downloadCSV(`تقرير_حركة_الصنف_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
}

function exportEmployeeReportCSV() {
  const empId = document.getElementById('repEmpSelect').value;
  const list = filterByDateRange(state.voucherItems.filter(i => (i.type === 'HANDOVER' || i.type === 'RETURN') && (empId === 'ALL' || i.employeeId === empId)), 'repEmpFrom', 'repEmpTo');
  const headers = ['التاريخ', 'رقم السند', 'النوع', 'الموظف', 'الصنف', 'الكمية', 'المرتجع', 'الحالة', 'ملاحظات'];
  const rows = list.map(m => [String(m.date).slice(0,10), m.voucherNumber, m.type, m.employeeName, m.assetName, m.qty, m.returnedQty || 0, m.condition, m.notes]);
  downloadCSV(`تقرير_عهدة_الموظف_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
}

/* ================== النوافذ المنبثقة والإعدادات ================== */
function showVoucherDetails(voucherId) {
  const v = state.vouchers.find(x => x.id === voucherId);
  if (!v) return;
  const items = state.voucherItems.filter(i => i.voucherId === voucherId);
  const sig = v.signaturePreview || v.signatureUrl || '';
  let sigView = '<p style="color:var(--text-muted)">لا يوجد توقيع مرفق</p>';
  if (sig) {
    sigView = (sig.startsWith('data:image') || sig.includes('thumbnail'))
      ? `<img src="${sig}" style="max-width:340px;border:1px solid var(--border);border-radius:10px;background:#fff;padding:8px" />`
      : `<a href="${sig}" target="_blank" class="btn-primary">فتح المرفق في Google Drive</a>`;
  }

  document.getElementById('vModalTitle').textContent = `تفاصيل السند ${v.voucherNumber}`;
  document.getElementById('voucherDetailsBody').innerHTML = `
    <div style="display:grid;gap:12px;font-size:14px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div><strong>الموظف:</strong> ${escapeHtml(v.employeeName)}</div>
        <div><strong>التاريخ:</strong> ${String(v.date).slice(0,10)}</div>
        <div>${getVoucherTypeBadge(v.type)} ${getVoucherStatusBadge(v)}</div>
      </div>
      <div class="table-responsive">
        <table class="data-table compact-table">
          <thead><tr><th>الصنف</th><th>الكمية</th><th>المرتجع</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
          <tbody>
            ${items.map(i => `<tr><td>${escapeHtml(i.assetName)}</td><td>${i.qty}</td><td>${i.returnedQty || 0}</td><td>${escapeHtml(i.condition)}</td><td>${escapeHtml(i.notes || '-')}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div><strong>التوقيع الموثق:</strong><div style="margin-top:8px">${sigView}</div></div>
      <div class="modal-footer">
        <button class="btn-outline" onclick="closeModal('modal-voucher-details')">إغلاق</button>
        <button class="btn-primary" onclick="closeModal('modal-voucher-details');printVoucherById('${v.id}')"><i class="fa-solid fa-print"></i> طباعة السند</button>
      </div>
    </div>
  `;
  openModal('modal-voucher-details');
}

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
  setLoading(true, 'جاري الاتصال وتهيئة الجداول الأربعة تلقائياً...');
  try {
    const res = await fetch(`${url}?action=init`, { redirect: 'follow' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'فشلت التهيئة');
    showToast(data.message);
  } catch (err) { showToast('خطأ في الاتصال: ' + err.message, true); } finally { setLoading(false); }
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