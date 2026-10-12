# Custom Sleep Timers

The manager and add-timer form are React JSX in `src/index.tsx`. Both use the shared
`BottomSheet` component from `spotifyplus/react`, presented with `SpotifyPlus.UI.mount()`.
Only the press-and-hold drag list is a native component (`TimerList`).

Remove or reorder presets in Manage timers, then select Add sleep timer. Choose a positive
duration in minutes or hours. Save timer adds a preset; Start timer starts a one-time timer.
Back or outside-tap closes the form without saving or starting anything.

Run `npm install`, `npm run typecheck`, and `npm run build`. The native build uses the local
Spotify Plus SDK release AAR. `npm run dev` deploys and watches the extension on the phone.
