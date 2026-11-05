# Plotter Sketchpad - Street

An interactive 3D WebGL application replicating the "Plotter Sketchpad - Street" aesthetic: real-time camera controls over an architectural, black-and-white wireframe city canyon set against graph paper.

Built with **React**, **TypeScript**, **Three.js**, **Tweakpane**, and **Vite**.

---

## Getting Started

### 1. Isolated Virtual Environment Setup
The project uses a standalone Python-style `.venv` Node environment to isolate Node.js binaries and packages:

```bash
# Bootstrap isolated .venv (node, npm, npx, dependencies)
./scripts/setup-venv.sh
```

### 2. Activate the Environment

```bash
source .venv/bin/activate
```

> **Note:** To exit the virtual environment at any time, run `deactivate`.

### 3. Development Server

```bash
npm run dev
```

Open the local URL displayed in the terminal (typically `http://localhost:5173`) in your browser.

---

## Available Scripts

From within the activated `.venv` (or via `.venv/bin/npm <script>`):

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite dev server with hot module replacement |
| `npm run build` | Compiles TypeScript and runs production Vite build to `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the test suite via Vitest |

---

## Features

- **7-Parameter Camera Rig**: Direct slider bindings for `Camera height m`, `Pitch °`, `Turn °`, `Field of view °`, `Look ahead m`, `Camera along %`, and `Camera side %`.
- **Plotter Rendering Techniques**:
  - **Method 1 (`Hidden-Line Edges`)**: `EdgesGeometry` + `LineSegments` with depth-occluding hull geometry.
  - **Method 1 (`Pure Wireframe`)**: Transparent skeleton drafting mode.
  - **Method 2 (`Sobel Shader`)**: Custom post-processing edge detection pass over a solid scene.
- **Physical Pen & Ink Controls**: Line weight dilation/subpixel fading, deterministic 3D vertex & screen jitter, corner tick overshoot, vertex ink pooling, dry-pen skipping, and multi-pass sketch ghosting.
- **Surface Shading & Multi-Pen Modes**: Normal-based directional cross-hatching, stipple dot shading, and 2-pen carousel plotter misregistration.
- **Paper Themes**: Cream Graph, Cyanotype Blueprint, Dark CAD Terminal, and Sepia Vellum with matching custom graph paper backgrounds.
- **Optical Lens & Depth FX**: Orthographic/perspective blend, curvilinear lens curvature (fisheye/pincushion), depth contrast tapering, and focal plane depth-of-field blur.
- **Building Details**: Dynamic real-time sliders for Windows %, Balconies %, and Architectural Ornaments % (fire escapes, storefront awnings, water towers).
- **Transition Visualization**: 3D camera trajectory flight path, easing curve velocity inspector, multi-camera frustum pyramids, preset tour mode, and director observer vantage rig.
