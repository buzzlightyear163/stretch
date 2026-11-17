# STRETCH — buys the final stretch.

Your Final Stretch tab, on autopilot. Every coin at 85%+ on its bonding curve gets six checks, live. Only the clean ones get bought.

## What's in here

| File | What it is |
|---|---|
| `index.html` | The whole site in one file (built from `src/`). |
| `api/stretch.js` | Tiny Vercel function: reads Jupiter, grades every coin, keeps the shared migration log. |
| `lib/core.js` | The six checks and the log logic. Used by the function and by the page. |
| `og.png`, `fav.png` | Link preview on X and the favicon. |
| `src/` | Source files (`index.src.html`, `site.css`, `termkit.js`, `build.py`) if you want to change the site. |

## Fill in at launch (top of the script in `index.html`, `CONFIG`)

- `ca`: the $STRETCH contract address (set: DH9SFhbf…htpump). Turns on the buy buttons, the CA box and the holder gate. A CA ending in `pump` links to pump.fun, any other to Raydium LaunchLab.
- `x`: the X profile link, e.g. `https://x.com/StretchBuys`.
- `engineWallet`: the public wallet you trade from. The Engine section then shows its trades on-chain.

## Deploy

GitHub → Vercel, Framework: Other, no build command. The `api/` folder becomes a function on its own.

## Data (all free, no API keys)

- Jupiter `datapi.jup.ag/v1/pools/gems` ("about to graduate" + "graduated"): curve %, holders, dev %, top 10 %, bots, 5-minute flow. pump.fun, Raydium LaunchLab and bonk.fun.
- DexScreener `api.dexscreener.com/tokens/v1/solana/...`: market cap after migration.
- PumpPortal `wss://pumpportal.fun/api/data` (`subscribeMigration`): migrations as they land.
- Solana RPC `solana-rpc.publicnode.com`: holder balance check and engine wallet trades.

## The migration log

The log is shared by every visitor and lives in the function's memory. It restarts when Vercel restarts the function. To keep it forever, add a free Upstash Redis store in Vercel (Storage tab). Vercel sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` and the log saves itself, no code change.

## Check after deploy

- Fonts load (JetBrains Mono).
- The X preview shows `og.png` (paste the link in an X draft).
- The board says `live` and shows coins, and `/api/stretch` returns JSON.
