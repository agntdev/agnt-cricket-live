# Live Cricket Score Bot — Bot specification

**Archetype:** content

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

An AI-powered Telegram bot that provides real-time live cricket scores, ball-by-ball commentary, win probability predictions, and match updates from Cricbuzz. Users can search by team, player, and tournament, and receive push notifications for significant match events like wickets, boundaries, and over-ends.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- cricket fans
- sports enthusiasts
- Telegram users

## Success criteria

- Users receive real-time notifications for significant match events
- Users can access live scores, commentary, and match data via commands
- Users can follow matches, teams, and players to receive personalized updates

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu
- **/live** (command, actor: user, command: /live) — List currently live matches
- **/today** (command, actor: user, command: /today) — Show today's matches
- **/upcoming** (command, actor: user, command: /upcoming) — Show upcoming matches
- **/recent** (command, actor: user, command: /recent) — Show recently completed matches
- **/scorecard** (command, actor: user, command: /scorecard) — Get full scorecard for a match or team
- **/commentary** (command, actor: user, command: /commentary) — Get ball-by-ball commentary for a match
- **/points** (command, actor: user, command: /points) — Show tournament standings
- **/schedule** (command, actor: user, command: /schedule) — List matches by date/tournament
- **/player** (command, actor: user, command: /player) — Search for player profiles and stats
- **/team** (command, actor: user, command: /team) — Get team information and squad details
- **Follow** (button, actor: user, callback: follow:match) — Follow a match to receive notifications
  - inputs: match ID
  - outputs: notification subscription
- **Unfollow** (button, actor: user, callback: unfollow:match) — Stop following a match
  - inputs: match ID
  - outputs: notification unsubscription

## Flows

### Live Match View
_Trigger:_ /live

1. User requests /live command
2. Bot lists live matches with brief info
3. User selects a match
4. Bot shows live score, last 6 balls, and scorecard
5. User can choose to follow the match

_Data touched:_ Match, User

### Scorecard View
_Trigger:_ /scorecard

1. User requests /scorecard with match ID or team name
2. Bot fetches and displays full scorecard
3. Auto-refreshes every 12 seconds if session active

_Data touched:_ Match, Inning

### Commentary View
_Trigger:_ /commentary

1. User requests /commentary with match ID
2. Bot shows ball-by-ball commentary
3. Auto-updates when following

_Data touched:_ BallEvent, Match

### Player Search
_Trigger:_ /player

1. User requests /player with name
2. Bot searches and displays player profile and stats

_Data touched:_ Player

### Team Info
_Trigger:_ /team

1. User requests /team with name
2. Bot shows playing XI, recent results, and squad

_Data touched:_ Team

### Notification Flow
_Trigger:_ significant event

1. Match event occurs (wicket, boundary, etc.)
2. Bot detects event via Cricbuzz data
3. Sends push notification to following users

_Data touched:_ NotificationRule, User

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user with preferences and follow lists
  - fields: Telegram ID, followed matches, followed teams, followed players
- **Match** _(retention: session)_ — Cricket match details and status
  - fields: teams, tournament, venue, start time, status, toss, umpires
- **Inning** _(retention: session)_ — Inning details during a match
  - fields: overs, runs, wickets, required RRR, partnership
- **BallEvent** _(retention: session)_ — Individual ball events and commentary
  - fields: timestamp, over.ball, batter, bowler, outcome, commentary
- **Team** _(retention: session)_ — Cricket team information
  - fields: players, squad, stats
- **Player** _(retention: session)_ — Player profile and statistics
  - fields: profile, recent matches, stats
- **NotificationRule** _(retention: persistent)_ — Rules for which events trigger notifications
  - fields: event types, user IDs

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
- **Cricbuzz** (required) — Live cricket data source
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure Cricbuzz API access
- Set notification rules
- Manage caching policies
- Monitor user preferences

## Notifications

- Push notifications for wickets, boundaries, over-ends, and innings
- Auto-refresh of live match views every 12 seconds

## Permissions & privacy

- Only store necessary user preferences and follow lists
- No user authentication beyond Telegram
- Cache data for minimal time to protect privacy

## Edge cases

- Cricbuzz API unavailable or returns errors
- User requests data for non-existent match/player/team
- Multiple simultaneous match updates requiring rate limiting

## Required tests

- Verify real-time notifications for all event types
- Test auto-refresh of live views
- Validate search functionality for players and teams
- Ensure proper caching and rate limiting

## Assumptions

- Cricbuzz provides sufficient data for all required features
- Users will provide match IDs or names in correct format
- Telegram will deliver notifications reliably
