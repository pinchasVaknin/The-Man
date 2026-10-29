# TheMan — 3D Living Nature & RPG World Simulator

A realistic, high-performance procedural 3D open-world adventure built with Three.js, React, and TypeScript. Features procedural heightfield terrain, volumetric atmosphere, day/night cycles, dynamic weather, mounted horse riding, archery, dual combat kinematics, an economy with Skyrim-style inventory, and regional landmarks.

## Overview & Architecture

- **World Engine**: Procedural terrain generation with analytical heightfields, multi-story structure resolution (fortress, watchtowers, farmhouses, harbor town, dwarven mines), and real-time biome classification.
- **Atmosphere & Weather**: 24-hour dynamic solar elevation, morning mist, starry night cycles, and seasonal or turbo-test weather systems (rain, snow, dense fog, thunderstorm, and sandstorm).
- **Kinematics & Combat**: Physics-driven first-person and third-person locomotion, swimming buoyancy, ladder climbing, ballistic arrow flight, and a 5-phase sword combat system with synchronized strike windows.
- **Locomotion & Mounts**: Biomechanical horse simulation with gallop gaits, turning resistance, and free-look camera.
- **Economy & UI**: Skyrim-style split-pane inventory with O(1) item lookups, equipment strategy pattern, hotbar binding, and localized Hebrew UI strings (`src/locales/`).

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Installation & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Run verification suite:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

<!-- build-protocol:begin -->
## Engineering standards

How code in this repository is planned, written, tested and committed is defined in
[`.standards/profile.md`](./.standards/profile.md) and the standards it links to.
Read the profile before your first change.
<!-- build-protocol:end -->
