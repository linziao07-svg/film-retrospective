const TMDB_BASE = "https://api.themoviedb.org/3";

const fallbackMovies = [
  movie("496243", "寄生虫", "韩国", "奉俊昊", "2019", "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", ["阶级", "黑色幽默"], "热门佳作"),
  movie("505192", "小偷家族", "日本", "是枝裕和", "2018", "/4nfRUOv3LX5zLn98WS1WqVBk9E9.jpg", ["家庭", "温柔"], "热门佳作"),
  movie("797", "假面", "瑞典", "英格玛·伯格曼", "1966", "/bdXbfUir63TQHA5NTNcXPICZCW8.jpg", ["心理", "黑白"], "经典老片"),
  movie("5961", "潜行者", "苏联", "安德烈·塔可夫斯基", "1979", "/lUE0Bp7wH0EterJ44qMRsqtKFnp.jpg", ["哲学", "科幻"], "经典老片"),
  movie("20334", "一次别离", "伊朗", "阿斯哈·法哈蒂", "2011", "/x7M9S4t1JK1vSTQXJ5e0mXo1t4i.jpg", ["家庭", "伦理"], "冷门国家"),
  movie("60243", "都灵之马", "匈牙利", "贝拉·塔尔", "2011", "/6ei9pW7hAf8nNDrVZhGmb2x9p5O.jpg", ["缓慢", "黑白"], "冷门国家"),
];

exports.handler = async (event) => {
  const topic = event.queryStringParameters?.topic || "mixed";
  const page = Number(event.queryStringParameters?.page || 1);
  const token = process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN;

  if (!token) {
    return json({ source: "fallback", page, movies: fallbackMovies });
  }

  try {
    const layers = await Promise.all(buildLayerUrls(topic, page).map((url) => tmdb(url, token)));
    const movies = mixLayerResults(layers, topic)
      .filter((item) => item && item.id && item.poster_path)
      .map((item) => fromTmdb(item, topic));
    const enriched = await enrichMovies(dedupe(movies).slice(0, 24), token);
    return json({ source: "tmdb", page, movies: enriched });
  } catch (error) {
    return json({ source: "fallback", page, error: "tmdb_unavailable", movies: fallbackMovies });
  }
};

function buildLayerUrls(topic, page) {
  const common = "include_adult=false&include_video=false&language=zh-CN";
  const base = `${TMDB_BASE}/discover/movie?${common}&page=${page}`;
  const oldYear = Math.max(1930, 1995 - (page % 7) * 10);
  const countries = ["IR", "PL", "CZ", "HU", "AR", "CL", "MX", "TH", "PH", "TR", "SE", "IN"];
  const country = countries[(page - 1) % countries.length];

  const topicUrls = {
    arthouse: [
      `${base}&sort_by=vote_average.desc&vote_count.gte=120&vote_count.lte=2200`,
      `${base}&sort_by=popularity.asc&vote_average.gte=7.1&vote_count.gte=80`,
      `${base}&with_original_language=fr&vote_average.gte=7`,
    ],
    classic: [
      `${base}&sort_by=vote_average.desc&primary_release_date.gte=${oldYear}-01-01&primary_release_date.lte=${oldYear + 12}-12-31&vote_count.gte=80`,
      `${base}&sort_by=popularity.desc&primary_release_date.lte=1999-12-31&vote_count.gte=500`,
    ],
    global: [
      `${base}&sort_by=vote_average.desc&with_origin_country=${country}&vote_count.gte=30`,
      `${base}&sort_by=popularity.desc&with_origin_country=${country}`,
    ],
    life: [
      `${base}&sort_by=vote_average.desc&with_genres=18&with_keywords=18035|207883|155030&vote_count.gte=80`,
      `${base}&sort_by=popularity.desc&with_genres=10751|18`,
    ],
  };

  return topicUrls[topic] || [
    `${base}&sort_by=popularity.desc&vote_average.gte=7&vote_count.gte=1200`,
    `${base}&sort_by=vote_average.desc&primary_release_date.lte=2005-12-31&vote_count.gte=500`,
    `${base}&sort_by=vote_average.desc&vote_count.gte=180&vote_count.lte=1800`,
    `${base}&sort_by=vote_average.desc&with_origin_country=${country}&vote_count.gte=80`,
  ];
}

function mixLayerResults(layers, topic) {
  if (topic !== "mixed") return layers.flatMap((layer) => layer.results || []);
  const quotas = [12, 8, 3, 1];
  return layers.flatMap((layer, index) => (layer.results || []).slice(0, quotas[index] || 4));
}

async function tmdb(url, token) {
  const headers = token.startsWith("ey")
    ? { Authorization: `Bearer ${token}` }
    : {};
  const apiUrl = token.startsWith("ey") ? url : `${url}&api_key=${token}`;
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) throw new Error(`tmdb ${response.status}`);
  return response.json();
}

function fromTmdb(item, topic) {
  return movie(
    item.id,
    item.title || item.name,
    "",
    "",
    (item.release_date || "").slice(0, 4),
    item.poster_path,
    topicTags(topic),
    topic === "global" ? "冷门国家" : topic === "classic" ? "经典老片" : topic === "arthouse" ? "小众高分" : "外部片库",
    item.overview || ""
  );
}

async function enrichMovies(movies, token) {
  const enriched = await Promise.all(
    movies.map(async (movie) => {
      try {
        const zhUrl = `${TMDB_BASE}/movie/${movie.tmdbId}?language=zh-CN&append_to_response=credits`;
        const zh = await tmdb(zhUrl, token);
        const detail = zh.overview ? zh : await tmdb(`${TMDB_BASE}/movie/${movie.tmdbId}?language=en-US&append_to_response=credits`, token);
        const director = (detail.credits?.crew || []).find((person) => person.job === "Director")?.name || movie.director;
        const country = (detail.production_countries || []).map((item) => item.name).filter(Boolean).slice(0, 2).join(" / ");
        return {
          ...movie,
          country: country || movie.country,
          director,
          year: (zh.release_date || detail.release_date || "").slice(0, 4) || movie.year,
          overview: detail.overview || movie.overview,
        };
      } catch {
        return movie;
      }
    })
  );
  return enriched;
}

function topicTags(topic) {
  return {
    arthouse: ["小众", "作者电影"],
    classic: ["经典", "老电影"],
    global: ["冷门国家", "世界电影"],
    life: ["生活流", "关系"],
  }[topic] || ["混合探索"];
}

function movie(id, title, country, director, year, posterPath, tags, sourceLayer, overview = "") {
  return {
    id: `tmdb-${id}`,
    tmdbId: String(id),
    title,
    country,
    director,
    year,
    poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : "",
    tags,
    sourceLayer,
    overview,
  };
}

function dedupe(movies) {
  const seen = new Set();
  return movies.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
}

function json(body) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
