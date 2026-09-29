'use strict';

const dimensions = [
  ['E', '情绪浓度', '平静', '炽烈'], ['S', '社交联结', '独处', '联结'],
  ['R', '理性倾向', '感受', '思考'], ['F', '自由倾向', '秩序', '自由'],
  ['M', '浪漫倾向', '现实', '浪漫'], ['I', '内在世界', '向外体验', '向内感受']
];
const weights = {E: 1.15, S: .95, R: 1.05, F: 1, M: 1.1, I: 1.15};
const bounds = Object.fromEntries(dimensions.map(([key]) => [key, {
  min: questions.reduce((sum, q) => sum + Math.min(...q.answers.map(a => a.scores[key])), 0),
  max: questions.reduce((sum, q) => sum + Math.max(...q.answers.map(a => a.scores[key])), 0)
}]));

// 从最终答案数组重新求和；回退修改不会重复累加。
function calculate(answers) {
  if (answers.length !== questions.length || answers.some((a, i) => !Number.isInteger(a) || !questions[i].answers[a])) {
    throw new Error('请完成所有题目后再计算结果。');
  }
  const raw = Object.fromEntries(dimensions.map(([k]) => [k, questions.reduce((s,q,i) => s + q.answers[answers[i]].scores[k],0)]));
  const scores = Object.fromEntries(dimensions.map(([k]) => [k, bounds[k].max === bounds[k].min ? 50 : Math.max(0,Math.min(100,(raw[k]-bounds[k].min)/(bounds[k].max-bounds[k].min)*100))]));
  const maxDistance = Math.sqrt(Object.values(weights).reduce((s,w) => s+w,0)*10000);
  const ranking = paintings.map((p,index) => {
    const distance = Math.sqrt(dimensions.reduce((sum,[k]) => sum+weights[k]*(scores[k]-p.coordinates[k])**2,0));
    return {painting:p, index, distance, affinity: Math.max(82,Math.min(96,96-14*distance/maxDistance))};
  }).sort((a,b) => a.distance-b.distance || a.index-b.index);
  return {raw, scores, ranking, top3:ranking.slice(0,3)};
}

const app = document.querySelector('#app');
const state = {answers:Array(questions.length).fill(null), index:0, busy:false, result:null};
const debug = new URLSearchParams(location.search).get('debug') === 'true';
const esc = s => String(s).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
const pad = n => String(n).padStart(2,'0');
function show(html, focus=true) {
  app.innerHTML = html;
  window.scrollTo({top:0,behavior:'instant'});
  if (focus) { const h=app.querySelector('h1'); if(h){ h.tabIndex=-1; h.focus({preventScroll:true}); } }
}
function art(p, extra='') {
  return `<div class="art ${extra}" style="--art-color:${p.color}" role="img" aria-label="${esc(p.title)}，艺术占位图"><div class="art-orbit"></div><div class="art-caption"><span>STUDY OF A SOUL</span><i>${esc(p.title)}</i><small>画作留白 · IMAGE PLACEHOLDER</small></div></div>`;
}

// MVP 不请求尚不存在的图片，避免 404。正式图片就绪后在此名单添加对应画作 id。
const availableImages = [];
function hydrateArt() {
  app.querySelectorAll('[data-art]').forEach(el => {
    const p=paintings.find(p=>p.id===el.dataset.art);
    if (!availableImages.includes(p.id)) return;
    const img=new Image(); img.alt=`${results[p.id].chineseTitle} — ${p.artist}`;
    img.onload=()=>{el.replaceChildren(img);};
    img.onerror=()=>{img.remove();};
    img.src=p.image;
  });
}
function landing() {
  state.busy=false;
  show(`<section class="landing enter"><div class="landing-copy"><p class="eyebrow">AN EXHIBITION OF YOUR INNER WORLD</p><p class="issue">展览 001 <span>关于你，关于艺术</span></p><h1>你会被画进<br>哪幅<span class="italic">世界名画</span>？</h1><div class="hairline"></div><p class="intro">如果画家能够看见你的灵魂，<br>梵高会把你放进星空，<br>莫奈会让你坐在睡莲旁，<br>还是霍珀会让你独自坐在凌晨的咖啡馆？</p><p class="invitation">15 个问题，<br>找到与你内心世界最接近的那幅画。</p><button class="primary" id="start">开始进入画中 <span>→</span></button><p class="micro">15 道提问 &nbsp; / &nbsp; 10 幅名画 &nbsp; / &nbsp; 一次向内的旅行</p></div><div class="exhibit"><div class="frame">${art(paintings[0],'landing-art')}</div><div class="exhibit-label"><span>FIG. 01 — THE INNER UNIVERSE</span><span>每一种灵魂，都有自己的颜色。</span></div></div></section>`,false);
  document.querySelector('#start').onclick=()=>{state.answers.fill(null);state.index=0;question();};
}
function question() {
  state.busy=false;
  const q=questions[state.index], final=state.index===14;
  show(`<section class="quiz enter ${final?'last-question':''}"><div class="quiz-top"><span>ROOM ${pad(state.index+1)}</span><span>${pad(state.index+1)} <em>/ 15</em></span></div><div class="progress" role="progressbar" aria-label="答题进度" aria-valuemin="0" aria-valuemax="15" aria-valuenow="${state.index}"><i style="width:${state.index/15*100}%"></i></div><p class="eyebrow">${final?'THE FINAL BRUSHSTROKE':esc(q.title)}</p>${final?'<p class="last-label">最后一个问题。</p>':''}<h1>${esc(q.text).replace(/\n/g,'<br>')}</h1><div class="answers">${q.answers.map((a,i)=>`<button class="answer ${state.answers[state.index]===i?'selected':''}" aria-pressed="${state.answers[state.index]===i}" data-answer="${i}"><span class="letter">${'ABCD'[i]}</span><span>${esc(a.text)}</span><span class="choice-mark" aria-hidden="true">↗</span></button>`).join('')}</div><div class="quiz-bottom"><button class="back" ${state.index===0?'disabled':''}>← 上一题</button><span>跟随第一直觉，没有标准答案。</span></div></section>`);
  app.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{
    if(state.busy)return; state.busy=true;
    state.answers[state.index]=Number(b.dataset.answer);
    app.querySelectorAll('.answer').forEach(el=>{el.disabled=true;el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});
    app.querySelector('.back').disabled=true;
    setTimeout(()=>{if(state.index<14){state.index++;question();}else{state.result=calculate(state.answers);reveal();}},250);
  });
  app.querySelector('.back').onclick=()=>{if(state.busy||state.index===0)return;state.index--;question();};
}
function reveal() {
  show('<section class="reveal enter"><div class="reveal-seal">S<span>G</span></div><p class="eyebrow">A PORTRAIT, UNIQUELY YOURS</p><h1 aria-live="polite">你的颜色正在出现……</h1><div class="reveal-line"></div></section>');
  setTimeout(()=>{app.querySelector('h1').textContent='正在寻找与你最接近的画作……';},1050);
  setTimeout(()=>{app.querySelector('h1').textContent='画完成了。';},2150);
  setTimeout(resultPage,3100);
}
function resultPage() {
  state.busy=false;
  const result=state.result, p=result.top3[0].painting, r=results[p.id];
  show(`<article class="result enter" style="--result-color:${p.color}"><p class="eyebrow result-kicker">YOUR SOUL, IN THE PERMANENT COLLECTION</p><div class="result-hero" data-art="${p.id}">${art(p)}</div><div class="result-title"><p class="eyebrow">你会被画进——</p><p class="artist">${esc(p.artist)}</p><h1>《${esc(p.title)}》</h1><p class="chinese-title">${esc(r.chineseTitle)}</p><p class="tagline">${esc(r.tagline)}</p><p class="keywords">${r.keywords.map(esc).join(' <span>·</span> ')}</p><span class="affinity">灵魂匹配度 ${result.top3[0].affinity.toFixed(1)}% <small>娱乐性艺术联想</small></span></div><div class="result-body"><section class="portrait"><p class="eyebrow">01 / THE PORTRAIT</p><h2>人格画像</h2>${r.portrait.map(t=>`<p>${rich(t)}</p>`).join('')}</section><section class="spectrum"><p class="eyebrow">02 / YOUR PALETTE</p><h2>你的灵魂色谱</h2>${dimensions.map(([k,name,left,right])=>`<div class="dimension"><div><label for="dim-${k}">${name}</label><span>${Math.round(result.scores[k])}</span></div><meter id="dim-${k}" min="0" max="100" value="${result.scores[k]}">${Math.round(result.scores[k])}</meter><div class="axis"><span>${left}</span><span>${right}</span></div></div>`).join('')}</section><section class="details">${r.details.map(d=>`<details><summary>${esc(d.label)}<span>+</span></summary><h3>${esc(d.title)}</h3><p>${esc(d.text)}</p></details>`).join('')}</section><blockquote>“${esc(r.quote)}”</blockquote><section class="gallery"><p class="eyebrow">03 / THE SOUL GALLERY</p><h2>你的灵魂画廊</h2><div class="gallery-grid">${result.top3.map((entry,i)=>`<div class="gallery-item"><div data-art="${entry.painting.id}">${art(entry.painting)}</div><p class="eyebrow">NO.${i+1} <span>${entry.affinity.toFixed(1)}%</span></p><h3>${esc(entry.painting.title)}</h3><p class="gallery-artist">${esc(entry.painting.artist)}</p></div>`).join('')}</div></section><button class="primary restart">重新走进画中 <span>↗</span></button>${debug?debugPanel(result):''}</div></article>`);
  app.querySelector('.restart').onclick=landing;
  hydrateArt();
}
function debugPanel(result) {
  return `<section class="debug"><h2>Debug / 计分检查</h2><pre>${esc(JSON.stringify({answers:state.answers.map(i=>'ABCD'[i]),bounds,raw:result.raw,normalized:result.scores,distances:result.ranking.map(e=>({painting:e.painting.title,distance:e.distance})),top3:result.top3.map(e=>e.painting.title)},null,2))}</pre></section>`;
}
landing();
