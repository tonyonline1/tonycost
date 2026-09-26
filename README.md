# Tony's Kitchen — Food Cost & Management

A restaurant management system organized as **1 system + 3 business modules**, using the existing application structure and shared data/calculation services.

## Architecture

- **Dashboard** — single business overview across all modules.
- **Module A · Cost Control** — ต้นทุนอาหาร, วัตถุดิบ, สูตรอาหาร.
- **Module B · Daily Operations** — รายรับ, ค่าใช้จ่าย.
- **Module C · Management** — กำไร/ขาดทุน, รายงาน.
- **System Settings** — shared configuration for GP, packaging, overhead, roles, and other system-wide settings.

The navigation is grouped by module, but the application remains one React/Vite application. Existing route IDs and legacy components are preserved for backward compatibility; Stock & Purchase screens are not exposed in the main navigation.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. If the project uses Gemini features, set `GEMINI_API_KEY` in `.env.local` as required by the environment.
3. Run the app:
   `npm run dev`
4. Build for production:
   `npm run build`

## Data and calculation principles

- One shared data layer is used across all modules.
- Food Cost, GP, packaging, pricing, and profitability calculations remain centralized in `src/services/calculationEngine.ts`.
- Existing data structures and functions are retained while the UI is reorganized into the three-module architecture.
- Seafood ingredients remain independently costed (for example, shrimp by piece and squid by gram) and are never collapsed into one generic seafood ingredient.
