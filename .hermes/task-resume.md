# Task: React Bits Aurora + Build Fix

## Status
CC delegation needed. Current state:
- `@astrojs/react` installed, configured in astro.config.mjs
- React Bits Aurora.tsx + Aurora.css downloaded to `src/components/react-bits/Aurora/`
- React Bits Magnet.tsx downloaded to `src/components/react-bits/Magnet/` (type imports fixed)
- MagnetProvider.tsx created for magnetic hover
- AuroraWrapper.astro created
- BaseLayout.astro updated to use AuroraWrapper instead of CSS aurora
- global.css updated: .aurora-bg removed, .aurora-container added
- ScrollReveal directory still exists in `src/components/react-bits/ScrollReveal/` (has gsap errors)

## What needs to be done by CC
1. Remove `src/components/react-bits/ScrollReveal/` directory
2. Run `npm run build` to verify clean build
3. If build passes, start dev server and let me know the URL

## Files that are correct and should NOT be modified
- src/components/react-bits/Aurora/Aurora.tsx
- src/components/react-bits/Aurora/Aurora.css
- src/components/react-bits/Magnet/Magnet.tsx
- src/components/react-bits/MagnetProvider.tsx
- src/components/react-bits/AuroraWrapper.astro
- src/layouts/BaseLayout.astro (already patched)
- src/styles/global.css (already patched)
