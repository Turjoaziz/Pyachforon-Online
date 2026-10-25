# 🎭 প্যাঁচফোড়ন — Pyachforon Online

An unofficial, independent Bengali word-guessing multiplayer browser game. Play together across phones with private six-character room codes.

**Play online:** https://pyachforon-online.onrender.com (availability depends on deployment and server status)

## How to play / কীভাবে খেলবেন

1. Open the game website and enter your name.
2. One player selects **Create Room**, then shares the six-character private room code.
3. Friends select **Join Room**, enter the code and choose a nickname.
4. The host assigns players to 2–4 teams, chooses 30/60/90-second turns, and starts the game.
5. The selected clue-giver privately sees a Bengali word; their team guesses it. Tap **Correct** (+1) when guessed or **Skip** to pass.
6. Play three rounds with the same word pool: **Round 1:** explain freely without saying the word; **Round 2:** one word plus gestures; **Round 3:** silent acting/charades only.
7. The team with the highest score after the third round wins.

## Features

- Private multiplayer room codes and real-time synchronized team scores
- Mobile-friendly Bengali interface and server-controlled clue visibility
- Automatic reconnection using a session token stored in the browser tab
- 30-minute grace period for empty rooms while the server remains alive
- Original Bengali cards and optional custom words

**Important:** Rooms and scores are currently in server memory; a host restart or free-service spin-down clears active rooms. A reconnect can recover a player's place during network disruptions while that process remains alive, but not after a restart. If a player closes the tab and opens a new tab, their session token may not be available.

## Development

Requires Node.js 20+.

```bash
cd pyachforon-vscode-render/pyachforon-vscode
npm install
npm run dev
```

Open http://localhost:5173. The dev backend runs on port 3001.

## Production / Render

This repository currently stores the application inside `pyachforon-vscode-render/pyachforon-vscode`.

- Runtime: Node.js 22
- Build: `cd pyachforon-vscode-render/pyachforon-vscode && npm install && npm run build`
- Start: `cd pyachforon-vscode-render/pyachforon-vscode && npm start`
- Optional environment: `NODE_ENV=production`, `NODE_VERSION=22`

See the [full project README](pyachforon-vscode-render/pyachforon-vscode/README.md) for setup and gameplay details.

## Note

This is an independent digital adaptation, not an official product of the publisher of any similarly named tabletop game.
