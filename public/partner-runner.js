/*
 * Aura sim — раннер синхронизации. Запускается во вкладке https://ac-partner.ru (где выполнен вход).
 * Забирает свободные номера по «красивым» маскам + брони самого партнёра и отправляет их на сайт.
 * Перед запуском: window.__AURA_KEY = '<CRON_SECRET>'; (необязательно) window.__AURA_SITE = 'https://…'
 * Прогресс: window.__auraSync
 */
(function () {
  if (window.__auraSync && window.__auraSync.state === "running") return;
  var SITE = (window.__AURA_SITE || "https://aurasim.vercel.app").replace(/\/$/, "");
  var KEY = window.__AURA_KEY;
  var MASKS = [
    "******AAAA", "*****AAAA*", "****AAAA**", "***AAAA***", "*******AAA",
    "****ABABAB", "***ABAB***", "******ABAB", "******A0A0", "***AAABCBC", "AAA***BCBC",
    "***ABBA***", "****ABBA**", "*****ABBA*", "******ABBA", "***ABC*ABC", "***AAA*AAA",
  ];
  var PAGE = 150;
  var CONCURRENCY = 4;
  var st = (window.__auraSync = { state: "running", startedAt: new Date().toISOString(), mask: "", pages: 0, seen: 0, own: 0, error: null, runId: null });

  function Expired(msg) { this.message = msg; this.expired = true; }

  async function api(body, attempt) {
    attempt = attempt || 1;
    try {
      return await apiOnce(body);
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise(function (res) { setTimeout(res, 3000 * attempt); });
      return api(body, attempt + 1);
    }
  }

  function apiOnce(body) {
    return fetch(SITE + "/api/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error("Сайт: " + (j.error || r.status));
        return j;
      });
    });
  }

  function trim(x) {
    return {
      number: x.number, operator: x.operator, status: x.status,
      region: x.region ? { name: x.region.name } : null,
      minCost: x.minCost, price: x.price, isCis: x.isCis,
      tariffs: (x.tariffs || []).map(function (t) { return { name: t.name, costForSearch: t.costForSearch }; }),
    };
  }

  async function partnerJson(url, init, attempt) {
    attempt = attempt || 1;
    try {
      var r = await fetch(url, init);
      if (r.redirected && /login/.test(r.url)) throw new Expired("Нужен вход в кабинет партнёра");
      var ct = r.headers.get("content-type") || "";
      var text = await r.text();
      if (!r.ok) throw new Error("Кабинет ответил " + r.status);
      try { return JSON.parse(text); } catch (e) {
        if (/form-login|Вход в кабинет/.test(text)) throw new Expired("Нужен вход в кабинет партнёра");
        throw new Error("Кабинет вернул не JSON (" + ct + ")");
      }
    } catch (e) {
      if (e.expired || attempt >= 3) throw e;
      await new Promise(function (res) { setTimeout(res, 1500 * attempt); });
      return partnerJson(url, init, attempt + 1);
    }
  }

  function searchPage(mask, offset) {
    var body = new URLSearchParams({ "search[isFree]": "1", "search[number]": mask, "search[isLast]": "1", tab: "all" });
    return partnerJson("/number/" + offset, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
      body: body.toString(),
    });
  }

  async function pool(items, n, fn) {
    var i = 0;
    var workers = [];
    for (var w = 0; w < n; w++) workers.push((async function () { while (i < items.length) { var x = items[i++]; await fn(x); } })());
    await Promise.all(workers);
  }

  (async function main() {
    var seen = new Set();
    var buffer = [];
    var scanned = 0;
    var sending = Promise.resolve();
    function push(list) {
      for (var k = 0; k < list.length; k++) {
        var it = list[k];
        var id = String(it.number || "").replace(/\D/g, "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        buffer.push(trim(it));
      }
      st.seen = seen.size;
    }
    function flush(force) {
      if (!buffer.length || (!force && buffer.length < 500)) return sending;
      var chunk = buffer.splice(0, buffer.length);
      sending = sending.then(function () { return api({ action: "batch", runId: st.runId, items: chunk }); });
      return sending;
    }
    try {
      if (!KEY) throw new Error("Не задан window.__AURA_KEY");
      st.runId = (await api({ action: "start" })).runId;

      // 1) свои брони — остаются на сайте
      for (var p = 1; p < 50; p++) {
        var res = await partnerJson("/numbers/in-progress/search?page=" + p + "&filters[type]=reservation", { headers: { "X-Requested-With": "XMLHttpRequest" } });
        var list = (res && res.data && res.data.list) || [];
        if (!list.length) break;
        st.own += list.length;
        push(list);
        if (list.length < 10) break;
      }

      // 2) свободные номера по маскам (чужие брони сюда не попадают)
      for (var m = 0; m < MASKS.length; m++) {
        var mask = MASKS[m];
        st.mask = mask;
        var first = await searchPage(mask, 0);
        var total = Number(first.total || 0);
        push((first.list || []).filter(function (x) { return x.status === 0; }));
        scanned += (first.list || []).length;
        st.pages++;
        var offsets = [];
        for (var off = PAGE; off < total; off += PAGE) offsets.push(off);
        await pool(offsets, CONCURRENCY, async function (o) {
          var r = await searchPage(mask, o);
          var l = r.list || [];
          scanned += l.length;
          st.pages++;
          push(l.filter(function (x) { return x.status === 0; }));
          await flush(false);
        });
        await flush(false);
      }
      await flush(true);
      await sending;
      await api({ action: "finish", runId: st.runId, seen: seen.size, scanned: scanned });
      st.state = "done";
    } catch (e) {
      st.state = "error";
      st.error = e.message || String(e);
      try {
        await sending;
      } catch (_) {}
      try {
        await api({ action: "status", status: e.expired ? "expired" : "error", message: st.error, runId: st.runId });
      } catch (_) {}
    }
    st.finishedAt = new Date().toISOString();
  })();
})();
