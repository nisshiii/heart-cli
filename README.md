# ECG Heartbeat 3D UI

Apple ECG inspired heart line animation built as a 3D UI using Next.js and
React Three Fiber. Designed for Vercel free plan deployments.

## Features
- ECG line draws a heart loop with glow and subtle 3D rotation
- Reduced-motion friendly (static render when enabled)
- Full-screen landing layout with ambient gradient and vignette

## Tech Stack
- Next.js App Router + TypeScript
- three, @react-three/fiber, @react-three/drei

## Getting Started
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Deploy to Vercel (Free Plan)
1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Keep the Next.js preset defaults:
	- Build command: `npm run build`
	- Output: `.next`

## Notes
- Node.js 18+ recommended.