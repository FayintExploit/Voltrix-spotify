// ================================================
//   FayintxCode Spotify Proxy
//   by fayintz
//   Deploy ke Vercel / Railway / Render
// ================================================

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// ─── CONFIG ──────────────────────────────────────
const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID     || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
// ─────────────────────────────────────────────────

let tokenCache = { token: null, expiry: 0 };

// ── Get Spotify Token ─────────────────────────────
async function getToken() {
    if (tokenCache.token && Date.now() < tokenCache.expiry - 60000) {
        return tokenCache.token;
    }

    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${creds}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });

    if (!res.ok) throw new Error("Token fetch failed: " + res.status);

    const data = await res.json();
    tokenCache.token  = data.access_token;
    tokenCache.expiry = Date.now() + (data.expires_in * 1000);
    return tokenCache.token;
}

// ── CORS (biar Roblox bisa akses) ────────────────
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    next();
});

// ── GET /spotify?q=nama+lagu ──────────────────────
app.get("/spotify", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Query required" });

    try {
        const token = await getToken();

        const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
            { headers: { "Authorization": `Bearer ${token}` } }
        );

        if (!searchRes.ok) return res.status(searchRes.status).json({ error: "Spotify error" });

        const data  = await searchRes.json();
        const items = data?.tracks?.items;

        if (!items || items.length === 0) {
            return res.json({ found: false, message: "Lagu tidak ditemukan" });
        }

        const track = items[0];
        const ms    = track.duration_ms;
        const dur   = `${Math.floor(ms/60000)}:${String(Math.floor((ms%60000)/1000)).padStart(2,"0")}`;

        return res.json({
            found:      true,
            name:       track.name,
            artist:     track.artists.map(a => a.name).join(", "),
            album:      track.album.name,
            duration:   dur,
            popularity: track.popularity,
            preview_url: track.preview_url || null,
            url:        track.external_urls.spotify,
            image:      track.album.images?.[0]?.url || null
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});

// ── Health check ──────────────────────────────────
app.get("/", (req, res) => {
    res.json({ status: "FayintxCode Spotify Proxy running 🎵" });
});

app.listen(PORT, () => {
    console.log(`Proxy running on port ${PORT}`);
});
