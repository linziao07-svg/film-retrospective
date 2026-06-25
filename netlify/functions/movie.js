const TMDB_BASE = "https://api.themoviedb.org/3";

exports.handler = async (event) => {
  const rawId = (event.queryStringParameters?.id || "").trim();
  const tmdbId = rawId.replace("tmdb-", "");
  const token = process.env.TMDB_API_KEY || process.env.TMDB_ACCESS_TOKEN;

  if (!tmdbId) return json(400, { error: "missing_id" });
  if (!token) return json(200, { source: "fallback", movie: null });

  try {
    const zh = await tmdb(`${TMDB_BASE}/movie/${tmdbId}?language=zh-CN&append_to_response=credits`, token);
    const detail = zh.overview ? zh : await tmdb(`${TMDB_BASE}/movie/${tmdbId}?language=en-US&append_to_response=credits`, token);
    const director = (detail.credits?.crew || []).find((person) => person.job === "Director")?.name || "";
    const country = (detail.production_countries || []).map((item) => item.name).filter(Boolean).slice(0, 2).join(" / ");

    return json(200, {
      source: detail.overview === zh.overview ? "tmdb-zh" : "tmdb-en",
      movie: {
        id: `tmdb-${tmdbId}`,
        tmdbId,
        title: zh.title || detail.title || detail.name || "",
        country,
        director,
        year: (zh.release_date || detail.release_date || "").slice(0, 4),
        poster: (zh.poster_path || detail.poster_path) ? `https://image.tmdb.org/t/p/w500${zh.poster_path || detail.poster_path}` : "",
        overview: detail.overview || "",
        tags: ["外部资料"],
        sourceLayer: "外部资料",
      },
    });
  } catch {
    return json(200, { source: "fallback", error: "tmdb_unavailable", movie: null });
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}
