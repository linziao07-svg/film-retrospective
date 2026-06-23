const TMDB_BASE = "https://api.themoviedb.org/3";

exports.handler = async (event) => {
  const q = (event.queryStringParameters?.q || "").trim();
  const token = process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN;

  if (!q) return json({ source: "empty", movies: [] });
  if (!token) return json({ source: "fallback", movies: [] });

  try {
    const url = `${TMDB_BASE}/search/movie?query=${encodeURIComponent(q)}&include_adult=false&language=zh-CN&page=1`;
    const payload = await tmdb(url, token);
    const movies = (payload.results || [])
      .filter((item) => item && item.id)
      .map((item) => ({
        id: `tmdb-${item.id}`,
        tmdbId: String(item.id),
        title: item.title || item.name,
        country: "",
        director: "",
        year: (item.release_date || "").slice(0, 4),
        poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
        tags: ["外部搜索"],
        sourceLayer: "外部搜索",
      }));
    return json({ source: "tmdb", movies });
  } catch (error) {
    return json({ source: "fallback", error: "tmdb_unavailable", movies: [] });
  }
};

async function tmdb(url, token) {
  const headers = token.startsWith("ey")
    ? { Authorization: `Bearer ${token}` }
    : {};
  const apiUrl = token.startsWith("ey") ? url : `${url}&api_key=${token}`;
  const response = await fetch(apiUrl, { headers });
  if (!response.ok) throw new Error(`tmdb ${response.status}`);
  return response.json();
}

function json(body) {
  return {
    statusCode: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
