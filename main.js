// 平台列表
const PLATFORMS = ['抖音','快手','小红书','知乎','网易号','搜狐号','今日头条','B站'];
// DOM 缓存
const $ = id => document.getElementById(id);
const keywordInput = $('keywordInput'),
      curLen = $('curLen'),
      collapseBtn = $('collapseBtn'),
      advPanel = $('advPanel'),
      imgCount = $('imgCount'),
      videoCount = $('videoCount'),
      onlyCC0 = $('onlyCC0'),
      sourceGroup = $('sourceGroup'),
      startBtn = $('startBtn'),
      statusRow = $('statusRow'),
      progressBar = $('progressBar'),
      progressText = $('progressText'),
      errorTip = $('errorTip'),
      resultArea = $('resultArea'),
      summary = $('summary'),
      resultTable = $('resultTable').querySelector('tbody'),
      exportBtn = $('exportBtn');

// 字符计数
keywordInput.addEventListener('input',()=>{
  curLen.textContent = keywordInput.value.length;
  if(keywordInput.value.length>200) keywordInput.value = keywordInput.value.slice(0,200);
});

// 高级折叠
collapseBtn.onclick = ()=>{
  const expanded = advPanel.classList.toggle('hidden');
  collapseBtn.textContent = expanded ? '高级设置 ▼' : '高级设置 ▲';
};

// 渲染平台多选
sourceGroup.innerHTML = PLATFORMS.map(p=>`
  <label><input type="checkbox" value="${p}" checked/>${p}</label>`).join('');

// 工具：拷贝文本
function copyText(txt){
  const i = document.createElement('input');
  i.value = txt;
  document.body.appendChild(i);
  i.select();
  document.execCommand('copy');
  document.body.removeChild(i);
  alert('直链已复制');
}

// 工具：前端导出 Excel（SheetJS）
function exportExcel(){
  const wb = XLSX.utils.table_to_book($('resultTable'),{sheet:'素材'});
  XLSX.writeFile(wb,'浙江大学-竖屏素材.xlsx');
}

// 主流程
startBtn.onclick = async ()=>{
  errorTip.textContent = '';
  const kws = keywordInput.value.split(/\n/).map(s=>s.trim()).filter(Boolean);
  if(!kws.length){
    errorTip.textContent = '请至少输入一个关键词';
    return;
  }
  // 置灰
  startBtn.disabled = true;
  startBtn.textContent = '搜集中…';
  statusRow.classList.remove('hidden');
  resultArea.classList.add('hidden');
  resultTable.innerHTML = '';

  // 收集参数
  const params = {
    keywords: kws,
    imgCount: Number(imgCount.value),
    videoCount: Number(videoCount.value),
    onlyCC0: onlyCC0.checked,
    sources: [...sourceGroup.querySelectorAll('input:checked')].map(i=>i.value)
  };
  const totalExpect = params.imgCount + params.videoCount;
  let finished = 0;

  // 模拟进度（真实场景用 websocket 或轮询）
  const updateProgress = (add=1)=>{
    finished += add;
    const pct = Math.round(finished/totalExpect*100);
    progressBar.value = pct;
    progressText.textContent = `已完成 ${finished}/${totalExpect}`;
  };

  try{
    // ① 调用后端 /kimi-api
    const res = await fetch('http://localhost:3000/kimi-proxy',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(params)
    });
    if(!res.ok) throw new Error('服务异常，请稍后重试');
    const list = await res.json();   // [{keyword,type,url,preview,resolution,duration,source,license},…]
    if(!list.length) throw new Error('暂无竖屏素材，请更换关键词');

    // ② 填表
    list.forEach(it=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${it.keyword}</td>
        <td>${it.type==='video'?'Video':'Image'}</td>
        <td>${it.resolution||'-'}</td>
        <td>${it.duration||'-'}</td>
        <td>${it.source}</td>
        <td><button onclick="copyText('${it.url}')">复制直链</button></td>`;
      resultTable.appendChild(tr);
      updateProgress();
    });
    summary.textContent = `共 ${list.length} 条，全部可商用`;
    resultArea.classList.remove('hidden');
  }catch(err){
    errorTip.textContent = err.message || '服务异常，请稍后重试';
  }finally{
    startBtn.disabled = false;
    startBtn.textContent = '开始搜集';
  }
};

// 导出按钮
exportBtn.onclick = exportExcel;
