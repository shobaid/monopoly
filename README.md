# Monopoly Online

A full, real-rules Monopoly game (40-space board, all properties, railroads,
utilities, Chance/Community Chest cards, jail, houses/hotels, mortgaging,
bankruptcy) you can host on Vercel and play online with friends via a shareable
room link.

## How it works

- Next.js app. The board/game logic lives in `lib/engine.js` (server-authoritative —
  every action is validated on the server, so no one can cheat by editing client state).
- Game state for each room is stored in **Upstash Redis** (a free serverless Redis),
  so it's shared correctly across Vercel's serverless functions. This is required —
  without it, each player's requests could hit a different server instance with no
  shared memory, and the game would break.
- The browser polls the server every ~1.8s for the latest state — no special
  infrastructure needed, works everywhere, reconnects automatically if someone's
  phone locks or their tab reloads.

## 1. Set up a free Upstash Redis database (2 minutes)

1. Go to https://console.upstash.com/ and sign up (free tier is plenty).
2. Create a new Redis database (any region close to you).
3. On the database page, copy the **REST URL** and **REST TOKEN**.

## 2. Run locally (optional)

```bash
npm install
cp .env.example .env.local
# paste your Upstash values into .env.local
npm run dev
```

Open http://localhost:3000.

## 3. Deploy to Vercel

**Easiest path — Vercel CLI:**
```bash
npm install -g vercel
vercel
```
When prompted, add the two environment variables (`UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`) or add them afterward in the Vercel dashboard under
**Project → Settings → Environment Variables**, then redeploy.

**Or via GitHub:**
1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Add the two environment variables in the import screen (or after, in Settings).
4. Deploy.

## 4. Play

1. Open your deployed URL, enter your name, click **Create New Room**.
2. Click **Copy invite link** and send it to friends (WhatsApp, iMessage, whatever).
3. They open the link, enter their name, and they're in the lobby.
4. Once everyone's in (2–8 players), the host clicks **Start Game**.
5. Play proceeds turn by turn — roll dice, buy properties, build houses once you
   own a full color group, pay rent, land in Jail, use Chance/Community Chest, etc.
   Tap any tile on the board to see its details or manage it (build/mortgage) on
   your turn.

## What's new in this version

- **Redesigned 3D-style board** — realistic bevels, a felt-green center, and raised tiles
  (original artwork — not a copy of Hasbro's board/logo, since that's copyrighted).
- **Animated 3D dice** — real CSS cubes that spin and land on the correct face.
- **Player pawns on the board** — colored tokens that slide between tiles and bounce on landing.
- **Chance / Community Chest card-flip animation** — pops up for everyone at the table when a card is drawn.
- **"My Properties" panel** — see everything you own, with mortgage/house/hotel status, at a glance.
- **Full trading** — propose a trade (cash and/or properties) to any other player; they can accept,
  decline, or you can cancel while it's pending. Trades are validated server-side (can't offer what
  you don't have, can't trade mortgaged/developed properties, etc.).
- **Host-configurable starting cash** — set it in the lobby before the game starts (default $1,500).
- All amounts are in USD ($).

## Rules implemented

- Standard $1500 starting cash, passing GO collects $200.
- Buying unowned properties, railroads, and utilities.
- Rent scaling with houses/hotels, monopoly doubling, railroad count (25/50/100/200),
  and utility rent (4x/10x dice roll).
- Full Chance and Community Chest decks (movement, cash, jail, "get out of jail free" cards, repairs, pay-each-player, etc.).
- Jail: pay $50, use a jail-free card, or try rolling doubles (auto-released with a $50 fine after 3 failed tries).
- Rolling doubles grants another turn; three doubles in a row sends you to Jail.
- Building houses/hotels with the even-building rule, selling houses back at half price.
- Mortgaging/unmortgaging (10% interest to unmortgage).
- Bankruptcy: auto-mortgages what it can, then removes the player and returns their
  properties to the bank; game ends when one player remains.

## Notes / limitations

- No trading between players yet (you can still negotiate verbally and use
  mortgage/sell actions to simulate deals).
- Auction-on-decline is simplified to "no one buys it" rather than a full bidding auction.
- Rooms expire after 24 hours of inactivity.
