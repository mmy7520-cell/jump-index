// ==UserScript==
// @name         ジャンプ＋ 次の話ボタン
// @description  雑誌ビューアに「前の話／もくじ／次の話」バーを出し、同じ作品の次の号の1ページ目へ移動する
// @version      1.2
// @match        https://shonenjumpplus.com/magazine/*
// @run-at       document-start
// @grant        none
// @updateURL    https://mmy7520-cell.github.io/jump-index/jump-next.user.js
// @downloadURL  https://mmy7520-cell.github.io/jump-index/jump-next.user.js
// ==/UserScript==
(function () {
  const INDEX = "https://mmy7520-cell.github.io/jump-index/";
  const SKIP = /目次|予告|コメント|プレゼント|アンケート|お知らせ|記事|広告|応募|^付録|^特別付録/;
  const issueId = (location.pathname.match(/\/magazine\/(\d+)/) || [])[1];
  if (!issueId) return;
  // ビューアがハッシュを消す前に開始ページを控える
  // (スクリプトの実行が遅れてハッシュが消えていても、バーから来た場合は保存済みの番号を使う)
  const m = location.hash.match(/mainPage-(\d+)/);
  const sk = "jn-start-" + issueId;
  let saved = null; try { saved = localStorage.getItem(sk); } catch (e) {}
  if (m) try { localStorage.setItem(sk, m[1]); } catch (e) {}
  const startPage = +(m ? m[1] : saved || 0);

  const norm = t => { t = t.trim(); for (;;) { const n = t.replace(/\s*[（(【][^（()）【】]*[)）】]\s*$/, ""); if (n === t) return t; t = n; } };
  const ls = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
               set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

  async function main() {
    const el = document.getElementById("episode-json");
    if (!el || !startPage) return;
    const toc = (JSON.parse(el.dataset.value).readableProduct.toc || {}).items || [];
    // 開始ページを含む作品 = startAt が開始ページ以下で最大の項目
    let name = null, best = -1;
    for (const it of toc) { const n = norm(it.title); if (!SKIP.test(n) && it.startAt <= startPage && it.startAt > best) { best = it.startAt; name = n; } }
    if (!name) return;
    const D = await (await fetch(INDEX + "data.json", { cache: "no-cache" })).json();
    const list = D.main.concat(D.other), k = list.findIndex(s => s[0] === name);
    if (k < 0) return;
    const eps = list[k][1], idx = D.issues.findIndex(x => x[0] === issueId);
    const e = eps.findIndex(x => x[0] === idx);
    if (e < 0) return;
    // この話を既読として控える (もくじに戻るときに渡す)
    const pend = ls.get("jn-read", {}); (pend[k] = pend[k] || []).includes(e) || pend[k].push(e); ls.set("jn-read", pend);
    const href = j => `https://shonenjumpplus.com/magazine/${D.issues[eps[j][0]][0]}#mainPage-${eps[j][1]}`;
    const tocHref = () => { const p = ls.get("jn-read", {}); ls.set("jn-read", {});
      return INDEX + "#read=" + Object.keys(p).map(kk => kk + ":" + p[kk].join(",")).join(";"); };

    const bar = document.createElement("div");
    bar.id = "jn-bar";
    bar.innerHTML = `<style>
      #jn-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 64px);z-index:2147483647;
        display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(20,20,20,.82);font:600 13px/1 -apple-system,sans-serif;
        box-shadow:0 2px 10px rgba(0,0,0,.3);max-width:calc(100vw - 24px)}
      #jn-bar a,#jn-bar button{color:#fff;text-decoration:none;padding:9px 12px;border-radius:999px;border:0;background:none;font:inherit;white-space:nowrap}
      #jn-bar a.next{background:#d8430f}#jn-bar .off{opacity:.35;pointer-events:none}
      #jn-bar.min a{display:none}</style>
      <a class="next ${e + 1 < eps.length ? "" : "off"}" href="${e + 1 < eps.length ? href(e + 1) : "#"}">◀ 次の話 No.${e + 2}</a>
      <a class="toc" href="#">もくじ</a>
      <a class="${e > 0 ? "" : "off"}" href="${e > 0 ? href(e - 1) : "#"}">前 ▶</a>
      <button class="min" aria-label="バーをたたむ">×</button>`;
    document.body.appendChild(bar);
    bar.querySelector(".toc").onclick = ev => { ev.preventDefault(); location.href = tocHref(); };
    bar.querySelector(".min").onclick = () => { bar.classList.toggle("min"); };
    // 別号へ移動するのでページを読み直させる
    bar.querySelectorAll("a[href^='https']").forEach(a => a.onclick = ev => {
      ev.preventDefault();
      const t = a.href.match(/magazine\/(\d+)#mainPage-(\d+)/);
      if (t) try { localStorage.setItem("jn-start-" + t[1], t[2]); } catch (e) {}
      location.href = a.href;
    });
  }
  let ran = false; const run = () => { if (!ran) { ran = true; main().catch(() => {}); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
