const STORAGE_KEY = "personal-film-retrospective-v2";
const LEGACY_STORAGE_KEY = "personal-film-retrospective-v1";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const SWIPE_BATCH_SIZE = 15;
const SWIPE_THRESHOLD = 92;
const LOW_CANDIDATE_WATERMARK = 8;

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

const seedMovies = [
  ["local-1", "海街日记", "日本", "是枝裕和", "2015", "https://image.tmdb.org/t/p/w500/rH2OYd6duXT3YvCYPj66foHi1LH.jpg", true, true, ["安静", "家庭", "夏天", "生活流"], "大概大学时期", "像一间被阳光慢慢晒暖的房子。"],
  ["local-2", "花样年华", "中国香港", "王家卫", "2000", "https://image.tmdb.org/t/p/w500/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg", true, true, ["潮湿", "克制", "暧昧", "旧时光"], "记不清", "记忆里首先出现的是颜色、走廊和声音。"],
  ["local-3", "千与千寻", "日本", "宫崎骏", "2001", "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", true, true, ["童年", "异世界", "成长", "孤勇"], "小时候", "有些画面像从童年的水里浮上来。"],
  ["local-4", "步履不停", "日本", "是枝裕和", "2008", "https://image.tmdb.org/t/p/w500/7f9JzJ9yteoJj8oPOIXiMwwDgVZ.jpg", true, false, ["家庭", "饭桌", "遗憾", "生活流"], "", ""],
  ["local-5", "重庆森林", "中国香港", "王家卫", "1994", "https://image.tmdb.org/t/p/w500/43I9DcNoCzpyzK8JCkJYpHqHqGG.jpg", true, false, ["都市", "孤独", "霓虹", "轻盈"], "", ""],
].map(([id, title, country, director, year, poster, watched, liked, tags, memoryTime, note]) =>
  normalizeMovie({ id, title, country, director, year, poster, watched, liked, tags, memoryTime, note })
);

const fallbackCandidates = [
  ["tmdb-496243", "寄生虫", "韩国", "奉俊昊", "2019", "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", ["阶级", "黑色幽默", "空间"], "热门佳作"],
  ["tmdb-505192", "小偷家族", "日本", "是枝裕和", "2018", "https://image.tmdb.org/t/p/w500/4nfRUOv3LX5zLn98WS1WqVBk9E9.jpg", ["家庭", "边缘", "温柔"], "热门佳作"],
  ["tmdb-372058", "你的名字。", "日本", "新海诚", "2016", "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6babgKnONONX.jpg", ["动画", "青春", "命运"], "热门佳作"],
  ["tmdb-152601", "她", "美国", "斯派克·琼斯", "2013", "https://image.tmdb.org/t/p/w500/eCOtqtfvn7mxGl6nfmq4b1exJRc.jpg", ["孤独", "亲密", "未来"], "相似气质"],
  ["tmdb-313369", "降临", "美国", "丹尼斯·维伦纽瓦", "2016", "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg", ["科幻", "语言", "宿命"], "热门佳作"],
  ["tmdb-11216", "天堂电影院", "意大利", "朱塞佩·托纳多雷", "1988", "https://image.tmdb.org/t/p/w500/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg", ["电影", "童年", "怀旧"], "经典老片"],
  ["tmdb-399055", "水形物语", "美国", "吉尔莫·德尔·托罗", "2017", "https://image.tmdb.org/t/p/w500/9zfwPffUXpBrEP26yp0q1ckXDcj.jpg", ["奇幻", "孤独", "寓言"], "相似气质"],
  ["tmdb-797", "假面", "瑞典", "英格玛·伯格曼", "1966", "https://image.tmdb.org/t/p/w500/bdXbfUir63TQHA5NTNcXPICZCW8.jpg", ["心理", "黑白", "现代主义"], "经典老片"],
  ["tmdb-103", "出租车司机", "美国", "马丁·斯科塞斯", "1976", "https://image.tmdb.org/t/p/w500/ekstpH614fwDX8DUln1a2Opz0N8.jpg", ["都市", "孤独", "夜晚"], "经典老片"],
  ["tmdb-539", "惊魂记", "美国", "阿尔弗雷德·希区柯克", "1960", "https://image.tmdb.org/t/p/w500/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg", ["悬疑", "黑白", "经典"], "经典老片"],
  ["tmdb-1024", "天堂的颜色", "伊朗", "马基德·马基迪", "1999", "", ["伊朗", "童年", "自然"], "冷门国家"],
  ["tmdb-20334", "一次别离", "伊朗", "阿斯哈·法哈蒂", "2011", "https://image.tmdb.org/t/p/w500/x7M9S4t1JK1vSTQXJ5e0mXo1t4i.jpg", ["家庭", "伦理", "现实"], "冷门国家"],
  ["tmdb-795", "柏林苍穹下", "德国", "维姆·文德斯", "1987", "https://image.tmdb.org/t/p/w500/iZQs2vUeCzvS1KfZJ6uYNCGJBBV.jpg", ["城市", "诗意", "天使"], "经典老片"],
  ["tmdb-5961", "潜行者", "苏联", "安德烈·塔可夫斯基", "1979", "https://image.tmdb.org/t/p/w500/lUE0Bp7wH0EterJ44qMRsqtKFnp.jpg", ["哲学", "废墟", "科幻"], "经典老片"],
  ["tmdb-387", "八部半", "意大利", "费德里科·费里尼", "1963", "https://image.tmdb.org/t/p/w500/9x2GRYIl36u4B7U7X6vJcAm8Lk2.jpg", ["梦", "电影", "创作"], "经典老片"],
  ["tmdb-599", "日落大道", "美国", "比利·怀尔德", "1950", "https://image.tmdb.org/t/p/w500/sC4Dpmn87oz9AuxZ15Lmip0Ftgr.jpg", ["旧好莱坞", "黑色电影", "衰败"], "经典老片"],
  ["tmdb-914", "大都会", "德国", "弗里茨·朗", "1927", "https://image.tmdb.org/t/p/w500/pxbGZewX327IbTvrCVRJgcLJTSQ.jpg", ["默片", "科幻", "城市"], "经典老片"],
  ["tmdb-334543", "上帝之国", "英国", "弗朗西斯·李", "2017", "https://image.tmdb.org/t/p/w500/8eUiStVjv6qfdtnjXFmI1aOqbaE.jpg", ["乡村", "亲密", "冷冽"], "小众高分"],
  ["tmdb-264644", "游客", "瑞典", "鲁本·奥斯特伦德", "2014", "https://image.tmdb.org/t/p/w500/1J4Z7VhdAgtdd97nCxY7dcBpjGT.jpg", ["家庭", "尴尬", "雪山"], "小众高分"],
  ["tmdb-60243", "都灵之马", "匈牙利", "贝拉·塔尔", "2011", "https://image.tmdb.org/t/p/w500/6ei9pW7hAf8nNDrVZhGmb2x9p5O.jpg", ["缓慢", "末日", "黑白"], "冷门国家"],
  ["tmdb-582", "甜蜜的生活", "意大利", "费德里科·费里尼", "1960", "https://image.tmdb.org/t/p/w500/6f4IRuQ0T3Zg5KDUqijZGqdYW4d.jpg", ["城市", "名流", "空虚"], "经典老片"],
  ["tmdb-705", "乱", "日本", "黑泽明", "1985", "https://image.tmdb.org/t/p/w500/jQnUtWaHY3U7fWn1vRM6cWNFyGV.jpg", ["史诗", "权力", "色彩"], "经典老片"],
  ["tmdb-26451", "燃烧女子的肖像", "法国", "瑟琳·席安玛", "2019", "https://image.tmdb.org/t/p/w500/2LquGwEhbg3soxSCs9VNyh5VJd9.jpg", ["凝视", "爱情", "火"], "小众高分"],
  ["tmdb-46738", "大地之歌", "印度", "萨蒂亚吉特·雷伊", "1955", "https://image.tmdb.org/t/p/w500/3vGvwf2tZoEJv2mFr7Ebkx7ZQmi.jpg", ["童年", "乡村", "人文"], "冷门国家"],
  ["tmdb-857", "拯救大兵瑞恩", "美国", "史蒂文·斯皮尔伯格", "1998", "https://image.tmdb.org/t/p/w500/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg", ["战争", "史诗", "创伤"], "热门佳作"],
  ["tmdb-508965", "犬之力", "新西兰", "简·坎皮恩", "2021", "https://image.tmdb.org/t/p/w500/kEy48iCzGnp0ao1cZbNeWR6yIhC.jpg", ["西部", "压抑", "心理"], "小众高分"],
  ["tmdb-489", "心灵捕手", "美国", "格斯·范·桑特", "1997", "https://image.tmdb.org/t/p/w500/bABCBKYBK7A5G1x0FzoeoNfuj2.jpg", ["成长", "天赋", "疗愈"], "热门佳作"],
  ["tmdb-11645", "乱世佳人", "美国", "维克多·弗莱明", "1939", "https://image.tmdb.org/t/p/w500/lNz2Ow0wGCAvzckW7EOjE03KcYv.jpg", ["史诗", "旧好莱坞", "爱情"], "经典老片"],
  ["tmdb-627", "猜火车", "英国", "丹尼·博伊尔", "1996", "https://image.tmdb.org/t/p/w500/bb2CsgKq47g38Y34fCG6REzQ10.jpg", ["青春", "反叛", "迷幻"], "经典老片"],
  ["tmdb-14756", "汉娜姐妹", "美国", "伍迪·艾伦", "1986", "https://image.tmdb.org/t/p/w500/fGqGBmGRjV0zr1xoWl5sQG33MZ4.jpg", ["纽约", "家庭", "关系"], "经典老片"],
  ["tmdb-18438", "伊万的童年", "苏联", "安德烈·塔可夫斯基", "1962", "https://image.tmdb.org/t/p/w500/1P13frQxY5d7CkzG9M3X2Tbc6TP.jpg", ["战争", "童年", "梦"], "经典老片"],
  ["tmdb-938", "用心棒", "日本", "黑泽明", "1961", "https://image.tmdb.org/t/p/w500/tN7kYPjRhDolpui9sc9Eq9n5b2O.jpg", ["武士", "黑白", "类型"], "经典老片"],
  ["tmdb-271110", "龙虾", "爱尔兰", "欧格斯·兰斯莫斯", "2015", "https://image.tmdb.org/t/p/w500/7Y9ILV1unpW9mLpGcqyGQU72LUy.jpg", ["荒诞", "关系", "冷幽默"], "小众高分"],
  ["tmdb-375262", "挪威的森林", "日本", "陈英雄", "2010", "https://image.tmdb.org/t/p/w500/nN4Ai05F8aXHOdnODxLdRqzBmcg.jpg", ["青春", "失去", "文学"], "相似气质"],
  ["tmdb-77338", "无法触碰", "法国", "奥利维埃·纳卡什", "2011", "https://image.tmdb.org/t/p/w500/1QU7HKgsQbGpzsJbJK4pAVQV9F5.jpg", ["友情", "疗愈", "轻盈"], "热门佳作"],
  ["tmdb-141", "死亡诗社", "美国", "彼得·威尔", "1989", "https://image.tmdb.org/t/p/w500/ai40gM7SUaGA6fthvsd87o8IQq4.jpg", ["教育", "青春", "自由"], "热门佳作"],
  ["tmdb-273895", "卡罗尔", "美国", "托德·海因斯", "2015", "https://image.tmdb.org/t/p/w500/9AbessEzQc3f5iP0O0HqG7i5v7F.jpg", ["爱情", "克制", "复古"], "小众高分"],
  ["tmdb-5544", "喜宴", "中国台湾", "李安", "1993", "https://image.tmdb.org/t/p/w500/gjQ0r2lcc84s0dCgPCREkXmK9pS.jpg", ["家庭", "身份", "喜剧"], "经典老片"],
  ["tmdb-59967", "地球上的星星", "印度", "阿米尔·汗", "2007", "https://image.tmdb.org/t/p/w500/9LZlqBq3F8sD8YJubdgZf0yo6dU.jpg", ["童年", "教育", "疗愈"], "冷门国家"],
  ["tmdb-14537", "哈尔的移动城堡", "日本", "宫崎骏", "2004", "https://image.tmdb.org/t/p/w500/TkTPELv4kC3u1lkloush8skOjE.jpg", ["动画", "魔法", "战争"], "热门佳作"],
].map(([id, title, country, director, year, poster, tags, sourceLayer]) =>
  normalizeMovie({ id, title, country, director, year, poster, tags, sourceLayer })
);

const topics = [
  { id: "mixed", name: "混合探索", hint: "热门、经典、小众和冷门国家混在一起。" },
  { id: "arthouse", name: "小众优质", hint: "影展气质、作者电影和更安静的好片。" },
  { id: "classic", name: "经典老片", hint: "从默片、黑白片到八九十年代。" },
  { id: "global", name: "冷门国家", hint: "伊朗、东欧、拉美、南亚和更多地区。" },
  { id: "life", name: "生活流", hint: "家庭、饭桌、夏天、关系和日常。" },
];

const state = loadState();
let view = "swipe";
let archiveMode = "watched";
let activeTopic = "mixed";
let selectedMovieId = null;
let selectedBreakIds = new Set();
let breakStep = 0;
let currentBatch = { left: [], right: [] };
let dragState = null;
let searchQuery = "";
let searchStatus = "";
let recommendations = [];
let apiStatus = "";

function normalizeMovie(movie) {
  const year = movie.year || (movie.release_date ? String(movie.release_date).slice(0, 4) : "");
  const tmdbId = movie.tmdbId || (movie.id && String(movie.id).startsWith("tmdb-") ? String(movie.id).replace("tmdb-", "") : movie.id);
  const id = movie.id || (tmdbId ? `tmdb-${tmdbId}` : `custom-${Date.now()}`);
  return {
    id: String(id),
    tmdbId: tmdbId ? String(tmdbId).replace("tmdb-", "") : "",
    title: movie.title || movie.name || "未命名电影",
    country: movie.country || movie.region || "",
    director: movie.director || "",
    year,
    poster: movie.poster || movie.posterUrl || posterUrl(movie.poster_path),
    watched: Boolean(movie.watched),
    liked: Boolean(movie.liked),
    memoryTime: movie.memoryTime || "",
    memoryStrength: movie.memoryStrength || "",
    impact: movie.impact || "",
    rewatch: movie.rewatch || "",
    tags: Array.isArray(movie.tags) ? movie.tags : [],
    note: movie.note || "",
    exhibit: movie.exhibit || "",
    sourceLayer: movie.sourceLayer || movie.layer || "外部片库",
  };
}

function posterUrl(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  return `${POSTER_BASE}${path}`;
}

function createInitialState() {
  const hiddenMovieIds = seedMovies.map((movie) => movie.id);
  return {
    version: 2,
    movies: seedMovies,
    watchCart: [],
    likedMovieIds: seedMovies.filter((movie) => movie.liked).map((movie) => movie.id),
    hiddenMovieIds,
    swipeHistory: [],
    candidateCache: fallbackCandidates.filter((movie) => !hiddenMovieIds.includes(movie.id)),
    topicPages: {},
    searchResults: [],
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return migrateState(JSON.parse(saved));
    } catch {
      return createInitialState();
    }
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return createInitialState();

  try {
    return migrateLegacyState(JSON.parse(legacy));
  } catch {
    return createInitialState();
  }
}

function migrateLegacyState(legacy) {
  const movies = (legacy.movies || seedMovies).map((movie) => normalizeMovie(movie));
  const likedMovieIds = new Set(legacy.likedMovieIds || []);
  (legacy.fillQueue || []).forEach((id) => likedMovieIds.add(id));
  movies.forEach((movie) => {
    if (likedMovieIds.has(movie.id)) movie.liked = true;
  });
  const hiddenMovieIds = new Set([
    ...movies.filter((movie) => movie.watched).map((movie) => movie.id),
    ...(legacy.watchCart || []),
    ...(legacy.fillQueue || []),
  ]);
  return {
    ...createInitialState(),
    movies,
    watchCart: legacy.watchCart || [],
    likedMovieIds: [...likedMovieIds],
    hiddenMovieIds: [...hiddenMovieIds],
    candidateCache: fallbackCandidates.filter((movie) => !hiddenMovieIds.has(movie.id)),
  };
}

function migrateState(saved) {
  const base = createInitialState();
  const movies = (saved.movies || base.movies).map((movie) => normalizeMovie(movie));
  const likedMovieIds = new Set(saved.likedMovieIds || movies.filter((movie) => movie.liked).map((movie) => movie.id));
  const hiddenMovieIds = new Set(saved.hiddenMovieIds || []);
  movies.forEach((movie) => {
    if (movie.watched || movie.liked) hiddenMovieIds.add(movie.id);
    if (likedMovieIds.has(movie.id)) movie.liked = true;
  });
  (saved.watchCart || []).forEach((id) => hiddenMovieIds.add(id));
  return {
    ...base,
    ...saved,
    version: 2,
    movies,
    watchCart: saved.watchCart || [],
    likedMovieIds: [...likedMovieIds],
    hiddenMovieIds: [...hiddenMovieIds],
    swipeHistory: saved.swipeHistory || [],
    candidateCache: dedupeMovies([...(saved.candidateCache || []), ...base.candidateCache]).filter((movie) => !hiddenMovieIds.has(movie.id)),
    topicPages: saved.topicPages || {},
    searchResults: (saved.searchResults || []).map((movie) => normalizeMovie(movie)),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <main class="app-shell scene-${view}">
      ${renderHeader()}
      ${renderView()}
      ${renderBottomNav()}
    </main>
    ${selectedMovieId ? renderDetailModal(selectedMovieId) : ""}
  `;
  bindEvents();
  if (view === "swipe") {
    bindDragCard();
    ensureCandidateSupply();
  }
}

function renderHeader() {
  const subtitles = {
    swipe: "把电影海报放在桌上，拖向左边或右边。",
    search: "在电脑桌前检索电影，也让推荐走远一点。",
    archive: "墙上贴着看过的电影，喜欢的那几张更亮。",
  };
  return `
    <header class="app-header">
      <div>
        <p class="eyebrow">私人电影回溯</p>
        <h1>${viewLabel(view)}</h1>
        <p>${subtitles[view]}</p>
      </div>
    </header>
  `;
}

function renderView() {
  if (view === "search") return renderSearch();
  if (view === "archive") return renderArchive();
  return renderSwipe();
}

function renderBottomNav() {
  const items = [
    ["swipe", "▱", "滑动"],
    ["search", "⌕", "搜索"],
    ["archive", "▦", "资料"],
  ];
  return `
    <nav class="bottom-nav">
      ${items.map(([id, icon, label]) => `
        <button class="${view === id ? "active" : ""}" data-view="${id}" aria-label="${label}">
          <span>${icon}</span>
          <small>${label}</small>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderSwipe() {
  return `
    <section class="swipe-layout">
      <div class="topic-strip">
        ${topics.map((topic) => `
          <button class="${activeTopic === topic.id ? "active" : ""}" data-topic="${topic.id}">
            <strong>${topic.name}</strong>
            <span>${topic.hint}</span>
          </button>
        `).join("")}
      </div>
      <div class="desk-scene">
        <div class="desk-prop prop-cup"></div>
        <div class="desk-prop prop-note"></div>
        <div class="desk-prop prop-pencil"></div>
        ${breakStep ? renderBreakCard() : renderSwipeCard()}
      </div>
    </section>
  `;
}

function renderSwipeCard() {
  const movie = currentCandidate();
  if (!movie) {
    return `
      <article class="state-card">
        <h2>正在补电影</h2>
        <p>${apiStatus || "这一刻桌面上没有新海报了。外部资料源可用时会继续补货；也可以换一个主题。"}</p>
        <button class="primary-button" data-action="load-more">再取一批</button>
      </article>
    `;
  }

  return `
    <article class="swipe-card" data-drag-card data-movie-id="${movie.id}">
      <div class="swipe-signal signal-left">没看过</div>
      <div class="swipe-signal signal-right">看过</div>
      <div class="paper-shadow"></div>
      <div class="swipe-poster">
        ${renderPoster(movie)}
      </div>
      <div class="swipe-meta">
        <span>${escapeHtml(movie.sourceLayer || "候选")}</span>
        <h2>${escapeHtml(movie.title)}</h2>
        <p>${escapeHtml(movieLine(movie))}</p>
        <div class="tag-row">${movie.tags.slice(0, 4).map(renderTag).join("")}</div>
      </div>
    </article>
  `;
}

function renderBreakCard() {
  const source = breakStep === 1 ? currentBatch.left : currentBatch.right;
  const title = breakStep === 1 ? "刚刚没看过的里面" : "刚刚看过的里面";
  const prompt = breakStep === 1
    ? "有哪几部感兴趣？按下去，放进待看。"
    : "哪些是真的喜欢？按下去，挂到喜欢墙。";
  const action = breakStep === 1 ? "加入待看" : "标记我喜欢";
  return `
    <article class="break-card">
      <p class="eyebrow">中场 ${breakStep} / 2</p>
      <h2>${title}</h2>
      <p>${prompt}</p>
      ${source.length ? `
        <div class="mini-poster-grid">
          ${source.map((movie) => `
            <button class="mini-poster ${selectedBreakIds.has(movie.id) ? "selected" : ""}" data-break-select="${movie.id}">
              ${renderPoster(movie)}
              <span>${escapeHtml(movie.title)}</span>
            </button>
          `).join("")}
        </div>
      ` : `<div class="empty">这一轮没有对应电影，可以直接继续。</div>`}
      <button class="primary-button" data-action="confirm-break">${action}</button>
    </article>
  `;
}

function renderSearch() {
  const localMatches = searchQuery ? state.movies.filter((movie) => searchable(movie).includes(searchQuery.toLowerCase())) : [];
  const externalResults = state.searchResults.filter((movie) => !state.movies.some((item) => item.id === movie.id));
  return `
    <section class="search-scene">
      <div class="computer">
        <div class="monitor">
          <div class="search-bar">
            <input class="field" data-search-input placeholder="搜索片名、导演、国家，也可以搜一个气质" value="${escapeHtml(searchQuery)}" />
            <button class="primary-button" data-action="search">搜索</button>
          </div>
          <p class="microcopy">${searchStatus || "搜索会同时查你的资料库和外部电影资料。"}</p>
          <div class="search-results">
            ${renderSearchSection("本地资料", localMatches)}
            ${renderSearchSection("外部电影", externalResults)}
          </div>
        </div>
      </div>
      <aside class="recommend-desk">
        <h2>AI 推荐</h2>
        <p>让推荐走出热门榜单：小众、老片、冷门国家、相似气质。</p>
        <div class="recommend-actions">
          <button data-recommend="小众优质">小众优质</button>
          <button data-recommend="经典老片">经典老片</button>
          <button data-recommend="冷门国家">冷门国家</button>
          <button data-recommend="相似气质">相似气质</button>
        </div>
        <div class="recommend-list">
          ${(recommendations.length ? recommendations : buildLocalRecommendations("小众优质")).map(renderRecommendation).join("")}
        </div>
      </aside>
    </section>
  `;
}

function renderSearchSection(title, movies) {
  return `
    <div class="result-section">
      <h3>${title}</h3>
      ${movies.length ? `
        <div class="result-list">
          ${movies.slice(0, 8).map((movie) => `
            <article class="result-row">
              <button data-open-movie="${movie.id}" class="thumb">${renderPoster(movie)}</button>
              <div>
                <strong>${escapeHtml(movie.title)}</strong>
                <p>${escapeHtml(movieLine(movie) || "资料待补")}</p>
              </div>
              <button class="small-button" data-add-watch="${movie.id}">待看</button>
              <button class="small-button" data-mark-seen="${movie.id}">已看</button>
            </article>
          `).join("")}
        </div>
      ` : `<p class="empty compact">暂无结果。</p>`}
    </div>
  `;
}

function renderRecommendation(movie) {
  return `
    <article class="recommend-card">
      <div class="thumb">${renderPoster(movie)}</div>
      <div>
        <strong>${escapeHtml(movie.title)}</strong>
        <p>${escapeHtml(movieLine(movie))}</p>
        <p>理由：${escapeHtml(movie.reason || recommendationReason(movie))}</p>
        <button class="small-button" data-add-watch="${movie.id}">加入待看</button>
      </div>
    </article>
  `;
}

function renderArchive() {
  const watched = state.movies.filter((movie) => movie.watched);
  const liked = watched.filter((movie) => movie.liked || state.likedMovieIds.includes(movie.id));
  const watchCart = state.watchCart.map(findAnyMovie).filter(Boolean);
  const groups = { watched, liked, watch: watchCart };
  const movies = groups[archiveMode] || watched;
  return `
    <section class="archive-scene">
      <div class="wall-controls">
        <button class="${archiveMode === "watched" ? "active" : ""}" data-archive-mode="watched">已看 ${watched.length}</button>
        <button class="${archiveMode === "liked" ? "active" : ""}" data-archive-mode="liked">我喜欢 ${liked.length}</button>
        <button class="${archiveMode === "watch" ? "active" : ""}" data-archive-mode="watch">待看 ${watchCart.length}</button>
      </div>
      <div class="poster-wall ${archiveMode === "liked" ? "favorite-wall" : ""}">
        ${movies.length ? movies.map(renderWallPoster).join("") : `<div class="empty wall-empty">这面墙还空着。</div>`}
      </div>
    </section>
  `;
}

function renderWallPoster(movie) {
  const favorite = movie.liked || state.likedMovieIds.includes(movie.id);
  return `
    <button class="wall-poster ${favorite ? "liked" : ""}" data-open-movie="${movie.id}">
      ${renderPoster(movie)}
      <span>${escapeHtml(movie.title)}</span>
    </button>
  `;
}

function renderDetailModal(id) {
  const movie = findAnyMovie(id);
  if (!movie) return "";
  return `
    <div class="modal-backdrop" data-close-modal>
      <section class="modal" data-modal>
        <div class="modal-head">
          <div>
            <p class="eyebrow">电影资料</p>
            <h2>${escapeHtml(movie.title)}</h2>
          </div>
          <button class="icon-button" data-close-modal>关闭</button>
        </div>
        <div class="detail-layout">
          <div class="detail-poster">${renderPoster(movie)}</div>
          <form class="detail-form" data-detail-form="${movie.id}">
            <div class="form-grid">
              ${renderInput("title", "片名", movie.title)}
              ${renderInput("country", "国家 / 地区", movie.country)}
              ${renderInput("director", "导演", movie.director)}
              ${renderInput("year", "上映年份", movie.year)}
            </div>
            ${renderInput("poster", "海报 URL", movie.poster)}
            <div class="form-grid">
              ${renderInput("memoryTime", "什么时候看的", movie.memoryTime)}
              ${renderInput("memoryStrength", "记忆强度 0-5", movie.memoryStrength)}
            </div>
            ${renderInput("tags", "标签，用逗号分隔", movie.tags.join(", "))}
            <label class="label"><span>备注</span><textarea class="field" name="note">${escapeHtml(movie.note)}</textarea></label>
            <label class="label"><span>我喜欢它的介绍</span><textarea class="field intro-field" name="exhibit">${escapeHtml(movie.exhibit)}</textarea></label>
            <div class="form-grid">
              <label class="label"><span>状态</span>
                <select class="field" name="watched">
                  <option value="true" ${movie.watched ? "selected" : ""}>已看</option>
                  <option value="false" ${!movie.watched ? "selected" : ""}>未看 / 待看</option>
                </select>
              </label>
              <label class="label"><span>喜欢</span>
                <select class="field" name="liked">
                  <option value="true" ${movie.liked ? "selected" : ""}>我喜欢</option>
                  <option value="false" ${!movie.liked ? "selected" : ""}>普通已看</option>
                </select>
              </label>
            </div>
            <div class="button-row">
              <button class="primary-button" type="submit">保存</button>
              <button class="ghost-button" type="button" data-delete-movie="${movie.id}">删除</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;
}

function renderInput(name, label, value = "") {
  return `
    <label class="label">
      <span>${label}</span>
      <input class="field" name="${name}" value="${escapeHtml(String(value ?? ""))}" />
    </label>
  `;
}

function renderPoster(movie) {
  return movie.poster
    ? `<img src="${movie.poster}" alt="${escapeHtml(movie.title)}海报" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'poster-fallback',textContent:'${escapeJs(movie.title)}'}))" />`
    : `<div class="poster-fallback">${escapeHtml(movie.title)}</div>`;
}

function renderTag(tag) {
  return `<span class="tag">${escapeHtml(tag)}</span>`;
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      selectedMovieId = null;
      render();
    });
  });

  document.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTopic = button.dataset.topic;
      ensureCandidateSupply(true);
      render();
    });
  });

  document.querySelectorAll("[data-break-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.breakSelect;
      selectedBreakIds.has(id) ? selectedBreakIds.delete(id) : selectedBreakIds.add(id);
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "confirm-break") confirmBreak();
      if (button.dataset.action === "search") runSearch();
      if (button.dataset.action === "load-more") ensureCandidateSupply(true);
    });
  });

  document.querySelectorAll("[data-search-input]").forEach((input) => {
    input.addEventListener("input", () => {
      searchQuery = input.value;
      render();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") runSearch();
    });
  });

  document.querySelectorAll("[data-recommend]").forEach((button) => {
    button.addEventListener("click", () => runRecommendations(button.dataset.recommend));
  });

  document.querySelectorAll("[data-archive-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      archiveMode = button.dataset.archiveMode;
      render();
    });
  });

  document.querySelectorAll("[data-open-movie]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.openMovie;
      ensureMovieStored(id);
      selectedMovieId = id;
      render();
    });
  });

  document.querySelectorAll("[data-add-watch]").forEach((button) => {
    button.addEventListener("click", () => addToWatchCart(button.dataset.addWatch));
  });

  document.querySelectorAll("[data-mark-seen]").forEach((button) => {
    button.addEventListener("click", () => markSeen(button.dataset.markSeen));
  });

  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal]") && !event.target.matches("[data-close-modal]")) return;
      selectedMovieId = null;
      render();
    });
  });

  document.querySelectorAll("[data-detail-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveMovieForm(form);
    });
  });

  document.querySelectorAll("[data-delete-movie]").forEach((button) => {
    button.addEventListener("click", () => deleteMovie(button.dataset.deleteMovie));
  });
}

function bindDragCard() {
  const card = document.querySelector("[data-drag-card]");
  if (!card) return;
  card.addEventListener("pointerdown", (event) => {
    card.setPointerCapture(event.pointerId);
    dragState = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: 0,
      pointerId: event.pointerId,
    };
    card.classList.add("dragging");
  });
  card.addEventListener("pointermove", (event) => {
    if (!dragState) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    dragState.currentX = dx;
    const rotation = Math.max(-12, Math.min(12, dx / 12));
    card.style.transform = `translate(${dx}px, ${dy * 0.18}px) rotate(${rotation}deg)`;
    card.dataset.intent = dx > 36 ? "right" : dx < -36 ? "left" : "";
  });
  card.addEventListener("pointerup", () => finishDrag(card));
  card.addEventListener("pointercancel", () => resetDrag(card));
}

function finishDrag(card) {
  if (!dragState) return;
  const dx = dragState.currentX;
  if (Math.abs(dx) > SWIPE_THRESHOLD) {
    const direction = dx > 0 ? "right" : "left";
    card.classList.add(direction === "right" ? "fly-right" : "fly-left");
    window.setTimeout(() => handleSwipe(direction), 180);
  } else {
    resetDrag(card);
  }
}

function resetDrag(card) {
  dragState = null;
  card.classList.remove("dragging");
  card.dataset.intent = "";
  card.style.transform = "";
}

function handleSwipe(direction) {
  const movie = currentCandidate();
  if (!movie) return;
  hideMovie(movie.id, direction);
  removeCandidate(movie.id);
  if (direction === "right") {
    const stored = ensureMovieStored(movie.id, { ...movie, watched: true });
    stored.watched = true;
    currentBatch.right.push(stored);
  } else {
    currentBatch.left.push(movie);
  }
  state.swipeHistory.push({ id: movie.id, direction, at: Date.now(), topic: activeTopic });
  if ((currentBatch.left.length + currentBatch.right.length) % SWIPE_BATCH_SIZE === 0) {
    breakStep = 1;
    selectedBreakIds = new Set();
  }
  saveState();
  render();
}

function confirmBreak() {
  if (breakStep === 1) {
    selectedBreakIds.forEach((id) => addToWatchCart(id, false));
    breakStep = 2;
    selectedBreakIds = new Set();
  } else {
    selectedBreakIds.forEach((id) => markLiked(id));
    currentBatch = { left: [], right: [] };
    breakStep = 0;
    selectedBreakIds = new Set();
  }
  saveState();
  render();
}

function currentCandidate() {
  const hidden = new Set(state.hiddenMovieIds);
  return state.candidateCache.find((movie) => !hidden.has(movie.id));
}

function removeCandidate(id) {
  state.candidateCache = state.candidateCache.filter((movie) => movie.id !== id);
}

async function ensureCandidateSupply(force = false) {
  const available = state.candidateCache.filter((movie) => !state.hiddenMovieIds.includes(movie.id));
  if (!force && available.length > LOW_CANDIDATE_WATERMARK) return;
  apiStatus = force ? "正在从外部片库取一批新电影。" : apiStatus;
  try {
    const nextPage = (state.topicPages[activeTopic] || 0) + 1;
    const response = await fetch(`/api/discover?topic=${encodeURIComponent(activeTopic)}&page=${nextPage}`);
    if (!response.ok) throw new Error("discover failed");
    const payload = await response.json();
    state.topicPages[activeTopic] = payload.page || nextPage;
    const incoming = (payload.movies || []).map((movie) => normalizeMovie(movie));
    addCandidates(incoming);
    apiStatus = payload.source === "fallback" ? "还没有配置 TMDb key，先用内置候选兜底。" : "";
  } catch {
    apiStatus = "外部资料源暂时不可用，先用内置候选兜底。";
    addCandidates(fallbackCandidates);
  }
  saveState();
  if (view === "swipe") render();
}

function addCandidates(movies) {
  const hidden = new Set(state.hiddenMovieIds);
  const existing = new Set(state.candidateCache.map((movie) => movie.id));
  movies.forEach((movie) => {
    if (!movie.id || hidden.has(movie.id) || existing.has(movie.id)) return;
    state.candidateCache.push(movie);
    existing.add(movie.id);
  });
  state.candidateCache = shuffleByTopic(dedupeMovies(state.candidateCache));
}

async function runSearch() {
  const query = searchQuery.trim();
  if (!query) {
    searchStatus = "输入一个片名、导演、国家或气质。";
    render();
    return;
  }
  searchStatus = "正在搜索外部片库。";
  render();
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error("search failed");
    const payload = await response.json();
    state.searchResults = (payload.movies || []).map((movie) => normalizeMovie(movie));
    searchStatus = payload.source === "fallback" ? "还没有配置 TMDb key，先显示本地和内置结果。" : "搜索完成。";
  } catch {
    state.searchResults = fallbackCandidates.filter((movie) => searchable(movie).includes(query.toLowerCase()));
    searchStatus = "外部搜索暂时不可用，先显示本地和内置结果。";
  }
  saveState();
  render();
}

async function runRecommendations(scope) {
  recommendations = [];
  searchStatus = `正在准备「${scope}」推荐。`;
  render();
  try {
    const response = await fetch(`/api/discover?topic=${encodeURIComponent(scope)}&page=1`);
    if (!response.ok) throw new Error("recommend failed");
    const payload = await response.json();
    recommendations = (payload.movies || [])
      .map((movie) => normalizeMovie({ ...movie, reason: "" }))
      .filter((movie) => !state.hiddenMovieIds.includes(movie.id))
      .slice(0, 8)
      .map((movie) => ({ ...movie, reason: recommendationReason(movie, scope) }));
  } catch {
    recommendations = buildLocalRecommendations(scope);
  }
  searchStatus = `已生成「${scope}」方向推荐。`;
  render();
}

function buildLocalRecommendations(scope) {
  const hidden = new Set(state.hiddenMovieIds);
  const scopeMap = {
    小众优质: ["小众高分", "相似气质"],
    经典老片: ["经典老片"],
    冷门国家: ["冷门国家"],
    相似气质: ["相似气质", "生活流"],
  };
  const layers = scopeMap[scope] || [scope];
  return fallbackCandidates
    .filter((movie) => !hidden.has(movie.id))
    .filter((movie) => layers.some((layer) => movie.sourceLayer.includes(layer) || movie.tags.includes(layer)))
    .slice(0, 8)
    .map((movie) => ({ ...movie, reason: recommendationReason(movie, scope) }));
}

function recommendationReason(movie, scope = "") {
  if (movie.sourceLayer === "冷门国家" || scope === "冷门国家") return `它来自更少被默认榜单照亮的地区，适合拓宽你的电影墙。`;
  if (movie.sourceLayer === "经典老片" || scope === "经典老片") return `它是老电影里仍然有生命力的一支，适合补一块电影史拼图。`;
  if (movie.sourceLayer === "小众高分" || scope === "小众优质") return `它不是纯热门榜单逻辑，更偏作者表达和口碑积累。`;
  return `它和你库里的情绪、风格或作者电影倾向有相近气质。`;
}

function ensureMovieStored(id, source) {
  let movie = state.movies.find((item) => item.id === id);
  if (movie) return movie;
  const origin = source || findAnyMovie(id);
  if (!origin) return null;
  movie = normalizeMovie(origin);
  state.movies.push(movie);
  return movie;
}

function addToWatchCart(id, shouldRender = true) {
  const movie = ensureMovieStored(id);
  if (!movie) return;
  movie.watched = false;
  hideMovie(movie.id, "watch");
  addUnique(state.watchCart, movie.id);
  saveState();
  if (shouldRender) render();
}

function markSeen(id) {
  const movie = ensureMovieStored(id);
  if (!movie) return;
  movie.watched = true;
  state.watchCart = state.watchCart.filter((item) => item !== movie.id);
  hideMovie(movie.id, "right");
  saveState();
  render();
}

function markLiked(id) {
  const movie = ensureMovieStored(id);
  if (!movie) return;
  movie.watched = true;
  movie.liked = true;
  addUnique(state.likedMovieIds, movie.id);
  hideMovie(movie.id, "liked");
}

function hideMovie(id, reason) {
  addUnique(state.hiddenMovieIds, id);
  state.swipeHistory.push({ id, reason, at: Date.now(), topic: activeTopic });
}

function saveMovieForm(form) {
  const id = form.dataset.detailForm;
  const movie = ensureMovieStored(id);
  if (!movie) return;
  const data = new FormData(form);
  ["title", "country", "director", "year", "poster", "memoryTime", "memoryStrength", "note", "exhibit"].forEach((key) => {
    movie[key] = data.get(key) || "";
  });
  movie.watched = data.get("watched") === "true";
  movie.liked = data.get("liked") === "true";
  movie.tags = String(data.get("tags") || "")
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (movie.liked) addUnique(state.likedMovieIds, movie.id);
  if (!movie.liked) state.likedMovieIds = state.likedMovieIds.filter((item) => item !== movie.id);
  if (movie.watched) state.watchCart = state.watchCart.filter((item) => item !== movie.id);
  hideMovie(movie.id, "edited");
  selectedMovieId = null;
  saveState();
  render();
}

function deleteMovie(id) {
  state.movies = state.movies.filter((movie) => movie.id !== id);
  state.watchCart = state.watchCart.filter((item) => item !== id);
  state.likedMovieIds = state.likedMovieIds.filter((item) => item !== id);
  selectedMovieId = null;
  saveState();
  render();
}

function findAnyMovie(id) {
  return (
    state.movies.find((movie) => movie.id === id) ||
    state.candidateCache.find((movie) => movie.id === id) ||
    state.searchResults.find((movie) => movie.id === id) ||
    fallbackCandidates.find((movie) => movie.id === id)
  );
}

function dedupeMovies(movies) {
  const seen = new Set();
  return movies
    .map((movie) => normalizeMovie(movie))
    .filter((movie) => {
      if (seen.has(movie.id)) return false;
      seen.add(movie.id);
      return true;
    });
}

function shuffleByTopic(movies) {
  return [...movies].sort((a, b) => {
    const layerA = layerWeight(a.sourceLayer);
    const layerB = layerWeight(b.sourceLayer);
    if (layerA !== layerB) return layerA - layerB;
    return a.title.localeCompare(b.title, "zh-CN");
  });
}

function layerWeight(layer = "") {
  const weights = { 热门佳作: 1, 小众高分: 2, 经典老片: 3, 冷门国家: 4, 相似气质: 5 };
  return weights[layer] || 6;
}

function searchable(movie) {
  return [movie.title, movie.director, movie.country, movie.year, ...(movie.tags || [])].join(" ").toLowerCase();
}

function movieLine(movie) {
  return [movie.country, movie.director, movie.year].filter(Boolean).join(" · ");
}

function viewLabel(id) {
  return { swipe: "滑动区", search: "搜索区", archive: "资料区" }[id] || "滑动区";
}

function addUnique(list, id) {
  if (!list.includes(id)) list.push(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(value) {
  return escapeHtml(value).replaceAll("\\", "\\\\").replaceAll("`", "\\`");
}

render();
