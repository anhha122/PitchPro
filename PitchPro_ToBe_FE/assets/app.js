/* PitchPro · To-Be frontend prototype. Client-only demonstration, not a payment/bank integration. */
(() => {
  'use strict';
  const KEY = 'pitchpro_tobe_v1';
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' ₫';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const addDay = (day, d) => { const a = new Date(`${day}T12:00:00`);a.setDate(a.getDate()+d);return localDay(a); };
  const dayLabel = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('vi-VN', {weekday:'short',day:'2-digit',month:'2-digit'});
  const timeMins = (s) => {const [h,m] = String(s).split(':').map(Number);return h*60+m;};
  const niceTime = (s) => new Date(s).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const toDateTime = (day,hour) => new Date(`${day}T${hour}:00`).toISOString();
  const pitchRates = {'5':200000,'7':300000}; // MỨC GIÁ GIẢ ĐỊNH của bản demo; không có trong tài liệu nhóm.
  const pitchList = Array.from({length:8}, (_,i)=>({id:i+1,name:`Sân ${String(i+1).padStart(2,'0')}`,type:i<5?'5':'7'}));
  const types = {draft:['Nháp','grey'],awaiting:['Chờ thanh toán','amber'],qr_pending:['Chờ đối soát QR','blue'],paid:['Đã thanh toán','green'],cancelled:['Đã hủy','red']};
  const stages = {booked:['Đã đặt','blue'],using:['Đang sử dụng','green'],completed:['Đã trả sân','grey'],cancel_review:['Chờ duyệt hủy','amber'],cancelled:['Đã hủy','red']};
  const issueStages = {pending:['Cần xử lý','amber'],approved:['Đã phê duyệt','blue'],resolved:['Đã xử lý','green']};
  const store = (data) => { try {localStorage.setItem(KEY, JSON.stringify(data));} catch(e) {toast('Không thể ghi localStorage trong trình duyệt này.',true);} };
  function freshData() {
    const today=localDay(), yesterday=addDay(today,-1);
    const a={version:1, bookings:[], invoices:[], receipts:[], products:[
      {id:'p1',name:'Nước suối 500ml',price:10000,stock:48,unit:'chai'},
      {id:'p2',name:'Nước tăng lực',price:15000,stock:32,unit:'lon'},
      {id:'p3',name:'Bóng đá',price:120000,stock:9,unit:'quả'},
      {id:'p4',name:'Băng quấn',price:20000,stock:22,unit:'cuộn'}
    ], recons:[], issues:[], audits:[]};
    function add(id,pitchId,name,date,start,end,status,depositRate=0){
      const p=pitchList.find(p=>p.id===pitchId), cost=(timeMins(end)-timeMins(start))/60*pitchRates[p.type], invId=`HD-${id}`;
      a.bookings.push({id,pitchId,name,phone:'0900000000',date,start,end,status,invoiceId:invId,depositRate});
      a.invoices.push({id:invId,bookingId:id,customer:name,items:[{id:`line-${id}`,name:`Thuê ${p.name} · ${start}–${end}`,qty:1,unitPrice:cost}],status:status==='completed'?'paid':status==='using'?'draft':'draft',createdAt:toDateTime(date,'08:00')});
      return invId;
    }
    add('DS-101',1,'Minh Anh FC',today,'17:00','18:30','using');
    add('DS-102',2,'Tài FC',today,'19:00','20:30','booked',50);
    const inv3=add('DS-103',6,'Cường FC',today,'16:30','18:00','using',40);
    const inv4=add('DS-098',3,'Đội Sông Hàn',yesterday,'18:00','19:30','completed');
    const inv5=add('DS-099',7,'Đội Đại Phát',yesterday,'19:30','21:00','completed');
    a.receipts.push({id:'THU-M01',invoiceId:inv3,type:'deposit',method:'cash',amount:100000,reference:'TM-COC-103',verified:'manual',createdAt:toDateTime(today,'15:00')});
    a.receipts.push({id:'THU-M02',invoiceId:inv4,type:'settlement',method:'cash',amount:300000,reference:'TM-098',verified:'manual',createdAt:toDateTime(yesterday,'19:45')});
    a.receipts.push({id:'THU-M03',invoiceId:inv5,type:'settlement',method:'bank',amount:450000,reference:'DEMO-NH-099',verified:'manual',createdAt:toDateTime(yesterday,'21:10')});
    a.audits.push({id:uid('LOG'),createdAt:new Date().toISOString(),actor:'Hệ thống demo',message:'Khởi tạo dữ liệu minh họa (không phải giao dịch thật)'});
    return a;
  }
  let state;
  try {state=JSON.parse(localStorage.getItem(KEY) || 'null'); if(!state || state.version!==1 || !Array.isArray(state.bookings))state=freshData();}
  catch{state=freshData();}
  let page='tong-quan', selectedDay=localDay(), pitchFilter='all', billFilter='open', role='staff', reconDay=localDay();
  const getInvoice = (id)=>state.invoices.find(i=>i.id===id);
  const getBooking = (id)=>state.bookings.find(b=>b.id===id);
  const getProduct = (id)=>state.products.find(p=>p.id===id);
  const pitchOf = (id)=>pitchList.find(p=>p.id===Number(id));
  const invoiceTotal = inv => inv.items.reduce((s,x)=>s+(x.qty*x.unitPrice),0);
  const receiptsFor = inv => state.receipts.filter(r=>r.invoiceId===inv.id);
  const paidAmount = inv => receiptsFor(inv).reduce((s,r)=>s+r.amount,0);
  const depositAmount = inv => receiptsFor(inv).filter(x=>x.type==='deposit').reduce((s,r)=>s+r.amount,0);
  const due = inv => Math.max(0,invoiceTotal(inv)-paidAmount(inv));
  const dayReceipts = day => state.receipts.filter(r=>localDay(new Date(r.createdAt))===day);
  const totalsForDay=day => {const r=dayReceipts(day);return {cash:r.filter(x=>x.method==='cash').reduce((s,x)=>s+x.amount,0),bank:r.filter(x=>x.method==='bank').reduce((s,x)=>s+x.amount,0),count:r.length};};
  const daysBookings = day => state.bookings.filter(b=>b.date===day && b.status!=='cancelled');
  const countOpen = () => state.invoices.filter(i=>['draft','awaiting','qr_pending'].includes(i.status)).length;
  const unresolvedIssues = () => state.issues.filter(i=>i.status!=='resolved').length;
  const isLocked = day => state.recons.some(r=>r.day===day && r.status==='locked');
  const roleName = () => role==='manager'?'Quản lý (demo)':'Nhân viên (demo)';
  function log(message){state.audits.unshift({id:uid('LOG'),createdAt:new Date().toISOString(),actor:roleName(),message});state.audits=state.audits.slice(0,200);}
  function save(){store(state);render();}
  function toast(s,error=false){const root=$('toastRoot');if(!root)return;root.innerHTML=`<div class="toast ${error?'error':''}">${esc(s)}</div>`;setTimeout(()=>{if(root)root.innerHTML='';},3700);}
  function tag(status,dict=types){const [label,tone]=dict[status]||[status,'grey'];return `<span class="tag ${tone}">${esc(label)}</span>`;}
  function btn(text,action,id,klass=''){return `<button type="button" class="btn ${klass}" data-action="${esc(action)}" data-id="${esc(id||'')}">${text}</button>`;}
  function heading(eyebrow,title,subtitle,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;}
  function empty(msg='Chưa có dữ liệu'){return `<div class="empty-state"><span class="empty-illustration">◌</span>${esc(msg)}</div>`;}
  function stat(label,value,foot,ico,tone=''){return `<div class="stat-card"><span class="stat-icon ${tone}">${ico}</span><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`;}
  function recent(limit=5){return state.audits.slice(0,limit).map(x=>`<div class="activity-item"><span class="activity-symbol">✓</span><div><strong>${esc(x.message)}</strong><p>${esc(x.actor)} · ${niceTime(x.createdAt)}</p></div></div>`).join('')||empty();}
  const FOOT='<p class="page-footer">Mẫu thử FE · Dữ liệu lưu cục bộ trên trình duyệt, không kết nối máy chủ hoặc ngân hàng · Giá sân và tồn kho là dữ liệu giả định phục vụ trình diễn.</p>';
  function renderDashboard(){
    const today=localDay(), ts=totalsForDay(today), todayB=daysBookings(today), openCount=state.invoices.filter(i=>i.status==='awaiting'||i.status==='qr_pending').length;
    const paidTotal=ts.cash+ts.bank, booked=todayB.filter(b=>b.status==='booked').length, using=todayB.filter(b=>b.status==='using').length;
    const sessions=todayB.slice().sort((a,b)=>a.start.localeCompare(b.start));
    return heading('TRUNG TÂM ĐIỀU HÀNH','Tổng quan hoạt động','Theo dõi lịch sân, thanh toán và công việc cần xử lý trong ngày.',btn('+ Tạo đặt sân','booking','','primary')+btn('Đối soát cuối ngày','goto','doi-soat'))+
      `<div class="alert neutral">Giao diện mô phỏng theo <b>To-Be</b>. Số liệu thu là các khoản đã được nhập/xác minh thủ công trên FE; không thay thế đối soát thực tế với ngân hàng.</div>`+
      `<div class="stats-grid">${stat('Lượt đặt sân hôm nay',todayB.length,'Gồm các lượt chưa hủy','▤')}${stat('Đang sử dụng sân',using,`${booked} lượt đang chờ nhận sân`,'⚽','blue')}${stat('Tiền thu ghi nhận hôm nay',money(paidTotal),'Tiền mặt và chuyển khoản đã xác minh','↗')}${stat('Hóa đơn cần xử lý',openCount,'Không tính các hóa đơn nháp','◷','amber')}</div>`+
      `<div class="layout-2"><section class="surface"><div class="panel-head"><div><div class="panel-title">Lịch sử dụng sân trong ngày</div><div class="panel-caption">Danh sách theo thời gian · ${dayLabel(today)}</div></div>${btn('Xem tất cả','goto','lich-san','small')}</div><div class="table-wrap"><table><thead><tr><th>Sân</th><th>Khách / đội bóng</th><th>Khung giờ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${sessions.map(b=>`<tr><td class="strong">${pitchOf(b.pitchId).name}</td><td>${esc(b.name)}</td><td>${b.start}–${b.end}</td><td>${tag(b.status,stages)}</td><td>${b.status==='booked'?btn('Nhận sân','start',b.id,'small soft'):b.status==='using'?btn('Trả sân','release',b.id,'small'):btn('Xem','invoice',b.invoiceId,'small')}</td></tr>`).join('')||'<tr><td colspan="5">Chưa có lượt đặt</td></tr>'}</tbody></table></div></section><section class="surface"><div class="panel-head"><div class="panel-title">Ưu tiên xử lý</div>${tag(unresolvedIssues()?'pending':'resolved',issueStages)}</div><div class="split-summary"><div class="summary-tile"><small>Thanh toán cần theo dõi</small><strong>${openCount}</strong></div><div class="summary-tile"><small>Yêu cầu chưa xong</small><strong>${unresolvedIssues()}</strong></div></div><div class="divider"></div><div class="panel-title">Nhật ký gần đây</div><div class="activity-list">${recent(4)}</div>${btn('Xem nhật ký','goto','nhat-ky','full')}</section></div>
      <section class="surface" style="margin-top:20px"><div class="panel-head"><div><div class="panel-title">Tham chiếu kết quả mô phỏng BIMP</div><div class="panel-caption">Nguồn BTH3.1 · Kết quả của kịch bản mô phỏng, không phải tốc độ đang đo trên FE</div></div></div><div class="layout-2"><div><div class="metric-row"><strong>Quy trình 01 · Xử lý dịch vụ và thanh toán</strong><strong>−70,07%</strong></div><div class="chart-row"><span class="chart-row-label">As-Is: 15,37′</span><div class="chart-track"><div class="chart-track-fill" style="width:100%;background:#a2b6a9"></div></div></div><div class="chart-row"><span class="chart-row-label">To-Be: 4,60′</span><div class="chart-track"><div class="chart-track-fill" style="width:29.93%"></div></div></div></div><div><div class="metric-row"><strong>Quy trình 02 · Tổng hợp & đối soát</strong><strong>−67,75%</strong></div><div class="chart-row"><span class="chart-row-label">As-Is: 40,00′</span><div class="chart-track"><div class="chart-track-fill" style="width:100%;background:#a2b6a9"></div></div></div><div class="chart-row"><span class="chart-row-label">To-Be: 12,90′</span><div class="chart-track"><div class="chart-track-fill" style="width:32.25%"></div></div></div></div></div><p class="inline-note" style="margin-bottom:0">Các kịch bản chưa xác nhận đồng nhất hoàn toàn về điều kiện mô phỏng; không dùng phần trăm cải thiện này để cam kết hiệu suất vận hành thực tế.</p></section>${FOOT}`;
  }
  function renderSchedule(){
    const today=localDay();const bks=daysBookings(selectedDay);const filtered=pitchList.filter(p=>pitchFilter==='all'||p.type===pitchFilter);
    const strip=Array.from({length:7},(_,i)=>{const day=addDay(today,i-1);return `<button class="day-pill ${day===selectedDay?'active':''}" data-action="day" data-id="${day}"><small>${i===1?'HÔM NAY':esc(dayLabel(day).split(' ')[0])}</small><strong>${day.slice(8)}/${day.slice(5,7)}</strong></button>`;}).join('');
    const board=filtered.map(p=>{const ses=bks.filter(b=>b.pitchId===p.id).sort((a,b)=>a.start.localeCompare(b.start));return `<div class="schedule-col"><div class="schedule-head">${p.name} <span class="small-text">· ${p.type} người</span></div>${ses.map(b=>`<div class="schedule-block ${b.status==='booked'?'booked':b.status==='completed'?'completed':''}"><strong>${b.start}–${b.end}</strong><div>${esc(b.name)}</div></div>`).join('')||'<div class="schedule-free">+ Chưa có lịch</div>'}</div>`;}).join('');
    const grid=filtered.map(p=>{const ses=bks.filter(b=>b.pitchId===p.id).sort((a,b)=>a.start.localeCompare(b.start));const primary=ses.find(b=>b.status==='using')||ses.find(b=>b.status==='booked')||ses[0];return `<div class="pitch-card"><div class="pitch-top"><div><div class="pitch-type">SÂN ${p.type} NGƯỜI · ${money(pitchRates[p.type])}/GIỜ (DEMO)</div><div class="pitch-nr">${p.name}</div></div>${primary?tag(primary.status,stages):tag('Trống',{Trống:['Còn trống','green']})}</div><div class="pitch-detail">${ses.length?ses.map(b=>`<strong>${b.start}–${b.end}</strong> · ${esc(b.name)}<br>`).join(''):'Chưa có lượt đặt sân trong ngày đã chọn.'}</div><div class="btn-row">${primary&&primary.status==='booked'?btn('Nhận sân','start',primary.id,'small soft'):primary&&primary.status==='using'?btn('Trả sân','release',primary.id,'small primary'):''}${btn('Chi tiết / thêm lịch','pitch-detail',p.id,'small')}</div></div>`;}).join('');
    return heading('QUY TRÌNH 01','Lịch sân & tiếp nhận dịch vụ','Đặt sân → tạo hóa đơn nháp → nhận/trả sân → chốt và thanh toán.',btn('+ Đặt sân mới','booking','','primary'))+
    `<div class="toolbar"><div class="filters">${['all','5','7'].map(x=>`<button class="filter-btn ${x===pitchFilter?'active':''}" data-action="pitch-filter" data-id="${x}">${x==='all'?'Tất cả sân':`Sân ${x} người`}</button>`).join('')}</div><label class="small-text">Chọn ngày: <input id="scheduleDate" class="date-input" type="date" value="${selectedDay}"></label></div><div class="calendar-strip">${strip}</div><section class="surface" style="margin-bottom:19px"><div class="panel-head"><div class="panel-title">Sơ đồ lịch sân · ${esc(dayLabel(selectedDay))}</div><span class="small-text">Hiển thị các lượt đặt theo từng sân</span></div><div class="schedule-board">${board}</div></section><div class="panel-head"><span class="panel-title">Danh sách sân đang quản lý</span><span class="small-text">${filtered.length} sân</span></div><div class="pitch-grid">${grid}</div>${FOOT}`;
  }
  function renderInvoices(){
    const filter=i=>billFilter==='all'||billFilter==='open'&&i.status!=='paid'&&i.status!=='cancelled'||billFilter===i.status;
    const data=state.invoices.filter(filter).slice().reverse();
    const bills=state.invoices.filter(i=>i.status==='paid'), allRev=bills.reduce((s,i)=>s+invoiceTotal(i),0);
    const sumPending=state.invoices.filter(i=>i.status!=='cancelled'&&i.status!=='paid').reduce((s,i)=>s+due(i),0);
    return heading('QUY TRÌNH 01','Hóa đơn & thanh toán','Theo dõi hóa đơn nháp, tiền cọc, khoản chờ và trạng thái thanh toán.',btn('+ Bán sản phẩm','sale','','primary'))+
    `<div class="stats-grid">${stat('Hóa đơn cần giải quyết',countOpen(),'Gồm nháp, chưa thanh toán và chờ QR','▣')}${stat('Chưa thu / đang chờ',money(sumPending),'Không cộng tiền cọc đã thu','◷','amber')}${stat('Doanh thu hóa đơn hoàn tất',money(allRev),'Tổng hóa đơn đã hoàn tất · dữ liệu demo','↗')}${stat('Thanh toán QR đang chờ',state.invoices.filter(i=>i.status==='qr_pending').length,'Không tự coi là đã nhận tiền','⇄','blue')}</div>`+
    `<div class="toolbar"><div class="filters">${[['open','Cần xử lý'],['all','Tất cả'],['draft','Nháp'],['awaiting','Chờ thu'],['qr_pending','Chờ QR'],['paid','Hoàn tất']].map(([k,v])=>`<button class="filter-btn ${k===billFilter?'active':''}" data-action="bill-filter" data-id="${k}">${v}</button>`).join('')}</div></div>`+
    `<section class="surface"><div class="table-wrap"><table><thead><tr><th>Mã hóa đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Đã ghi nhận</th><th>Còn phải thu</th><th>Trạng thái</th><th></th></tr></thead><tbody>${data.map(i=>`<tr><td class="strong">${esc(i.id)}</td><td>${esc(i.customer)}<br><span class="small-text">${i.bookingId?'Dịch vụ sân':'Bán lẻ'}</span></td><td class="money">${money(invoiceTotal(i))}</td><td>${money(paidAmount(i))}</td><td>${money(due(i))}</td><td>${tag(i.status)}</td><td>${btn('Xem chi tiết','invoice',i.id,'small')}</td></tr>`).join('')||'<tr><td colspan="7">Chưa có hóa đơn theo bộ lọc</td></tr>'}</tbody></table></div></section>${FOOT}`;
  }
  function renderInventory(){
    return heading('QUY TRÌNH 01 · SUB-PROCESS','Kho hàng & sản phẩm','Kiểm tra tồn kho trước khi bổ sung sản phẩm vào hóa đơn. Cập nhật tồn kho và hóa đơn đồng thời trong bản demo.',btn('+ Bán sản phẩm','sale','','primary'))+
    `<div class="alert warn">Theo thiết kế To-Be, việc trừ kho phải được thực hiện bằng giao dịch cơ sở dữ liệu nguyên tử và có khóa chống bán quá tồn. Phiên bản này chỉ mô phỏng trong localStorage; khi triển khai thật cần xử lý ở backend.</div>`+
    `<section class="surface"><div class="panel-head"><div class="panel-title">Danh mục vật phẩm</div>${btn('Nhập thêm tồn kho','restock','','small')}</div><div class="table-wrap"><table><thead><tr><th>Sản phẩm</th><th>Đơn vị</th><th>Giá bán mẫu</th><th>Tồn khả dụng</th><th>Trạng thái</th><th></th></tr></thead><tbody>${state.products.map(p=>`<tr><td class="strong">${esc(p.name)}</td><td>${esc(p.unit)}</td><td>${money(p.price)}</td><td><strong>${p.stock}</strong></td><td>${tag(p.stock===0?'Hết hàng':p.stock<=10?'Sắp hết':'Còn hàng',{'Hết hàng':['Hết hàng','red'],'Sắp hết':['Sắp hết','amber'],'Còn hàng':['Còn hàng','green']})}</td><td>${btn('Bán sản phẩm','sale',p.id,'small soft')}</td></tr>`).join('')}</tbody></table></div></section>${FOOT}`;
  }
  function variance(r){const t=totalsForDay(r.day);return {cash:t.cash,bank:t.bank,cashDiff:r.countedCash==null?null:r.countedCash-t.cash,bankDiff:r.countedBank==null?null:r.countedBank-t.bank};}
  function renderReconcile(){
    const t=totalsForDay(reconDay), r=state.recons.find(x=>x.day===reconDay), v=r?variance(r):null;
    const dayBills=state.invoices.filter(i=>i.status==='paid'&&i.paidAt&&localDay(new Date(i.paidAt))===reconDay);
    const dayGross=dayBills.reduce((s,i)=>s+invoiceTotal(i),0);
    const matched=v&&v.cashDiff===0&&v.bankDiff===0;
    const steps=['Chốt phạm vi ngày','Tổng hợp & phân loại','Nhập số thực nhận','Xử lý ngoại lệ','Quản lý phê duyệt','Khóa sổ'];
    const stepCount=!r?0:r.status==='locked'?6:r.status==='approved'?5:matched?4:r.countedCash!=null&&r.countedBank!=null?3:2;
    return heading('QUY TRÌNH 02','Đối soát doanh thu cuối ngày','Tự tổng hợp giao dịch, so sánh theo phương thức, xử lý sai lệch và khóa sổ sau phê duyệt.',btn('Xuất báo cáo CSV','export','recon','small')+btn('Tạo / cập nhật đối soát','recon-edit',reconDay,'primary'))+
    `<div class="alert neutral">Khoản thu trong ngày = tiền thực nhận đã ghi nhận trong ngày (bao gồm cọc và hoàn tiền nếu có). <b>Doanh thu hóa đơn hoàn tất</b> là chỉ tiêu riêng; không cộng trùng tiền cọc vào khoản thu.</div>`+
    `<div class="toolbar"><div class="filters"><span class="small-text">Ngày đối soát</span><input class="date-input" type="date" id="reconDate" value="${reconDay}"></div>${r?tag(r.status,{draft:['Đang đối soát','amber'],approved:['Đã phê duyệt','blue'],locked:['Đã khóa sổ','green']}):tag('Chưa mở kỳ',{'Chưa mở kỳ':['Chưa mở kỳ','grey']})}</div>`+
    `<div class="stats-grid">${stat('Đã thu bằng tiền mặt',money(t.cash),'Từ các phiếu thu đã ghi nhận','▣')}${stat('Đã thu qua ngân hàng',money(t.bank),'Chỉ tính khoản có xác nhận thủ công','⇄','blue')}${stat('Tổng tiền thu ghi nhận',money(t.cash+t.bank),`${t.count} dòng giao dịch thu/hoàn`,'↗')}${stat('Doanh thu hóa đơn hoàn tất',money(dayGross),`${dayBills.length} hóa đơn chốt trong ngày`,'▤','amber')}</div>`+
    `<section class="surface" style="margin-bottom:20px"><div class="panel-title">Tiến trình đối soát To-Be</div><div class="step-list">${steps.map((s,i)=>`<div class="step ${i<stepCount?'done':i===stepCount?'current':''}">${i+1}. ${s}</div>`).join('')}</div><p class="inline-note">Nhân viên ghi nhận số tiền kiểm đếm; quản lý mới được phê duyệt báo cáo và khóa sổ. Phân quyền tại FE chỉ để trình diễn.</p></section>`+
    `<div class="layout-2"><section class="surface"><div class="panel-head"><div class="panel-title">Bảng đối chiếu theo phương thức</div>${btn('Nhập số kiểm đếm','recon-edit',reconDay,'small soft')}</div><div class="table-wrap"><table><thead><tr><th>Phương thức</th><th>Hệ thống</th><th>Thực nhận nhập vào</th><th>Chênh lệch</th></tr></thead><tbody>${[['Tiền mặt',t.cash,r?.countedCash,v?.cashDiff],['Chuyển khoản',t.bank,r?.countedBank,v?.bankDiff]].map(x=>`<tr><td class="strong">${x[0]}</td><td>${money(x[1])}</td><td>${x[2]==null?'<span class="muted">Chưa nhập</span>':money(x[2])}</td><td>${x[3]==null?'<span class="muted">—</span>':x[3]===0?tag('Khớp',{Khớp:['Khớp','green']}):`<strong style="color:#b85a47">${money(x[3])}</strong>`}</td></tr>`).join('')}</tbody></table></div>${r?`<div class="divider"></div><p class="small-text">Ghi chú kiểm đếm: ${esc(r.notes||'Chưa ghi')} · Cập nhật ${niceTime(r.updatedAt)}</p>`:''}</section><section class="surface"><div class="panel-title">Phê duyệt & khóa sổ</div><div class="divider"></div>${!r?'<p class="small-text">Chưa tạo phiên đối soát. Hãy nhập tiền thực nhận để kiểm tra sai lệch.</p>':`<div class="kpi-line"><span>Trạng thái phiên</span>${tag(r.status,{draft:['Đang xử lý','amber'],approved:['Đã duyệt','blue'],locked:['Đã khóa','green']})}</div><div class="kpi-line"><span>Số dư chênh lệch</span><strong>${v.cashDiff==null||v.bankDiff==null?'Chưa nhập':money(v.cashDiff+v.bankDiff)}</strong></div><div class="kpi-line"><span>Người phê duyệt</span><strong>${esc(r.approvedBy||'Chưa có')}</strong></div><div class="divider"></div>${r.status==='draft'?btn('Quản lý phê duyệt','recon-approve',r.day,'full primary'):''}${r.status==='approved'?btn('Khóa sổ ngày','recon-lock',r.day,'full primary'):''}${r.status==='locked'?'<div class="alert">Đã khóa sổ. Mọi giao dịch mới cho ngày này được chặn trong bản demo.</div>':''}<p class="inline-note" style="margin-top:12px">Không thể duyệt khi còn chênh lệch, thiếu số kiểm đếm hoặc còn ngoại lệ chưa giải quyết.</p>`}</section></div>`+
    `<section class="surface" style="margin-top:20px"><div class="panel-head"><div class="panel-title">Chi tiết các khoản thu / hoàn tiền</div><span class="small-text">${t.count} dòng</span></div><div class="table-wrap"><table><thead><tr><th>Thời gian</th><th>Hóa đơn</th><th>Loại thu</th><th>Phương thức</th><th>Mã tham chiếu</th><th>Số tiền</th></tr></thead><tbody>${dayReceipts(reconDay).map(x=>`<tr><td>${niceTime(x.createdAt)}</td><td>${esc(x.invoiceId)}</td><td>${x.type==='deposit'?'Tiền cọc':x.type==='refund'?'Hoàn tiền':'Tất toán'}</td><td>${x.method==='cash'?'Tiền mặt':'Chuyển khoản'}</td><td>${esc(x.reference||'—')}</td><td class="money">${money(x.amount)}</td></tr>`).join('')||'<tr><td colspan="6">Chưa có khoản thu trong ngày</td></tr>'}</tbody></table></div></section>${FOOT}`;
  }
  function renderIssues(){
    const issues=state.issues.slice().reverse();
    return heading('KIỂM SOÁT NGOẠI LỆ','Yêu cầu & chênh lệch','Các trường hợp cần người kiểm tra, bổ sung chứng từ và phê duyệt theo phân quyền.',btn('Đến đối soát','goto','doi-soat','primary'))+
    `<div class="alert warn">Bản To-Be quy định AI có thể hỗ trợ <b>gợi ý nguyên nhân</b>, nhưng không tự phê duyệt hay sửa tiền. Demo chưa tích hợp AI; thông tin nguyên nhân phải do nhân viên nhập, quản lý quyết định.</div>`+
    `${issues.length?issues.map(x=>{const inv=x.invoiceId?getInvoice(x.invoiceId):null;const r=x.day?state.recons.find(r=>r.day===x.day):null;const v=r?variance(r):null;return `<article class="issue-card"><div class="issue-head"><h3>${x.kind==='refund'?'Yêu cầu hủy & hoàn tiền':`Chênh lệch kỳ ${x.day}`} · ${esc(x.id)}</h3>${tag(x.status,issueStages)}</div><div class="issue-meta">${niceTime(x.createdAt)} · ${x.kind==='refund'?'Cần quản lý phê duyệt yêu cầu hoàn tiền':`Ngày ${x.day}`}</div><div class="issue-body">${x.kind==='refund'?`Khách hàng: <b>${esc(inv?.customer||'—')}</b> · Số tiền đề nghị hoàn: <b>${money(x.amount)}</b>.`:`Đối soát tiền mặt: <b>${v?.cashDiff==null?'Chưa nhập':money(v.cashDiff)}</b>; chuyển khoản: <b>${v?.bankDiff==null?'Chưa nhập':money(v.bankDiff)}</b>.`}<br><span class="muted">Nguyên nhân/chứng từ: ${esc(x.note||'Chưa bổ sung')}</span></div><div class="btn-row">${x.status==='pending'?btn('Bổ sung chứng từ','issue-note',x.id,'small'):''}${x.status==='pending'?btn('Quản lý duyệt','issue-approve',x.id,'small primary'):''}${x.kind==='refund'&&x.status==='approved'?btn('Xác nhận đã hoàn tiền','refund-finish',x.id,'small primary'):''}</div></article>`;}).join(''):empty('Chưa có yêu cầu xử lý ngoại lệ. Có thể tạo trường hợp chênh lệch tại màn hình đối soát.')}${FOOT}`;
  }
  function renderAudit(){return heading('TRUY VẾT & KIỂM SOÁT','Nhật ký thao tác','Theo dõi ai đã thay đổi trạng thái hóa đơn, khoản thu và phê duyệt.',btn('Xuất nhật ký CSV','export','audit','small')+btn('Khôi phục dữ liệu demo','reset','','small danger'))+
    `<section class="surface"><div class="activity-list">${recent(100)}</div></section>${FOOT}`;}
  function render(){
    const valid=['tong-quan','lich-san','hoa-don','kho-hang','doi-soat','ngoai-le','nhat-ky'];
    let target=location.hash.slice(1)||'tong-quan';if(!valid.includes(target))target='tong-quan';page=target;
    const pages={'tong-quan':['Bảng điều khiển',renderDashboard],'lich-san':['Lịch & đặt sân',renderSchedule],'hoa-don':['Hóa đơn & thanh toán',renderInvoices],'kho-hang':['Kho & dịch vụ',renderInventory],'doi-soat':['Đối soát cuối ngày',renderReconcile],'ngoai-le':['Yêu cầu & ngoại lệ',renderIssues],'nhat-ky':['Nhật ký thao tác',renderAudit]};
    $('appContent').innerHTML=pages[page][1]();$('breadcrumbCurrent').textContent=pages[page][0];
    document.querySelectorAll('[data-page]').forEach(x=>{x.classList.toggle('active',x.dataset.page===page);if(x.dataset.page===page)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});
    $('navBillCount').textContent=countOpen();$('navIssueCount').textContent=unresolvedIssues();$('roleSelect').value=role;
    $('sidebar').classList.remove('open');
  }
  function navigate(p){location.hash=p; if(location.hash.slice(1)===p)render();window.scrollTo({top:0,behavior:'smooth'});}
  function openModal(title,body,footer='',wide=false){$('modalRoot').innerHTML=`<div class="modal-backdrop" id="backdrop" role="presentation"><section class="modal-card ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-heading"><h2 id="modalTitle">${title}</h2><button type="button" class="modal-close" data-action="modal-close" aria-label="Đóng">×</button></div>${body}<div class="modal-footer">${footer||btn('Đóng','modal-close')}</div></section></div>`;}
  function closeModal(){$('modalRoot').innerHTML='';}
  function field(label,name,kind='text',value='',extra=''){return `<div class="field"><label for="m_${name}">${label}</label><input id="m_${name}" name="${name}" type="${kind}" value="${esc(value)}" ${extra}></div>`;}
  function selectField(label,name,options,selected=''){return `<div class="field"><label for="m_${name}">${label}</label><select id="m_${name}" name="${name}">${options.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(selected)?'selected':''}>${esc(o[1])}</option>`).join('')}</select></div>`;}
  function formBtns(formid,text){return `${btn('Hủy','modal-close') }<button type="submit" form="${formid}" class="btn primary">${text}</button>`;}
  function makeForm(id,fields,description=''){return `${description?`<p class="modal-description">${description}</p>`:''}<form id="${id}" class="form-grid">${fields}</form>`;}
  function bookingModal(pid=''){
    const opts=pitchList.map(p=>[p.id,`${p.name} · ${p.type} người · ${money(pitchRates[p.type])}/giờ (giá demo)`]);
    const fields=selectField('Chọn sân','pitch',opts,pid||1)+field('Ngày sử dụng','date','date',selectedDay,`min="${localDay()}"`)+field('Bắt đầu','start','time','18:00', 'required')+field('Kết thúc','end','time','19:30','required')+field('Tên người đặt / đội bóng','name','text','','required maxlength="100"')+field('Số điện thoại','phone','tel','','required maxlength="20"')+
      selectField('Tỷ lệ cọc dự kiến','rate',[[0,'Không yêu cầu cọc'],[40,'40%'],[50,'50%'],[60,'60%']],50)+`<div class="field"><label>Nguyên tắc</label><p class="field-hint">Lúc đặt sân hệ thống chỉ xác định <b>cọc phải thu</b>. Chỉ khấu trừ sau khi nhân viên đã xác nhận nhận cọc hợp lệ.</p></div>`;
    openModal('Tạo lượt đặt sân',makeForm('formBooking',fields,'Hóa đơn nháp được khởi tạo cùng mã lượt đặt. Hệ thống sẽ chặn lịch trùng sân.'),formBtns('formBooking','Tạo lượt đặt'),true);
  }
  function pitchDetailModal(pid){
    const p=pitchOf(pid),b=state.bookings.filter(b=>b.pitchId===p.id&&b.date===selectedDay);const content=`<p class="modal-description">Lịch sân ${p.name}, ngày ${dayLabel(selectedDay)}. Đơn giá bên dưới là mẫu để thử chức năng.</p><div class="tone-soft">Đơn giá: <b>${money(pitchRates[p.type])}/giờ</b> · Loại ${p.type} người</div><div class="divider"></div>${b.length?b.map(x=>`<div class="kpi-line"><span><b>${x.start}–${x.end}</b> · ${esc(x.name)}<br>${tag(x.status,stages)}</span><span>${btn('Xem hóa đơn','invoice',x.invoiceId,'small')}</span></div>`).join(''):empty('Chưa có lịch trong ngày')}`;
    openModal(`${p.name} · Lịch chi tiết`,content,`${btn('Đóng','modal-close')}${btn('Đặt sân này','booking',pid,'primary')}`);
  }
  function invoiceModal(id){
    const inv=getInvoice(id);if(!inv){toast('Không tìm thấy hóa đơn',true);return;}
    const b=inv.bookingId?getBooking(inv.bookingId):null, sum=invoiceTotal(inv), paid=paidAmount(inv), deposit=depositAmount(inv), remaining=due(inv);
    const lines=inv.items.map(x=>`<div class="moneyline"><span>${esc(x.name)} <span class="muted">×${x.qty}</span></span><b>${money(x.unitPrice*x.qty)}</b></div>`).join('');
    const receipt=`<div class="receipt"><h3>PHIẾU TÍNH TIỀN · ${esc(inv.id)}</h3><p class="receipt-note">Bản xem trước · Chỉ phát hành chứng từ khi đã hoàn tất thanh toán</p>${lines}<div class="divider"></div><div class="moneyline"><span>Tổng tiền hàng và dịch vụ</span><strong>${money(sum)}</strong></div><div class="moneyline"><span>Tiền cọc đã xác minh</span><strong>− ${money(deposit)}</strong></div><div class="moneyline"><span>Đã thu khác (nếu có)</span><strong>− ${money(paid-deposit)}</strong></div><div class="moneyline"><strong>Cần thanh toán</strong><strong class="total-amount">${money(remaining)}</strong></div></div>`;
    const actionButtons=[];
    if(b&&b.status==='booked')actionButtons.push(btn('Nhận sân','start',b.id,'small'));
    if(b&&b.status==='using')actionButtons.push(btn('Trả sân / chốt','release',b.id,'small'));
    if(b&&['booked','using'].includes(b.status)&&inv.status==='draft'){actionButtons.push(btn('Ghi nhận tiền cọc','deposit',inv.id,'small soft'));actionButtons.push(btn('Yêu cầu hủy','cancel',b.id,'small danger'));}
    if(['draft','awaiting'].includes(inv.status))actionButtons.push(btn('+ Thêm sản phẩm','sale',`target:${inv.id}`,'small'));
    if(inv.status==='awaiting')actionButtons.push(btn('Thanh toán tiền mặt','cash',inv.id,'small primary'),btn('Tạo yêu cầu QR','qr',inv.id,'small soft'));
    if(inv.status==='qr_pending')actionButtons.push(btn('Nhập chứng từ ngân hàng','bank-confirm',inv.id,'small primary'),btn('Đưa về chờ thanh toán','qr-reset',inv.id,'small'));
    if(inv.status==='paid')actionButtons.push(btn('In chứng từ','print',inv.id,'small'));
    const qr=inv.status==='qr_pending'?`<div class="alert warn" style="margin-top:14px"><b>Yêu cầu thanh toán đang chờ</b><br>Mã tham chiếu: <strong>${esc(inv.qrRef||'')}</strong><br>Đây là mã mô phỏng để thiết kế luồng Receive Task. Chưa có mã QR ngân hàng thật hoặc callback được xác thực. Không được ghi nhận đã chuyển khoản chỉ vì đã tạo yêu cầu.</div>`:'';
    openModal('Chi tiết hóa đơn',`<div class="panel-head"><div><div class="overline">${b?'DỊCH VỤ SÂN':'HÓA ĐƠN KHÁCH LẺ'}</div><div class="panel-title" style="margin-top:7px">${esc(inv.customer)}</div><p class="small-text">${b?`${pitchOf(b.pitchId).name} · ${b.date} · ${b.start}–${b.end}`:esc(inv.id)}</p></div>${tag(inv.status)}</div>${receipt}${qr}<div class="btn-row" style="margin-top:15px">${actionButtons.join('')}</div><div class="divider"></div><div class="panel-title">Lịch sử khoản thu</div>${receiptsFor(inv).map(r=>`<div class="moneyline"><span>${r.type==='deposit'?'Tiền cọc':r.type==='refund'?'Hoàn tiền':'Tất toán'} · ${r.method==='cash'?'Tiền mặt':'Chuyển khoản'}<br><span class="small-text">${niceTime(r.createdAt)} · ${esc(r.reference)}</span></span><strong>${money(r.amount)}</strong></div>`).join('')||'<p class="small-text">Chưa có khoản thu được xác minh.</p>'}`,btn('Đóng','modal-close'),true);
  }
  function saleModal(id=''){
    let targetId=id.startsWith('target:')?id.slice(7):'';
    const open=state.invoices.filter(i=>['draft','awaiting'].includes(i.status));
    const options=[['retail','Khách lẻ · tạo hóa đơn mới'],...open.map(i=>[i.id,`${i.id} · ${i.customer}`])];
    const items=state.products.map(p=>[p.id,`${p.name} · ${money(p.price)} · tồn ${p.stock}`]);
    const fields=selectField('Sản phẩm','product',items,id.startsWith('target:')?'':id)+field('Số lượng','qty','number',1,'required min="1" step="1"')+selectField('Gộp vào hóa đơn','invoice',options,targetId||'retail');
    openModal('Bán sản phẩm / thêm dịch vụ',makeForm('formSale',fields,'Bản demo kiểm tra tồn kho trước khi thêm và lưu thay đổi cùng hóa đơn. Cần backend transaction khi chạy nhiều máy.'),formBtns('formSale','Xác nhận bán'));
  }
  function depositModal(id){
    const inv=getInvoice(id),b=getBooking(inv.bookingId),target=invoiceTotal(inv.items.length?inv:inv)*(Number(b.depositRate)/100),already=depositAmount(inv);
    const fields=field('Số tiền cọc thực thu (đ)','amount','number',Math.max(0,Math.round(target-already)),`required min="1" max="${Math.max(0,target-already)}"`)+selectField('Phương thức nhận cọc','method',[['cash','Tiền mặt'],['bank','Chuyển khoản · phải có mã đối chiếu']],'cash')+field('Mã chứng từ / tham chiếu','ref','text','','maxlength="80"')+
      `<div class="field full"><p class="field-hint">Tổng cọc dự kiến: ${money(target)} · đã ghi nhận: ${money(already)}. Không coi tiền cọc dự kiến là đã thanh toán.</p></div>`;
    openModal('Xác nhận tiền cọc',makeForm('formDeposit',fields),formBtns('formDeposit','Ghi nhận đã thu'));
    $('formDeposit').dataset.invoice=id;
  }
  function cashModal(id){
    const inv=getInvoice(id);const fields=field('Tiền khách đưa (đ)','cash','number',due(inv),`required min="${due(inv)}"`)+field('Mã phiếu thu nội bộ','ref','text',uid('TM'),'required');
    openModal('Xác nhận thu tiền mặt',makeForm('formCash',fields,`Cần thanh toán: <b>${money(due(inv))}</b>. Nhân viên phải kiểm đếm tiền thật trước khi xác nhận; không có tự động hóa bước kiểm đếm.`),formBtns('formCash','Xác nhận đã thu'));
    $('formCash').dataset.invoice=id;
  }
  function bankModal(id){
    const inv=getInvoice(id);const fields=field('Mã giao dịch trên chứng từ ngân hàng','ref','text','','required minlength="5" maxlength="90"')+field('Số tiền đã đối chiếu (đ)','amount','number',due(inv),`required min="${due(inv)}" max="${due(inv)}"`);
    openModal('Xác minh chuyển khoản thủ công',`<div class="alert warn"><b>Quan trọng:</b> Frontend không thể tự kiểm chứng tiền vào tài khoản. Chỉ xác nhận sau khi nhân viên đối chiếu thực tế: đúng người nhận, số tiền, mã giao dịch và trạng thái thành công. Khi tích hợp thật, backend phải kiểm chứng callback/chữ ký và chống nhận trùng.</div>`+makeForm('formBank',fields),formBtns('formBank','Đã đối chiếu chứng từ'));
    $('formBank').dataset.invoice=id;
  }
  function reconModal(day){
    const r=state.recons.find(x=>x.day===day),t=totalsForDay(day);
    const fields=field('Ngày đối soát','day','date',day,'readonly')+field('Tiền mặt kiểm đếm thực tế (đ)','cash','number',r?.countedCash??'','required min="0"')+field('Số tiền chuyển khoản đối chiếu thực tế (đ)','bank','number',r?.countedBank??'','required min="0"')+
      `<div class="field"><label>Số liệu từ hệ thống</label><div class="tone-soft" style="font-size:11px">Tiền mặt: <b>${money(t.cash)}</b><br>Chuyển khoản: <b>${money(t.bank)}</b></div></div>`+
      `<div class="field full"><label for="m_notes">Ghi chú / căn cứ kiểm đếm</label><textarea id="m_notes" name="notes" placeholder="VD: Đã kiểm tiền két; đối chiếu ứng dụng ngân hàng theo ngày...">${esc(r?.notes||'')}</textarea></div>`;
    openModal(r?'Cập nhật đối soát':'Khởi tạo đối soát',makeForm('formRecon',fields,'Nhập số thực tế qua kiểm đếm thủ công. Phần mềm tự so sánh và tạo yêu cầu giải trình khi lệch.'),formBtns('formRecon',r?'Lưu đối soát':'Chốt phạm vi và lập đối soát'),true);
  }
  function issueNoteModal(id){
    const i=state.issues.find(x=>x.id===id);const fields=`<div class="field full"><label for="m_note">Nguyên nhân & bằng chứng</label><textarea id="m_note" name="note" required minlength="6" placeholder="Mô tả kết quả kiểm tra, mã chứng từ, phương án xử lý...">${esc(i.note||'')}</textarea><p class="field-hint">AI chưa tích hợp. Nhân viên tự ghi căn cứ; quản lý chịu trách nhiệm phê duyệt.</p></div>`;
    openModal('Bổ sung chứng từ / giải trình',makeForm('formIssueNote',fields),formBtns('formIssueNote','Lưu giải trình'));$('formIssueNote').dataset.issue=id;
  }
  function restockModal(){
    const fields=selectField('Chọn sản phẩm','product',state.products.map(p=>[p.id,`${p.name} · tồn ${p.stock}`]))+field('Số lượng nhập thêm','qty','number',10,'required min="1" step="1"')+field('Mã phiếu nhập / nguồn hàng','ref','text','','required');
    openModal('Nhập thêm tồn kho (demo)',makeForm('formRestock',fields),formBtns('formRestock','Cập nhật tồn kho'));
  }
  function issueRefundModal(id){
    const i=state.issues.find(x=>x.id===id);const fields=selectField('Phương thức hoàn thực tế','method',[['cash','Tiền mặt'],['bank','Chuyển khoản']],'cash')+field('Mã phiếu hoàn / giao dịch','ref','text','','required minlength="5" maxlength="80"')+
      `<div class="field full"><p class="field-hint">Khoản phải hoàn theo yêu cầu được quản lý duyệt: <b>${money(i.amount)}</b>. Chỉ xác nhận sau khi đã thực sự hoàn tiền; FE không chuyển tiền được.</p></div>`;
    openModal('Ghi nhận đã thực hiện hoàn tiền',makeForm('formRefund',fields),formBtns('formRefund','Xác nhận đã hoàn'));
    $('formRefund').dataset.issue=id;
  }
  function receiptFor(inv,type,method,amount,reference){state.receipts.push({id:uid('THU'),invoiceId:inv.id,type,method,amount,reference,verified:'manual',createdAt:new Date().toISOString()});}
  function ensureOpenDay(){if(isLocked(localDay()))throw new Error('Ngày hiện tại đã khóa sổ. Không thể tạo phiếu thu/chi mới trong kỳ đã khóa.');}
  function finalize(inv,method,amount,ref){
    if(inv.status==='paid'||inv.status==='cancelled')throw new Error('Hóa đơn đã hoàn tất hoặc đã hủy.');
    ensureOpenDay();
    const owed=due(inv);
    if(amount!==owed||amount<=0)throw new Error('Số tiền ghi nhận không khớp khoản phải thu.');
    receiptFor(inv,'settlement',method,amount,ref);
    inv.status='paid';inv.paidAt=new Date().toISOString();delete inv.qrRef;
    log(`Ghi nhận thanh toán ${inv.id}: ${money(amount)} qua ${method==='cash'?'tiền mặt':'chuyển khoản xác minh thủ công'} (${ref})`);
    closeModal();save();toast('Hóa đơn đã hoàn tất. Đã ghi nhật ký và khoản thu.');
  }
  function guarded(fn){try{fn();}catch(e){toast(e?.message||'Không thể thực hiện thao tác',true);}}
  function processAction(action,id){
    guarded(()=>{
      if(action==='goto'){closeModal();navigate(id);return;}
      if(action==='modal-close'){closeModal();return;}
      if(action==='day'){selectedDay=id;render();return;}
      if(action==='pitch-filter'){pitchFilter=id;render();return;}
      if(action==='bill-filter'){billFilter=id;render();return;}
      if(action==='booking'){bookingModal(id);return;}
      if(action==='pitch-detail'){pitchDetailModal(id);return;}
      if(action==='invoice'){invoiceModal(id);return;}
      if(action==='sale'){saleModal(id);return;}
      if(action==='restock'){restockModal();return;}
      if(action==='deposit') {const inv=getInvoice(id), b=getBooking(inv?.bookingId);if(!inv||!b||!['booked','using'].includes(b.status))throw new Error('Chỉ thu cọc cho lượt đặt sân còn hiệu lực.');const remain=invoiceTotal(inv)*b.depositRate/100-depositAmount(inv);if(remain<=0)throw new Error('Đã thu đủ số cọc dự kiến.');depositModal(id);return;}
      if(action==='start'){
        const b=getBooking(id);if(!b||b.status!=='booked')throw new Error('Lượt đặt không ở trạng thái chờ nhận sân.');
        if(b.date!==localDay())throw new Error('Demo chỉ hỗ trợ nhận sân đúng ngày hiện tại.');
        if(isLocked(localDay()))throw new Error('Ngày hiện tại đã khóa sổ.');
        b.status='using';log(`Nhận sân ${pitchOf(b.pitchId).name}, khách ${b.name}, lượt ${b.id}`);closeModal();save();toast('Đã nhận sân. Hóa đơn nháp được giữ nguyên.');return;
      }
      if(action==='release'){
        const b=getBooking(id);if(!b||b.status!=='using')throw new Error('Chỉ trả sân cho lượt đang sử dụng.');
        if(isLocked(localDay()))throw new Error('Ngày đã khóa sổ.');
        b.status='completed';const inv=getInvoice(b.invoiceId);if(!inv)throw new Error('Không tìm thấy hóa đơn của lượt đặt.');
        if(due(inv)===0){inv.status='paid';inv.paidAt=new Date().toISOString();log(`Chốt hóa đơn ${inv.id} bằng tiền cọc đã xác minh (không ghi thêm khoản thu)`);}else{inv.status='awaiting';log(`Khách trả ${pitchOf(b.pitchId).name}, chốt hóa đơn ${inv.id}, cần thu ${money(due(inv))}`);}
        closeModal();save();invoiceModal(inv.id);toast('Đã chốt sân và tính dư cọc tự động.');return;
      }
      if(action==='cash') {const i=getInvoice(id);if(i?.status!=='awaiting')throw new Error('Hóa đơn chưa ở trạng thái chờ thanh toán.');cashModal(id);return;}
      if(action==='qr') {
        const inv=getInvoice(id);if(inv?.status!=='awaiting'||due(inv)<=0)throw new Error('Chỉ được tạo yêu cầu QR cho hóa đơn đang chờ thanh toán.');
        inv.status='qr_pending';inv.qrRef=`PITCH-${Date.now().toString(36).toUpperCase()}`;
        log(`Tạo yêu cầu QR (mô phỏng) ${inv.qrRef} cho hóa đơn ${inv.id}, chưa ghi nhận thu tiền`);
        save();invoiceModal(id);toast('Đã tạo mã tham chiếu demo. Chưa có giao dịch ngân hàng.');return;
      }
      if(action==='qr-reset'){
        const inv=getInvoice(id);if(inv.status!=='qr_pending')throw new Error('Hóa đơn không ở trạng thái QR đang chờ.');
        inv.status='awaiting';delete inv.qrRef;log(`Hủy yêu cầu QR chưa xác minh của ${id}`);save();invoiceModal(id);return;
      }
      if(action==='bank-confirm'){if(getInvoice(id)?.status!=='qr_pending')throw new Error('Không có yêu cầu QR đang chờ.');bankModal(id);return;}
      if(action==='recon-edit'){if(isLocked(id))throw new Error('Kỳ này đã khóa sổ, không được sửa.');reconModal(id);return;}
      if(action==='recon-approve'){
        if(role!=='manager')throw new Error('Chỉ vai trò Quản lý được phê duyệt.');
        const r=state.recons.find(x=>x.day===id);if(!r||r.status!=='draft')throw new Error('Phiên đối soát không hợp lệ.');
        const v=variance(r);if(v.cashDiff!==0||v.bankDiff!==0)throw new Error('Số tiền thực nhận còn chênh lệch hoặc chưa nhập.');
        if(state.issues.some(x=>x.kind==='recon'&&x.day===id&&x.status!=='resolved'))throw new Error('Còn ngoại lệ chưa được quản lý xác nhận đã giải quyết.');
        r.status='approved';r.approvedBy=roleName();r.approvedAt=new Date().toISOString();log(`Phê duyệt đối soát ngày ${id}`);save();toast('Đã phê duyệt phiên đối soát.');return;
      }
      if(action==='recon-lock'){
        if(role!=='manager')throw new Error('Chỉ Quản lý được khóa sổ.');
        const r=state.recons.find(x=>x.day===id);if(r?.status!=='approved')throw new Error('Phải được phê duyệt trước khi khóa sổ.');
        const v=variance(r);if(v.cashDiff!==0||v.bankDiff!==0)throw new Error('Có biến động số liệu sau khi phê duyệt; cần kiểm tra lại.');
        r.status='locked';r.lockedAt=new Date().toISOString();log(`Khóa sổ ngày ${id} sau phê duyệt`);save();toast('Đã khóa sổ kỳ đối soát.');return;
      }
      if(action==='cancel'){
        const b=getBooking(id);if(!b||!['booked','using'].includes(b.status))throw new Error('Chỉ hủy lượt đặt chưa hoàn thành dịch vụ.');
        const inv=getInvoice(b.invoiceId);const amount=paidAmount(inv);
        if(amount===0){
          if(!confirm('Hủy lượt đặt sân chưa thu tiền? Thao tác sẽ được ghi nhật ký.'))return;
          returnProducts(inv);inv.status='cancelled';b.status='cancelled';log(`Hủy lượt đặt ${b.id} và hóa đơn nháp ${inv.id} (chưa thu tiền)`);closeModal();save();toast('Đã hủy lượt đặt và ghi nhật ký.');return;
        }
        if(state.issues.some(x=>x.kind==='refund'&&x.invoiceId===inv.id&&x.status!=='resolved'))throw new Error('Đã có yêu cầu hoàn tiền chưa kết thúc.');
        state.issues.push({id:uid('YC'),kind:'refund',invoiceId:inv.id,amount,note:'',status:'pending',createdAt:new Date().toISOString()});b.status='cancel_review';log(`Tạo yêu cầu hủy/hoàn tiền ${money(amount)} cho ${inv.id}; chờ phê duyệt`);closeModal();save();toast('Đã tạo yêu cầu duyệt hoàn tiền. Chưa tự động hoàn hoặc hủy hóa đơn.');return;
      }
      if(action==='issue-note'){issueNoteModal(id);return;}
      if(action==='issue-approve'){
        if(role!=='manager')throw new Error('Chỉ Quản lý được phê duyệt ngoại lệ.');
        const i=state.issues.find(x=>x.id===id);if(!i||i.status!=='pending')throw new Error('Yêu cầu không ở trạng thái chờ xử lý.');
        if(!i.note||i.note.trim().length<6)throw new Error('Cần nhân viên bổ sung nguyên nhân và chứng từ trước khi duyệt.');
        if(i.kind==='recon'){
          const r=state.recons.find(x=>x.day===i.day), v=r?variance(r):null;
          if(!v||v.cashDiff!==0||v.bankDiff!==0)throw new Error('Đối soát vẫn lệch. Cần xử lý/cập nhật số tiền thực nhận rồi mới đánh dấu đã giải quyết.');
          i.status='resolved';log(`Quản lý đã xác nhận giải quyết chênh lệch kỳ ${i.day}, mã ${i.id}`);
        }else {i.status='approved';log(`Quản lý phê duyệt đề nghị hoàn tiền ${i.id} · ${money(i.amount)}; chưa hoàn thực tế`);}
        save();toast('Đã cập nhật trạng thái yêu cầu theo phân quyền.');return;
      }
      if(action==='refund-finish'){
        const i=state.issues.find(x=>x.id===id);if(!i||i.kind!=='refund'||i.status!=='approved')throw new Error('Yêu cầu hoàn tiền chưa được quản lý phê duyệt.');issueRefundModal(id);return;
      }
      if(action==='print'){const i=getInvoice(id);if(i?.status!=='paid')throw new Error('Chứng từ chỉ được in khi đã hoàn tất thanh toán.');invoiceModal(id);window.print();return;}
      if(action==='export'){downloadCSV(id);return;}
      if(action==='reset'){if(!confirm('Khôi phục dữ liệu demo ban đầu? Mọi thao tác bạn đã làm ở bản này sẽ bị xóa khỏi localStorage.'))return;state=freshData();store(state);closeModal();render();toast('Đã khôi phục dữ liệu demo.');return;}
    });
  }
  function returnProducts(inv){for(const item of inv.items){if(item.productId){const p=getProduct(item.productId);if(p)p.stock+=item.qty;}}}
  function processForm(form){
    guarded(()=>{
      if(!form.reportValidity())return;
      const data=Object.fromEntries(new FormData(form).entries());
      if(form.id==='formBooking'){
        const pitch=pitchOf(data.pitch),pTime=timeMins(data.start),eTime=timeMins(data.end),day=data.date;
        if(!pitch||!data.name.trim()||!data.phone.trim()||!day)throw new Error('Vui lòng điền đầy đủ thông tin.');
        if(day<localDay())throw new Error('Không nhận đặt sân cho ngày đã qua.');
        if(isLocked(day))throw new Error('Ngày đặt đã bị khóa sổ.');
        if(!Number.isFinite(pTime)||!Number.isFinite(eTime)||pTime>=eTime)throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
        if(state.bookings.some(b=>b.pitchId===pitch.id&&b.date===day&&b.status!=='cancelled'&&pTime<timeMins(b.end)&&eTime>timeMins(b.start)))throw new Error('Sân đã có lịch trùng thời gian này. Vui lòng chọn khung giờ khác.');
        const id=uid('DS').toUpperCase(),invId=uid('HD').toUpperCase(),rate=Number(data.rate);
        const cost=(eTime-pTime)/60*pitchRates[pitch.type];
        state.bookings.push({id,pitchId:pitch.id,name:data.name.trim(),phone:data.phone.trim(),date:day,start:data.start,end:data.end,status:'booked',invoiceId:invId,depositRate:rate});
        state.invoices.push({id:invId,bookingId:id,customer:data.name.trim(),items:[{id:uid('LINE'),name:`Thuê ${pitch.name} · ${data.start}–${data.end}`,qty:1,unitPrice:cost}],status:'draft',createdAt:new Date().toISOString()});
        log(`Tạo lượt đặt ${id} · ${pitch.name} · ${money(cost)}; hóa đơn nháp ${invId}`);
        selectedDay=day;closeModal();save();navigate('lich-san');toast('Đã đặt sân và tạo hóa đơn nháp. Tiền cọc chưa được ghi là đã thu.');return;
      }
      if(form.id==='formSale'){
        const p=getProduct(data.product),qty=Number(data.qty);
        if(!p||!Number.isInteger(qty)||qty<1)throw new Error('Số lượng phải là số nguyên dương.');
        if(qty>p.stock)throw new Error(`Không đủ tồn kho ${p.name}. Hiện có ${p.stock} ${p.unit}.`);
        if(isLocked(localDay()))throw new Error('Ngày hôm nay đã khóa sổ. Không thể ghi giao dịch mới.');
        let inv;
        if(data.invoice==='retail'){
          inv={id:uid('HD').toUpperCase(),bookingId:null,customer:'Khách lẻ',items:[],status:'awaiting',createdAt:new Date().toISOString()};state.invoices.push(inv);
        }else{inv=getInvoice(data.invoice);if(!inv||!['draft','awaiting'].includes(inv.status))throw new Error('Hóa đơn không còn cho phép sửa hàng hóa.');}
        p.stock-=qty;inv.items.push({id:uid('LINE'),productId:p.id,name:p.name,qty,unitPrice:p.price});
        log(`Thêm ${qty} ${p.unit} ${p.name} vào ${inv.id}, tồn còn ${p.stock}`);closeModal();save();invoiceModal(inv.id);toast('Đã thêm sản phẩm vào hóa đơn và giảm tồn kho demo.');return;
      }
      if(form.id==='formRestock'){
        const p=getProduct(data.product),qty=Number(data.qty);if(!p||!Number.isInteger(qty)||qty<1||!data.ref.trim())throw new Error('Thông tin nhập kho không hợp lệ.');
        p.stock+=qty;log(`Nhập kho ${qty} ${p.unit} ${p.name}, phiếu ${data.ref.trim()}`);closeModal();save();toast('Đã cập nhật tồn kho.');return;
      }
      if(form.id==='formDeposit'){
        ensureOpenDay();const inv=getInvoice(form.dataset.invoice),b=getBooking(inv?.bookingId),amount=Number(data.amount);
        if(!inv||!b||!['booked','using'].includes(b.status))throw new Error('Không thể ghi nhận cọc cho lượt này.');
        const remain=invoiceTotal(inv)*b.depositRate/100-depositAmount(inv);
        if(!Number.isFinite(amount)||amount<=0||amount>remain)throw new Error('Số tiền cọc vượt hạn mức dự kiến hoặc không hợp lệ.');
        if(data.method==='bank'&&data.ref.trim().length<5)throw new Error('Chuyển khoản cần mã chứng từ đối chiếu hợp lệ.');
        const ref=data.ref.trim()||uid('TMCOC');
        if(state.receipts.some(r=>r.reference===ref&&r.method===data.method))throw new Error('Mã chứng từ đã có, tránh ghi nhận trùng.');
        receiptFor(inv,'deposit',data.method,amount,ref);log(`Xác nhận cọc ${money(amount)} vào ${inv.id} bằng ${data.method==='cash'?'tiền mặt':'chuyển khoản đã đối chiếu'} · ${ref}`);
        closeModal();save();invoiceModal(inv.id);toast('Đã ghi nhận tiền cọc có chứng từ.');return;
      }
      if(form.id==='formCash'){
        const inv=getInvoice(form.dataset.invoice);if(!inv||inv.status!=='awaiting')throw new Error('Hóa đơn không còn chờ thanh toán.');
        const amount=Number(data.cash),owed=due(inv);if(!Number.isFinite(amount)||amount<owed)throw new Error('Tiền khách đưa phải đủ số cần thu.');
        if(!data.ref.trim())throw new Error('Cần mã phiếu thu tiền mặt.');
        finalize(inv,'cash',owed,data.ref.trim());if(amount>owed)toast(`Đã thu ${money(owed)}; tiền trả lại khách: ${money(amount-owed)}.`);return;
      }
      if(form.id==='formBank'){
        const inv=getInvoice(form.dataset.invoice),amount=Number(data.amount),ref=data.ref.trim();
        if(!inv||inv.status!=='qr_pending')throw new Error('Hóa đơn không còn chờ đối soát.');
        if(ref.length<5)throw new Error('Mã giao dịch thực tế phải có ít nhất 5 ký tự.');
        if(state.receipts.some(r=>r.method==='bank'&&r.reference===ref))throw new Error('Mã giao dịch ngân hàng đã được ghi nhận.');
        finalize(inv,'bank',amount,ref);return;
      }
      if(form.id==='formRecon'){
        const day=data.day;if(isLocked(day))throw new Error('Kỳ đã khóa sổ.');
        const cash=Number(data.cash),bank=Number(data.bank);if(!Number.isFinite(cash)||cash<0||!Number.isFinite(bank)||bank<0||data.cash===''||data.bank==='')throw new Error('Phải nhập số thực nhận hợp lệ cho cả hai phương thức.');
        let r=state.recons.find(r=>r.day===day);if(!r){r={id:uid('DSO'),day,status:'draft',createdAt:new Date().toISOString()};state.recons.push(r);}
        r.countedCash=cash;r.countedBank=bank;r.notes=(data.notes||'').trim();r.status='draft';r.approvedBy=null;r.approvedAt=null;r.updatedAt=new Date().toISOString();
        const v=variance(r);let issue=state.issues.find(i=>i.kind==='recon'&&i.day===day&&i.status!=='resolved');
        if(v.cashDiff!==0||v.bankDiff!==0){
          if(!issue)state.issues.push({id:uid('YC'),kind:'recon',day,status:'pending',note:'',createdAt:new Date().toISOString()});
          else issue.status='pending';
          log(`Lập bảng đối soát ${day}: phát hiện chênh lệch tiền mặt ${money(v.cashDiff)}, chuyển khoản ${money(v.bankDiff)}`);
        }else{log(`Lập/cập nhật đối soát ${day}: số liệu thực nhận khớp dữ liệu hệ thống`);}
        closeModal();save();toast(v.cashDiff!==0||v.bankDiff!==0?'Đã tạo/cập nhật yêu cầu giải trình chênh lệch.':'Số liệu khớp. Có thể chuyển trình quản lý duyệt.');return;
      }
      if(form.id==='formIssueNote'){
        const i=state.issues.find(x=>x.id===form.dataset.issue);if(!i||i.status!=='pending')throw new Error('Không thể cập nhật yêu cầu đã duyệt.');
        if(data.note.trim().length<6)throw new Error('Cần giải trình ít nhất 6 ký tự.');
        i.note=data.note.trim();log(`Bổ sung giải trình/chứng từ cho yêu cầu ${i.id}`);closeModal();save();toast('Đã lưu giải trình để quản lý xem xét.');return;
      }
      if(form.id==='formRefund'){
        ensureOpenDay();const i=state.issues.find(x=>x.id===form.dataset.issue);if(!i||i.status!=='approved'||i.kind!=='refund')throw new Error('Yêu cầu hoàn tiền chưa được duyệt.');
        const inv=getInvoice(i.invoiceId), b=getBooking(inv?.bookingId),ref=data.ref.trim();
        if(ref.length<5)throw new Error('Cần mã chứng từ thực hiện hoàn tiền.');
        if(state.receipts.some(x=>x.reference===ref&&x.method===data.method))throw new Error('Trùng mã chứng từ hoàn tiền.');
        if(paidAmount(inv)!==i.amount)throw new Error('Khoản thu đã thay đổi từ lúc lập yêu cầu, phải đối chiếu lại.');
        receiptFor(inv,'refund',data.method,-i.amount,ref);returnProducts(inv);inv.status='cancelled';b.status='cancelled';i.status='resolved';
        log(`Đã thực hiện hoàn ${money(i.amount)} cho ${inv.id} theo duyệt ${i.id}, chứng từ ${ref}`);closeModal();save();toast('Đã ghi nhận khoản hoàn âm trong sổ và đóng yêu cầu.');return;
      }
    });
  }
  function downloadCSV(kind){
    const rows=kind==='audit'? [['Thời gian','Tác nhân demo','Hành động'],...state.audits.map(a=>[niceTime(a.createdAt),a.actor,a.message])]:
      [['Ngày','Loại','Mã phiếu','Hóa đơn','Phương thức','Số tiền','Mã tham chiếu'],...dayReceipts(reconDay).map(r=>[reconDay,r.type,r.id,r.invoiceId,r.method,r.amount,r.reference])];
    const safeCell = x=>{const s=String(x??'');const noFormula=/^[=+@\-\t\r]/.test(s.trimStart())?`'${s}`:s;return `"${noFormula.replace(/"/g,'""')}"`;};
    const csv='\ufeff'+rows.map(row=>row.map(safeCell).join(',')).join('\r\n');
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    a.href=url;a.download=kind==='audit'?'pitchpro-nhat-ky.csv':`pitchpro-doi-soat-${reconDay}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.addEventListener('click',(event)=>{
    const btn=event.target.closest('[data-action]');if(btn){event.preventDefault();processAction(btn.dataset.action,btn.dataset.id||'');}
    if(event.target.id==='backdrop')closeModal();
  });
  document.addEventListener('submit',(event)=>{if(event.target.matches('#modalRoot form')){event.preventDefault();processForm(event.target);}});
  document.addEventListener('change',(event)=>{if(event.target.id==='scheduleDate'){selectedDay=event.target.value;render();}if(event.target.id==='reconDate'){reconDay=event.target.value;render();}});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&$('modalRoot').innerHTML)closeModal();});
  $('roleSelect').addEventListener('change',e=>{role=e.target.value;toast(`Đã chuyển vai trò giao diện sang ${roleName()}. Đây không phải xác thực người dùng.`);render();});
  $('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  window.addEventListener('hashchange',render);
  render();
})();
