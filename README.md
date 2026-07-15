
# 🧠 Placement Plot AI
### 
# 📁 Project Directory Tree
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
placementplot/
├── public/                 # Static assets (icons, SVGs, screenshots)
│   └── dashboard-screenshot.png
├── supabase/
│   └── migrations/         # PostgreSQL table migrations & RPCs
│       └── 001_vector_tables.sql
├── src/
│   ├── app/                # Next.js App Router folders & pages
│   │   ├── api/            # API Route handlers (Auth, Seed, AI APIs)
│   │   └── (dashboard)/    # Dashboard portal layout & views
│   ├── features/           # Modularized platform features
│   │   ├── interview/      # Mock interview state & prompts
│   │   ├── payment/        # Razorpay transactions
│   │   ├── resume/         # ATS parsing, scoring, & STAR metrics
│   │   └── roadmap/        # Placement learning roadmap rules
│   ├── lib/                # Shared logic engines (RAG, Gemini, Supabase)
│   │   ├── chunker.ts
│   │   ├── embeddings.ts
│   │   ├── rag.ts
│   │   └── supabase.ts
│   └── utils/
├── package.json
└── tsconfig.json
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
---
You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
# ⚙️ Installation & Setup
This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
Follow these steps to configure your environment and boot up the project:
## Learn More
### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/placementplot.git
cd placementplot
npm install
```
To learn more about Next.js, take a look at the following resources:
### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret
GEMINI_API_KEY=your_google_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
### 3. Setup D
- **Context Window Management:** Tuning hybrid RAG weights and source-citing boundaries inside system prompts.
- **Secure Transaction Handling:** Linking external APIs (Razorpay) to state updates behind RLS policy gates.
- **Structured LLM Orchestration:** Forcing schema formatting constraints (`jsonrepair` integration) to avoid raw text-parsing crashes.
Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
---
<div align="center">
### ⭐ If this platform helped you land your placement, please give it a star!
</div>
