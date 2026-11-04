/* kac0pi site scripts — no build step required */
"use strict";

/* PERSONAL CONFIG
   Wpisz datę 18. urodzin w formacie YYYY-MM-DD.
   Zostaw pusty tekst, jeśli nie chcesz pokazywać odliczania. */
const CONFIG = {
  birthday18: "USTAW-DATE-YYYY-MM-DD",
  typingWords: ["IT enthusiast", "web developer in progress", "tech explorer", "always learning"],
  postsIndex: "posts/posts.json"
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
  setupMenu();
  setupTyping();
  setupCountdown();
  setupBlog();
  setupSnake();
  setupClicker();
  setupSecretShortcut();
});

function setupMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false");
  }));
}

function setupTyping() {
  const target = document.getElementById("typing-text");
  if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const words = CONFIG.typingWords; let word = 0, index = 0, deleting = false;
  function tick() {
    const current = words[word];
    target.textContent = current.slice(0, index);
    if (!deleting && index < current.length) index++;
    else if (deleting && index > 0) index--;
    else if (!deleting) { deleting = true; setTimeout(tick, 1150); return; }
    else { deleting = false; word = (word + 1) % words.length; }
    setTimeout(tick, deleting ? 38 : 78);
  }
  target.textContent = ""; tick();
}

function setupCountdown() {
  const host = document.getElementById("countdown-values");
  if (!host) return;
  const raw = CONFIG.birthday18;
  if (!raw || raw.startsWith("USTAW")) {
    host.innerHTML = "<div class='countdown-unset'>USTAW DATĘ W PLIKU SCRIPT.JS</div>";
    return;
  }
  const target = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(target.getTime())) { host.textContent = "Nieprawidłowa data"; return; }
  const render = () => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) { host.innerHTML = "<div class='countdown-unset'>LEVEL 18 UNLOCKED ✦</div>"; return; }
    const values = [Math.floor(diff / 86400000), Math.floor(diff / 3600000) % 24, Math.floor(diff / 60000) % 60, Math.floor(diff / 1000) % 60];
    const labels = ["DNI", "GODZ.", "MIN.", "SEK."];
    host.innerHTML = values.map((v,i) => `<div><strong>${String(v).padStart(2,"0")}</strong><span>${labels[i]}</span></div>`).join("");
  };
  render(); setInterval(render, 1000);
}

async function setupBlog() {
  const grid = document.getElementById("post-grid");
  if (!grid) return;
  const search = document.getElementById("post-search");
  const filters = document.getElementById("tag-filters");
  const empty = document.getElementById("empty-state");
  const dialog = document.getElementById("article-dialog");
  const article = document.getElementById("article-content");
  let posts = [], activeTag = "all", query = "";

  try {
    const response = await fetch(CONFIG.postsIndex, {cache:"no-store"});
    if (!response.ok) throw new Error("Nie udało się pobrać indeksu wpisów.");
    posts = await response.json();
    if (!Array.isArray(posts)) throw new Error("Nieprawidłowy format indeksu wpisów.");
  } catch (err) {
    grid.innerHTML = `<div class="empty-state">Nie udało się wczytać wpisów. Sprawdź plik <code>${CONFIG.postsIndex}</code>.</div>`;
    return;
  }

  function render() {
    const visible = posts.filter(p => (activeTag === "all" || (p.tags || []).includes(activeTag)) &&
      `${p.title} ${p.description} ${(p.tags||[]).join(" ")}`.toLowerCase().includes(query));
    grid.innerHTML = visible.map((p,i) => `
      <article class="post-card" tabindex="0" role="button" data-slug="${escapeAttr(p.slug)}">
        <div class="post-card-art"><span>${String(i+1).padStart(2,"0")}</span><b>${escapeHtml((p.category||"TECH NOTES").toUpperCase())}</b></div>
        <div class="post-card-body"><p class="post-meta">${escapeHtml(p.date || "KAC0PI / BLOG")}</p>
        <h2>${escapeHtml(p.title)}</h2><p>${escapeHtml(p.description || "")}</p>
        <div class="tag-row">${(p.tags||[]).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join("")}</div></div>
      </article>`).join("");
    empty.hidden = visible.length !== 0;
    grid.querySelectorAll(".post-card").forEach(card => {
      const open = () => openPost(card.dataset.slug);
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }
  async function openPost(slug) {
    const post = posts.find(p => p.slug === slug); if (!post) return;
    try {
      const res = await fetch(post.file); if (!res.ok) throw new Error("Missing post");
      const markdown = await res.text();
      const body = markdown.replace(/^---[\s\S]*?---\s*/, "");
      const rendered = window.marked ? marked.parse(body) : `<pre>${escapeHtml(body)}</pre>`;
      article.innerHTML = `<p class="post-meta">${escapeHtml(post.date||"")} · ${(post.tags||[]).map(t=>"#"+escapeHtml(t)).join(" ")}</p><h1>${escapeHtml(post.title)}</h1>${rendered}`;
      if (window.hljs) article.querySelectorAll("pre code").forEach(block => hljs.highlightElement(block));
      if (dialog && dialog.showModal) dialog.showModal();
      history.replaceState(null, "", `blog.html?post=${encodeURIComponent(slug)}`);
    } catch { article.innerHTML = "<h2>Nie udało się otworzyć artykułu.</h2><p>Sprawdź, czy plik Markdown istnieje w repozytorium.</p>"; if (dialog?.showModal) dialog.showModal(); }
  }
  search?.addEventListener("input", () => { query = search.value.trim().toLowerCase(); render(); });
  filters?.querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    activeTag = btn.dataset.tag; filters.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b===btn)); render();
  }));
  document.querySelector(".dialog-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  render();
  const requested = new URLSearchParams(location.search).get("post");
  if (requested) openPost(requested);
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g,"&#96;"); }

/* Snake — canvas game; best score stored locally. */
function setupSnake() {
  const canvas = document.getElementById("snake-canvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d"), size = 20, cols = canvas.width/size, rows = canvas.height/size;
  const overlay = document.getElementById("snake-overlay"), scoreEl = document.getElementById("snake-score"), bestEl = document.getElementById("snake-best");
  let snake, food, dir, nextDir, score, timer = null, running = false, paused = false;
  let best = Number(localStorage.getItem("kac0pi-snake-best") || 0); bestEl.textContent = String(best).padStart(3,"0");
  function reset() {
    snake = [{x:Math.floor(cols/2),y:Math.floor(rows/2)},{x:Math.floor(cols/2)-1,y:Math.floor(rows/2)},{x:Math.floor(cols/2)-2,y:Math.floor(rows/2)}];
    dir={x:1,y:0}; nextDir={x:1,y:0}; score=0; scoreEl.textContent="000"; placeFood(); draw();
  }
  function placeFood() { do { food={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*rows)}; } while(snake.some(p=>p.x===food.x&&p.y===food.y)); }
  function draw() {
    ctx.fillStyle="#050a17";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="rgba(70,110,150,.10)";ctx.lineWidth=1;
    for(let x=0;x<=canvas.width;x+=size){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
    for(let y=0;y<=canvas.height;y+=size){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
    ctx.shadowBlur=14;ctx.shadowColor="#f472b6";ctx.fillStyle="#f472b6";ctx.beginPath();ctx.roundRect(food.x*size+4,food.y*size+4,size-8,size-8,5);ctx.fill();
    snake.forEach((p,i)=>{ctx.shadowBlur=i===0?18:8;ctx.shadowColor="#22d3ee";ctx.fillStyle=i===0?"#a5f3fc":"#22a9c5";ctx.beginPath();ctx.roundRect(p.x*size+2,p.y*size+2,size-4,size-4,5);ctx.fill();});
    ctx.shadowBlur=0;
  }
  function endGame() { running=false;clearInterval(timer);timer=null;overlay.classList.remove("hidden");overlay.querySelector("h3").textContent="Game over";overlay.querySelector("p").textContent=`Twój wynik: ${score}. Spróbuj jeszcze raz!`;if(score>best){best=score;localStorage.setItem("kac0pi-snake-best",best);bestEl.textContent=String(best).padStart(3,"0");} }
  function step() {
    dir=nextDir;const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
    if(head.x<0||head.x>=cols||head.y<0||head.y>=rows||snake.some((p,i)=>i>0&&p.x===head.x&&p.y===head.y)){endGame();return;}
    snake.unshift(head);
    if(head.x===food.x&&head.y===food.y){score+=10;scoreEl.textContent=String(score).padStart(3,"0");placeFood();}
    else snake.pop();
    draw();
  }
  function start(){if(timer)clearInterval(timer);reset();running=true;paused=false;overlay.classList.add("hidden");timer=setInterval(step,115);}
  function setDirection(d){if(!running||paused)return;const map={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};const n=map[d];if(n&&!(n.x===-dir.x&&n.y===-dir.y))nextDir=n;}
  document.getElementById("snake-start").addEventListener("click",start);
  document.getElementById("snake-restart").addEventListener("click",start);
  document.querySelectorAll("[data-dir]").forEach(b=>b.addEventListener("click",()=>setDirection(b.dataset.dir)));
  document.addEventListener("keydown",e=>{
    if(["ArrowUp","w","W"].includes(e.key)){e.preventDefault();setDirection("up");}
    if(["ArrowDown","s","S"].includes(e.key)){e.preventDefault();setDirection("down");}
    if(["ArrowLeft","a","A"].includes(e.key)){e.preventDefault();setDirection("left");}
    if(["ArrowRight","d","D"].includes(e.key)){e.preventDefault();setDirection("right");}
    if(e.code==="Space"&&running){e.preventDefault();paused=!paused;if(timer){clearInterval(timer);timer=null;}else timer=setInterval(step,115);}
  });
  reset();
}

/* Hacker Clicker — session progress persisted in localStorage. */
function setupClicker() {
  const button=document.getElementById("hack-button");if(!button)return;
  const scoreEl=document.getElementById("clicker-score"),powerEl=document.getElementById("click-power"),costEl=document.getElementById("upgrade-cost"),upgrade=document.getElementById("upgrade-button"),toast=document.getElementById("clicker-toast");
  let score=Number(localStorage.getItem("kac0pi-clicker-score")||0),power=Number(localStorage.getItem("kac0pi-clicker-power")||1),cost=Number(localStorage.getItem("kac0pi-clicker-cost")||25);
  function render(){scoreEl.textContent=score.toLocaleString("pl-PL");powerEl.textContent=`+${power}`;costEl.textContent=cost.toLocaleString("pl-PL");upgrade.disabled=score<cost;}
  button.addEventListener("click",()=>{score+=power;localStorage.setItem("kac0pi-clicker-score",score);toast.textContent=`+${power} DATA`;toast.classList.remove("show");void toast.offsetWidth;toast.classList.add("show");render();});
  upgrade.addEventListener("click",()=>{if(score<cost)return;score-=cost;power++;cost=Math.ceil(cost*1.65);localStorage.setItem("kac0pi-clicker-score",score);localStorage.setItem("kac0pi-clicker-power",power);localStorage.setItem("kac0pi-clicker-cost",cost);render();});
  render();
}

/* Hidden convenience shortcut: type "admin" to open the CMS login page. */
function setupSecretShortcut() {
  let typed="";
  document.addEventListener("keydown",e=>{
    if(e.key.length!==1||e.ctrlKey||e.metaKey||e.altKey)return;
    typed=(typed+e.key.toLowerCase()).slice(-5);
    if(typed==="admin"){location.href="admin/";typed="";}
  });
}
