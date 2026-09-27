# Mend login UI prototype

A focused login-screen prototype for Mend, built with React and Lumen UI.

## Run

```bash
cd prototypes/mend-login
npm install
npm run dev
```

## Intent

- Uses Mend's approved warm-paper / iris visual system.
- Keeps authentication intentionally minimal: Username, Password, password visibility, Log in, and administrator recovery guidance.
- Uses Lumen React primitives for the form surface and controls.
- Follows the system light/dark preference automatically.
- The submit event is intentionally UI-only. The component dispatches `mend:login-submit`; production authentication should be wired to Mend's server-owned account service when the main app scaffold exists.
