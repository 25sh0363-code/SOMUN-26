# SOMUN '26 — Model United Nations Conference

Official site of SOMUN '26 — the eighth edition. Three days of charged debate,
negotiation and diplomacy at the Hyderabad International Convention Centre,
October 30 – November 1, 2026.

**Live:** https://25sh0363-code.github.io/

---

## The stack (deliberately boring)

Pure static HTML/CSS/JS. No framework, no build step, no dependencies —
clone it, serve it, ship it. Styling is plain CSS and behaviour is vanilla
ES modules with hash-based routing.

## Project structure

```
index.html        — the whole site (every view lives here: home, committees,
                    secretariat, itinerary, resources, FAQs, registration)
css/styles.css    — the entire design system (ink / crimson / beige editorial theme)
js/main.js        — behaviour: router, entry gate, countdown, committee deck,
                    4-stage registration wizard, allocation matrix modal,
                    itinerary, toasts
js/data.js        — all content: committees, portfolios, fees, FAQs, itinerary,
                    allocation matrix. Edit this to update site copy.
js/config.js      — site configuration: registration gate + Supabase keys
js/icons.js       — inline SVG icon set (no icon fonts, no CDN)
images/           — marks, textures, committee artwork
```

## Run it locally

A static server is required (ES modules don't load from `file://`):

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

Any static server works — `npx serve`, Caddy, nginx, whatever you like.

## Opening registrations

Registration access is controlled by a single flag in `js/config.js`:

```js
REGISTRATIONS_OPEN: false   // → true when registrations go live
```

While `false`, the register page stays browsable but the wizard is locked
behind an "Opening Soon" veil. Flipping to `true` releases everything —
no other changes needed.

## Database (Supabase)

Registrations and resources are backed by Supabase (free tier is enough):

1. Create a project at [supabase.com](https://supabase.com)
2. Open the SQL Editor and run `backend/supabase-setup.sql`
3. Paste your project URL and anon key into `js/config.js`

Until keys are set, the site runs fine — the form shows a friendly notice
and the Resources page keeps its "releasing soon" placeholders.

## Deploy

GitHub Pages serves from `main`. Push and the site is live in a minute or
two — if an update looks stale, hard refresh (`Ctrl/Cmd + Shift + R`);
Pages and browsers both cache aggressively.

## Contact

Secretariat — somundelaffairs@gmail.com
