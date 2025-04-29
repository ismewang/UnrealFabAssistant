(async () => {
  // 动态从 CDN 加载 p-limit
  const { default: pLimit } = await import('https://cdn.skypack.dev/p-limit@3.1.0?min');
  //也可以换用其他 CDN：
  //const { default: pLimit } = await import('https://unpkg.com/p-limit@3.1.0/dist/index.esm.js');
  //const { default: pLimit } = await import('https://cdn.jsdelivr.net/npm/p-limit@3.1.0/dist/index.esm.js');

  /** 基础延迟与抖动设置（毫秒） */
  const BASE_DELAY = 200;
  const MAX_JITTER = 300;
  const MAX_RETRIES = 3;

  /** 并发限流器：最多 5 个并发详情→入库任务 */
  const limit = pLimit(5);

  /** 全局计数，用于日志中的编号 */
  let num = 0;

  /** sleep 工具 */
  function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
  }

  /**
   * 带指数退避重试的 fetch 封装
   */
  async function retryFetch(url, options = {}, attempt = 0) {
    try {
      const resp = await fetch(url, options);
      if ((resp.status === 429 || resp.status >= 500) && attempt < MAX_RETRIES) {
        const backoff = 2 ** attempt * 1000 + Math.random() * MAX_JITTER;
        console.warn(`⚠️ 请求 ${url} 返回 ${resp.status}，第 ${attempt + 1} 次重试，将延迟 ${Math.round(backoff)}ms`);
        await sleep(backoff);
        return retryFetch(url, options, attempt + 1);
      }
      return resp;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const backoff = 2 ** attempt * 1000 + Math.random() * MAX_JITTER;
        console.warn(`⚠️ 网络错误，重试 ${url}，第 ${attempt + 1} 次，将延迟 ${Math.round(backoff)}ms`, err);
        await sleep(backoff);
        return retryFetch(url, options, attempt + 1);
      }
      throw err;
    }
  }

  /** 从 cookie 中取值 */
  const getCookie = name => {
    const v = `; ${document.cookie}`;
    const parts = v.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop().split(';')[0] : undefined;
  };

  /** API：分页拿 UID 列表 */
  async function getItemsApi(cookies, next, url_base) {
    await sleep(BASE_DELAY + Math.random() * MAX_JITTER);
    const url = next ? `${url_base}&cursor=${next}` : url_base;
    const resp = await retryFetch(url, {
      headers: { accept: 'application/json', cookie: cookies },
      method: 'GET',
      credentials: 'include',
    });
    const data = await resp.json();
    return [data.cursors?.next || null, data.results?.map(r => r.uid) || []];
  }

  /** API：批量查询已入库状态 */
  async function listingsStateApi(cookies, token, uids) {
    if (!uids.length) return {};
    await sleep(BASE_DELAY + Math.random() * MAX_JITTER);
    const params = uids.map(u => `listing_ids=${u}`).join('&');
    const resp = await retryFetch(`https://www.fab.com/i/users/me/listings-states?${params}`, {
      headers: {
        cookie: cookies,
        accept: 'application/json',
        'x-csrftoken': token,
        'x-requested-with': 'XMLHttpRequest',
      },
      method: 'GET',
      credentials: 'include',
    });
    const arr = await resp.json();
    return arr.reduce((m, i) => { m[i.uid] = i.acquired; return m; }, {});
  }

  /** API：取详情以拿 offerId */
  async function listingsApi(cookies, token, uid) {
    await sleep(BASE_DELAY + Math.random() * MAX_JITTER);
    const resp = await retryFetch(`https://www.fab.com/i/listings/${uid}`, {
      headers: {
        accept: 'application/json',
        cookie: cookies,
        'x-csrftoken': token,
      },
      method: 'GET',
      credentials: 'include',
    });
    const data = await resp.json();
    let offerId = null, type = null;
    for (const lic of data.licenses) {
      if (lic.priceTier.price === 0) {
        offerId = lic.offerId; type = lic.slug;
        if (lic.slug === 'professional') break;
      }
    }
    return [offerId, type, data.title];
  }

  /** API：加入库 */
  async function addLibApi(cookies, token, uid, offerId) {
    await sleep(BASE_DELAY + Math.random() * MAX_JITTER);
    const body = new FormData();
    body.append('offer_id', offerId);
    const resp = await retryFetch(`https://www.fab.com/i/listings/${uid}/add-to-library`, {
      headers: {
        cookie: cookies,
        accept: 'application/json',
        'x-csrftoken': token,
        'x-requested-with': 'XMLHttpRequest',
      },
      method: 'POST',
      body,
      credentials: 'include',
    });
    return resp.status === 204;
  }

  /** 处理单个 UID：拿详情→入库，并保持原日志格式 */
  async function safeProcessUid(cookies, token, uid, pageCursor) {
    try {
      const [offerId, type, title] = await listingsApi(cookies, token, uid);
      if (!offerId) return;
      const itemNo = ++num;
      console.log(`No.${itemNo} Item: name=${title} , offerId=${offerId}`);
      const result = await addLibApi(cookies, token, uid, offerId);
      console.log(`addLib No.${itemNo} ${title} result=${result} page=${pageCursor} type=${type}`);
    } catch (e) {
      console.error(`UID=${uid} 处理失败：`, e);
    }
  }

  /** 主流程 */
  console.log("-> Checking User Info...");
  const cookies = document.cookie;
  const csrftoken = getCookie('fab_csrftoken');
  console.log(`cookies=${cookies}`);
  console.log(`csrftoken=${csrftoken}`);
  if (!csrftoken) return console.error('-> Error: cannot find csrftoken. Please login again.');

  console.log("-> Start Process Items...");
  const urls = [
    'https://www.fab.com/i/listings/search?channels=unreal-engine&is_free=1&sort_by=-createdAt',
    'https://www.fab.com/i/listings/search?channels=unity&is_free=1&sort_by=-createdAt',
    'https://www.fab.com/i/listings/search?channels=uefn&is_free=1&sort_by=-createdAt',
    'https://www.fab.com/i/listings/search?currency=USD&seller=Quixel&sort_by=listingTypeWeight'
  ];

  for (const url of urls) {
    console.log(`start by url=${url}`);
    let cursor = null;
    do {
      const [nextCursor, uids] = await getItemsApi(cookies, cursor, url);
      console.log(`page=${nextCursor} ,count=${uids.length}`);
      const states = await listingsStateApi(cookies, csrftoken, uids);
      for (const uid of uids) {
        if (!states[uid]) {
          // 排队执行，但日志在 safeProcessUid 内保持一致
          limit(() => safeProcessUid(cookies, csrftoken, uid, nextCursor));
        }
      }
      cursor = nextCursor;
      // 翻页延迟
      await sleep(BASE_DELAY + Math.random() * MAX_JITTER);
    } while (cursor);
  }

  console.log(`-> Completed queueing ${num} items.`);
})();
