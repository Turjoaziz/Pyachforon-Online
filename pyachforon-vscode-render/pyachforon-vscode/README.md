# 🎭 প্যাঁচফোড়ন — Online Multiplayer Bengali Word Game

A mobile-friendly, real-time Bengali party word game for friends and family. Create a **private room**, share a **six-character code**, split into teams, and play from separate phones.

> This is an **unofficial, independently developed digital adaptation** using an original word list. It is not affiliated with any commercial tabletop game publisher.

## Features

- 🔐 Private six-character room codes — no account needed
- 📱 Mobile and desktop browser support
- 👥 2–4 teams, up to 24 players per room
- 🎭 Three rounds using the **same word pool**, reshuffled each round
- ⏱️ Adjustable 30-, 60- or 90-second turns
- 🃏 Secret clue visible only to the active clue-giver
- 🏆 Live team scores and winners (including ties)
- ✍️ Optional custom Bengali words added by the host
- 🔄 Restart game in the same room
- 🔌 Automatically reconnect after network interruptions and page reloads using a private session token
- ⏳ Disconnected rooms remain recoverable for up to 30 minutes while the Node process stays running

## How to play / কীভাবে খেলবেন

1. **Create a room / রুম খুলুন:** One player enters their name and selects **নতুন রুম তৈরি করুন**.
2. **Invite friends / বন্ধুদের ডাকুন:** Share the displayed six-character room code. Other players open the same website, enter their names and the code, then choose **রুমে যোগ দিন**.
3. **Create teams / দল ভাগ করুন:** The host chooses 2, 3 or 4 teams and assigns each person to a team. Every team must have at least one player.
4. **Choose a timer:** Host picks 30, 60 or 90 seconds for each turn, and optionally enters custom Bengali words.
5. **Start:** Host selects **খেলা শুরু করুন**. When the appropriate team is ready, the host or a player on that team presses **পালা শুরু করুন**. The app chooses the clue-giver.
6. **Guess:** Only the clue-giver sees the word on their own screen. Their teammates try to guess aloud. Press **✓ সঠিক +১** for a correct guess, or **↷ স্কিপ** to pass. Each correct word gives the current team one point. The next card appears immediately.
7. **Next turn:** At time-out, the next team's turn becomes available. Continue until the round's word deck is exhausted. The same set of words is shuffled for the next round.
8. **Winner:** After Round 3, the team(s) with the highest point total win.

### Three rounds / তিন রাউন্ড

| Round | Clue rules | Example for “রিকশা” |
| --- | --- | --- |
| 1 — কথায় বোঝাও | Describe freely without saying the answer | “তিন চাকার বাহন, মানুষ চালায়...” |
| 2 — এক শব্দ + ইশারা | One spoken hint word and gestures | “যানবাহন” + gestures |
| 3 — শুধুই অভিনয় | No speaking, only gestures | Pretend to pedal and pull passengers |

**House rules:** A guess is verified by the clue-giver and teammates, not by voice recognition. The game allows skips without a penalty. Card reveals and points are controlled by the server.

## Run locally with VS Code

### Requirements

- [Node.js](https://nodejs.org/) **20 or later** and npm
- VS Code

### Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. The real-time server runs on **http://localhost:3001**; Vite proxies Socket.IO requests to it.

Try two different browser windows to simulate players. For testing on separate phones connected to the same Wi-Fi, open `http://YOUR_COMPUTER_LAN_IP:5173` on each phone; Windows Firewall may require allowing Node.js access. For friends in other locations, deploy the application to a public host.

## Production deployment

```bash
npm install
npm run build
npm start
```

The Node.js server serves the built React app from `dist/` and handles Socket.IO on the same origin. Set your hosting provider's start command to `npm start` and its build command to `npm install && npm run build`. The server listens on `PORT` provided by the host (defaults to 3001). Use a **single continuously running Node instance with WebSocket support**. Because rooms are in memory, scaling to multiple instances requires a shared room store/Socket.IO adapter. Free hosts that sleep can interrupt active games.

## Project structure

```text
client/
  index.html
  vite.config.js
  src/main.jsx       # React game UI + Socket.IO client
  src/style.css      # Responsive styles
server/
  index.js           # Express + authoritative Socket.IO game server
  words.js           # Original Bengali word deck
package.json         # Install/build/run scripts
.env.example         # Optional config reference
README.md
```

## Technical notes and limitations

- Rooms are **temporary and server-memory based**. Restarting the server ends all games.
- Players who disconnect during a round lose their in-progress session; rejoining an already started room is not supported yet. Refreshing the browser is treated as a disconnect.
- Room codes are invitation codes, not passwords; do not share them publicly.
- The word deck defaults to 30 randomly chosen cards per game, replayed in each of the three rounds.
- English UI labels are minimal; game instructions and gameplay are in Bangla.
- For public production use, add automated tests, rate limiting, input abuse protections and a durable reconnect/token flow.

## Built with

React, Vite, Node.js, Express, Socket.IO and CSS.

## Suggested next improvements

- Reconnect with a stored player token
- Host moderation / kick player
- Better turn rotation and optional sound effects
- Persist completed match history
- More word categories and difficulty levels

## License

All rights reserved unless the repository owner adds a license. Third-party packages retain their own licenses.


## Connection recovery / পুনরায় যোগ দিন

The app automatically retries Socket.IO connections after a temporary connection loss. Your room code, private player ID and secret resume token are saved in **sessionStorage** for this browser tab. Refreshing that tab reconnects you to the same player identity, provided the server and room still exist. Reusing the room on a different browser/device does not recover the same identity; instead you may join a lobby with a new name.

- If the active clue-giver disconnects, the current turn ends; scores and completed rounds remain.
- When everybody disconnects, the room is kept in server memory for up to **30 minutes** before cleanup. If the service restarts or sleeps, rooms and scores are lost.
- Room codes restrict casual access, but aren't authentication. Do not share your resume token.

**Important limitation:** This version does **not** provide durable rooms after a Render restart. To preserve rooms through server restarts, a shared persistent database (e.g. Redis/Valkey) is needed. Run one server instance only with this in-memory version. For always-online low-latency multiplayer consider a paid always-on instance.

## Deploy to Render

1. Create a new GitHub repository (e.g. `Pyachforon-Online`) and push this entire directory.
2. In Render, create a **Web Service** connected to that repository. Choose Node.js, **Build Command** `npm install && npm run build` and **Start Command** `npm start`. You can also select the checked-in `render.yaml` Blueprint.
3. Set `NODE_ENV=production`; Render supplies `PORT` automatically. Keep one backend instance.
4. After deployment open `https://YOUR-SERVICE.onrender.com/api/health` to check server status, and visit your Render URL on two devices to test create/join and reconnection.
5. Share the public URL. Your PC does not need to stay switched on.

On Render Free, services may sleep when idle; a cold start and server restart clears live rooms. For uninterrupted gameplay, choose always-on hosting and add persistent room storage.

### Push from VS Code

```bash
git init
git add .
git commit -m "Initial Pyachforon multiplayer with reconnect and Render config"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Pyachforon-Online.git
git push -u origin main
```

Don't commit `.env`, credentials, or `node_modules`.
