# ✨ README Improvements (Recommended Structure)

> Replace the current README structure with the following sections to make the repository look polished, professional, recruiter-friendly, and GitHub showcase worthy.

---

## 📑 Table of Contents

- 🚀 Executive Summary
- 🌟 Features
- 📸 Screenshots
- 🏗️ System Architecture
- 🔄 Workflow
- 🧠 Hybrid RAG Engine
- 📊 Performance
- 🔒 Security
- 🛠️ Tech Stack
- 🗂️ Project Structure
- ⚙️ Installation
- 🔑 Environment Variables
- 🗄️ Database Schema
- 🚀 Deployment
- 🛣️ Future Roadmap
- 👨‍💻 Contributors
- 📄 License

---

# 🌟 Features

## 📄 Resume Intelligence

- ATS Compatibility Score
- Resume Parsing
- Skill Gap Detection
- Keyword Optimization
- Company-specific Resume Suggestions

---

## 🤖 AI Mock Interviews

- Adaptive Multi-turn Interviews
- Company-specific Questions
- STAR Framework Evaluation
- Instant AI Feedback
- Communication Analysis

---

## 📚 Personalized Learning Roadmaps

- Weekly Learning Plans
- Company-specific Preparation
- Topic Recommendations
- Progress Tracking
- Smart Skill Prioritization

---

## 🔍 Hybrid RAG Search

- Semantic Search using pgvector
- PostgreSQL Full Text Search
- Metadata Filtering
- Weighted Ranking
- Citation-aware Context Retrieval

---

## 💳 Subscription System

- Razorpay Integration
- Credit Management
- Premium Features
- Secure Payment Verification

---

# 📊 Project Statistics

| Metric | Value |
|---------|-------|
| Frontend | Next.js 16 |
| Language | TypeScript |
| Database | PostgreSQL |
| Backend | Supabase |
| Vector Database | pgvector |
| AI Model | Google Gemini |
| Search Engine | Hybrid RAG |
| Authentication | Supabase Auth |
| Payments | Razorpay |
| Resume Parsing | PDF Parser |
| Vector Dimension | 768 |
| Architecture | Full Stack SaaS |

---

# 📸 Screenshots

> Add screenshots of each module.

- Dashboard
- Resume Analyzer
- ATS Report
- Mock Interview
- Learning Roadmap
- Analytics Dashboard
- Subscription Page

---

# 🏗️ High-Level Architecture

```text
                    User
                     │
                     ▼
              Next.js Frontend
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
 Supabase        Gemini API      Razorpay
      │              │              │
      ▼              ▼              ▼
 PostgreSQL      AI Responses   Payments
      │
      ▼
 pgvector + Full Text Search
      │
      ▼
 Hybrid Retrieval Engine
```

---

# 🔄 Complete Workflow

```text
Resume Upload
      │
      ▼
Extract PDF Text
      │
      ▼
Generate Embeddings
      │
      ▼
Hybrid Search
      │
      ▼
Gemini Evaluation
      │
      ▼
ATS Report
      │
      ▼
Skill Gap Analysis
      │
      ▼
Learning Roadmap
      │
      ▼
Mock Interview
      │
      ▼
Final Performance Report
```

---

# 🧠 Why Hybrid RAG?

Unlike traditional RAG systems that rely solely on vector similarity, PlacementPilot AI combines multiple retrieval strategies to maximize relevance and accuracy.

### Semantic Search

- Understands contextual meaning
- Uses Gemini Embeddings
- Retrieves conceptually similar content

### Keyword Search

- PostgreSQL Full Text Search
- Exact phrase matching
- Fast indexed retrieval

### Metadata Filtering

- Company
- Role
- Difficulty
- Knowledge Base Type

### Weighted Ranking

Final Score =

70% Vector Similarity

+

30% Keyword Ranking

This hybrid approach significantly improves retrieval quality compared to vector-only systems.

---

# 📊 Performance

| Component | Performance |
|------------|------------|
| Resume Parsing | <2 sec |
| Embedding Generation | ~3 sec |
| Hybrid Retrieval | <15 ms |
| ATS Evaluation | 4–7 sec |
| Mock Interview Response | 2–4 sec |
| PostgreSQL Query | <10 ms |

---

# 🔒 Security

- Row Level Security (RLS)
- JWT Authentication
- Protected Server Actions
- Secure API Routes
- Environment Variable Isolation
- Razorpay Webhook Verification
- SQL Injection Protection
- Server-side Validation

---

# 🛠️ Technology Stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 16 |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Database | PostgreSQL |
| Backend | Supabase |
| Authentication | Supabase Auth |
| Vector Search | pgvector |
| AI | Google Gemini |
| Embeddings | text-embedding-004 |
| Payments | Razorpay |
| PDF Parsing | unpdf |
| JSON Validation | jsonrepair |

---

# 🗂️ Project Structure

```text
placementpilot/

├── public/
│   ├── screenshots/
│   └── icons/

├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── resume/
│   │   ├── interview/
│   │   ├── roadmap/
│   │   ├── payment/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── rag/
│   │   ├── gemini/
│   │   ├── embeddings/
│   │   └── supabase/
│   └── utils/

├── supabase/
│   └── migrations/

└── package.json
```

---

# ⚙️ Installation

```bash
git clone https://github.com/yourusername/placementpilot.git

cd placementpilot

npm install

npm run dev
```

---


# 🗄️ Database Overview

## Main Tables

- profiles
- resumes
- documents
- roadmap_plans
- mock_interviews
- subscriptions

Indexes

- pgvector HNSW
- PostgreSQL Full Text Search
- JSONB GIN Indexes

Security

- Row Level Security
- Owner-only Access
- Secure Policies

---

# 🚀 Deployment

The project can be deployed using

- Vercel
- Supabase
- Razorpay
- Google Gemini API

Deployment Steps

1. Configure Environment Variables
2. Run Database Migrations
3. Seed Knowledge Base
4. Deploy to Vercel
5. Configure Razorpay Webhooks

---

# 🛣️ Future Roadmap

- 🎤 Voice-based AI Interviews
- 💻 Live Coding Interview Platform
- 📈 Recruiter Analytics Dashboard
- 🤝 Peer Mock Interviews
- 📱 Mobile Application
- 🌍 Multi-language Support
- 🧠 Fine-tuned Interview Models
- 📄 AI Resume Builder
- 📹 Video Interview Evaluation
- 📊 Placement Prediction Dashboard

---

# 👨‍💻 Contributors

**Harshith Reddy Kalva**

AI Engineer • Full Stack Developer • AIML Student

GitHub: https://github.com/kalvaharshith

LinkedIn: https://linkedin.com/in/harshith-reddy-kalva




<div align="center">

## ⭐ If you found this project useful, consider giving it a Star!

</div>
