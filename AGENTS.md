# AGENTS.md — SMART KASEK v1.0

## Project Identity

**Project Name:** SMART KASEK
**Full Name:** School Management, Administration, Reflection & Teacher Growth

SMART KASEK adalah platform web untuk membantu Kepala Sekolah mengelola data sekolah, memantau perkembangan guru, melakukan supervisi, coaching, tindak lanjut, dan memperoleh insight berbasis data dengan bantuan AI.

### Core Philosophy

SMART KASEK bukan sekadar aplikasi administrasi.

Core transformation:

```text
DATA
  ↓
ANALYSIS
  ↓
AI INSIGHT
  ↓
DECISION
  ↓
ACTION
  ↓
FOLLOW-UP
  ↓
TEACHER GROWTH
```

AI harus digunakan untuk membantu pengambilan keputusan, bukan menggantikan keputusan Kepala Sekolah.

---

# 1. PRIMARY DEVELOPMENT GOALS

Prioritaskan hal-hal berikut:

1. Functional correctness
2. Data integrity
3. Security
4. Maintainability
5. Responsive UX
6. AI reliability
7. Performance
8. Visual polish

Jangan mengorbankan keamanan dan integritas data hanya demi tampilan atau kecepatan implementasi.

---

# 2. TECH STACK

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide Icons
* Recharts

## Backend

* Next.js Server Components
* Server Actions
* Route Handlers
* Server-side services

## Database

* Supabase
* PostgreSQL

## Authentication

* Supabase Auth

## Storage

* Supabase Storage

## Deployment

* Vercel

## AI

SMART KASEK menggunakan abstraction layer untuk AI.

AI provider WAJIB dapat diganti tanpa mengubah business logic utama.

Contoh arsitektur:

```text
AIService
├── Provider Adapter
├── Context Engine
├── Prompt Builder
├── Output Validator
└── Tool Executor
```

Jangan menyebarkan kode provider AI langsung ke berbagai page/component.

---

# 3. NON-NEGOTIABLE RULES

## Rule 1 — NO HARDcoded BUSINESS DATA

Jangan hardcode:

* teacher IDs
* school IDs
* user IDs
* supervision IDs
* page IDs
* dashboard statistics
* AI insights
* growth scores
* warning counts

Semua data bisnis harus berasal dari database atau calculation engine.

Contoh buruk:

```ts
const totalTeachers = 32;
```

Contoh benar:

```ts
const totalTeachers = await getTeacherCount(schoolId);
```

---

## Rule 2 — NO FAKE DATA IN PRODUCTION

Mock/demo data hanya diperbolehkan melalui:

```text
seed
fixtures
test utilities
development-only scripts
```

Jangan memasukkan fake data langsung ke production code.

---

## Rule 3 — DATABASE IS SOURCE OF TRUTH

Database adalah sumber kebenaran utama untuk data aplikasi.

AI tidak boleh menjadi sumber kebenaran utama.

Contoh:

```text
Database:
teacher score = 72

AI:
teacher score = 85
```

AI harus menggunakan data database, bukan mengarang angka.

---

# 4. CORE PRODUCT MODULES

## Dashboard

Menampilkan:

* jumlah guru
* teacher growth
* supervisi
* coaching
* tindak lanjut
* early warning
* AI school insight

Semua statistik harus berasal dari database.

---

## Guru

Fitur:

* Data Guru
* Profil
* Kompetensi
* Teacher Growth
* Riwayat Supervisi
* Riwayat Coaching
* Riwayat Tindak Lanjut

---

## Pembelajaran

Fitur:

* Supervisi
* Modul Ajar
* Jurnal
* Asesmen
* Praktik Baik

---

## AI Coach Guru

AI menganalisis:

* profil guru
* kompetensi
* hasil supervisi
* catatan supervisi
* coaching sebelumnya
* tindak lanjut
* growth history

Output:

* strengths
* improvement areas
* priority
* recommendation
* suggested coaching
* suggested actions

AI hanya memberikan rekomendasi.

Keputusan akhir berada pada Kepala Sekolah.

---

## Coaching

Alur wajib:

```text
Supervision
    ↓
Finding
    ↓
Coaching
    ↓
Action
    ↓
Follow-up
    ↓
Evaluation
```

Jangan membuat supervisi berdiri sendiri tanpa dukungan tindak lanjut.

---

## Teacher Growth

Growth harus berbasis histori.

Jangan menyimpan hanya satu nilai final.

Gunakan snapshot/history agar trend dapat dianalisis.

---

## AI School Insight

AI menganalisis data tingkat sekolah:

* teacher growth
* supervision
* coaching
* competencies
* assessments
* other approved school metrics

Output harus menjelaskan:

```text
WHAT
WHY
EVIDENCE
PRIORITY
RECOMMENDATION
```

AI insight harus dapat ditelusuri ke data sumber.

---

## Early Warning

Gunakan pendekatan hybrid:

```text
Rule Engine
+
Statistical Analysis
+
AI Explanation
```

Jangan memberikan kewenangan penuh kepada LLM untuk menentukan warning secara bebas.

Rule dan threshold harus eksplisit.

Contoh:

```text
supervision_score < threshold
AND
no_recent_coaching
AND
follow_up_overdue
```

Kemudian AI digunakan untuk memberikan penjelasan dan rekomendasi.

---

# 5. DATABASE ARCHITECTURE

Core entities:

```text
schools
profiles
teachers
competencies
teacher_competencies

supervisions
supervision_items

coaching_sessions
coaching_actions

teacher_growth_snapshots

lesson_plans
teaching_journals
assessments

good_practices
good_practice_comments

students
student_indicators

programs
letters
decisions
meeting_minutes

ai_interactions
ai_insights
early_warnings

audit_logs
```

---

# 6. RELATIONSHIP RULES

Semua entity sekolah harus memiliki hubungan yang jelas terhadap:

```text
school_id
```

atau dapat ditelusuri dengan aman melalui parent entity.

Contoh:

```text
school
 ├── teachers
 ├── students
 ├── programs
 ├── supervisions
 └── insights
```

Teacher-related data:

```text
teacher
 ├── competencies
 ├── supervisions
 ├── coaching
 ├── growth
 ├── journals
 ├── lesson plans
 ├── assessments
 └── good practices
```

---

# 7. MULTI-TENANT / SCHOOL ISOLATION

SMART KASEK harus didesain dengan school isolation.

User hanya boleh mengakses data sekolah yang menjadi kewenangannya.

Contoh:

```text
School A
 ├── Principal A
 └── Teachers A

School B
 ├── Principal B
 └── Teachers B
```

User School A tidak boleh membaca data School B.

Gunakan:

* Supabase Row Level Security
* server-side authorization
* role checks
* school ownership checks

Jangan mengandalkan frontend hiding.

---

# 8. AUTHORIZATION

Role minimal:

```text
admin
principal
teacher
```

Authorization harus diperiksa di server.

Frontend check:

```ts
if (role === "principal")
```

tidak cukup sebagai security mechanism.

Backend/database harus tetap menolak unauthorized access.

---

# 9. SUPABASE RLS

Setiap table yang menyimpan data sensitif harus ditinjau terhadap RLS.

Contoh prinsip:

```text
Teacher:
SELECT hanya data sendiri

Principal:
SELECT data sekolah sendiri

Admin:
SELECT sesuai scope yang diberikan
```

Jangan membuat policy:

```text
USING (true)
```

untuk production-sensitive data kecuali benar-benar diperlukan dan aman.

---

# 10. AI ARCHITECTURE

AI architecture:

```text
User
 ↓
AI Feature
 ↓
Request Analyzer
 ↓
Context Engine
 ↓
Data Access Layer
 ↓
Prompt Builder
 ↓
AI Provider
 ↓
Structured Output Validator
 ↓
Business Rules
 ↓
UI / Persistence
```

---

# 11. AI CONTEXT RULES

Jangan mengirim seluruh database ke AI.

Context harus:

* minimal
* relevan
* terstruktur
* terverifikasi
* sesuai permission user

Contoh AI Coach Guru:

```text
Teacher Profile
+
Competencies
+
Recent Supervisations
+
Recent Coaching
+
Follow-up
+
Growth History
```

Jangan mengirim data siswa atau data sekolah lain jika tidak diperlukan.

---

# 12. AI OUTPUT RULES

AI output untuk workflow harus structured.

Prefer:

```json
{
  "summary": "",
  "strengths": [],
  "areas": [],
  "priority": "low|medium|high|critical",
  "recommendations": [],
  "suggested_actions": []
}
```

Gunakan schema validation.

Contoh:

```text
AI response
   ↓
Schema Validator
   ↓
Valid?
 ├── YES → continue
 └── NO  → retry/fallback
```

Jangan langsung trust raw LLM output.

---

# 13. AI HALLUCINATION CONTROL

AI harus membedakan:

```text
FACT
INFERENCE
RECOMMENDATION
```

Contoh:

```text
FACT:
Supervision score = 65

INFERENCE:
Teacher may need support in assessment.

RECOMMENDATION:
Schedule coaching focused on formative assessment.
```

AI tidak boleh menyatakan data yang tidak ada sebagai fakta.

---

# 14. AI ASSISTANT TOOLS

AI Assistant boleh menggunakan internal tools seperti:

```text
get_teacher_profile()
get_teacher_growth()
get_supervision_summary()
get_coaching_history()
get_school_insight()
get_early_warnings()
get_good_practices()
```

Tool access harus mengikuti permission user.

AI tidak boleh menjalankan arbitrary database queries dari natural language secara langsung tanpa controlled tool layer.

---

# 15. AI PROVIDER ABSTRACTION

Gunakan interface seperti:

```ts
interface AIProvider {
  generate(input: AIRequest): Promise<AIResponse>;
}
```

Business logic harus bergantung pada:

```ts
AIProvider
```

bukan provider tertentu.

Contoh:

```text
AIProvider
├── FreeProvider
├── CloudProvider
└── LocalProvider
```

Provider harus dapat diganti melalui configuration/environment.

---

# 16. AI COST CONTROL

Project memiliki target biaya serendah mungkin.

Jangan melakukan AI request tanpa alasan.

Avoid:

* AI request pada setiap page render
* AI request setiap keystroke
* AI request untuk data yang bisa dihitung SQL
* AI request untuk statistik sederhana

Gunakan SQL/TypeScript untuk:

```text
COUNT
SUM
AVG
TREND
THRESHOLD
FILTER
SORT
```

Gunakan AI untuk:

```text
EXPLANATION
RECOMMENDATION
SUMMARIZATION
PATTERN INTERPRETATION
COACHING GUIDANCE
```

---

# 17. EARLY WARNING RULES

Early Warning harus deterministic sebanyak mungkin.

Contoh:

```text
LOW:
score < 75

MEDIUM:
score < 70

HIGH:
score < 60 + overdue follow-up

CRITICAL:
multiple high-risk indicators
```

Threshold harus berada di configuration/business rules, bukan hardcoded di UI.

Jangan biarkan AI mengubah severity secara bebas.

---

# 18. SERVICE LAYER

Business logic harus dipisahkan dari UI.

Contoh:

```text
services/
├── teacher.service.ts
├── supervision.service.ts
├── coaching.service.ts
├── growth.service.ts
├── insight.service.ts
└── ai.service.ts
```

Page/component hanya mengorkestrasi kebutuhan UI.

Jangan menaruh query database kompleks di React component.

---

# 19. VALIDATION

Gunakan schema validation untuk semua input penting.

Recommended:

```text
Zod
```

Validasi:

* forms
* server actions
* API payloads
* AI output
* query parameters

Jangan percaya input dari client.

---

# 20. ERROR HANDLING

Jangan menggunakan:

```ts
catch {
  return null;
}
```

tanpa logging atau recovery.

Error harus:

* dicatat
* diberikan context
* memiliki user-safe message
* tidak membocorkan secrets

UI harus menyediakan:

* loading state
* error state
* empty state
* success state

---

# 21. SECURITY RULES

Never expose:

* service role keys
* private AI keys
* database admin credentials
* secrets
* environment variables

ke client.

Gunakan:

```text
NEXT_PUBLIC_*
```

hanya untuk nilai yang memang public.

Supabase service role key wajib server-only.

---

# 22. FILE STORAGE

File sekolah harus menggunakan controlled storage.

Contoh:

```text
good-practices/
lesson-plans/
reports/
documents/
```

Jangan simpan file binary besar langsung di PostgreSQL.

Database hanya menyimpan:

```text
storage path
metadata
owner
school_id
```

---

# 23. UI / UX RULES

Design language:

* modern
* clean
* professional
* educational technology
* trustworthy
* responsive

Target perangkat:

```text
desktop
tablet
mobile
```

Layout tidak boleh bergantung pada desktop width.

Gunakan semantic UI.

---

# 24. ICON RULE

Gunakan hanya:

**Lucide Icons**

Jangan menambahkan library icon lain tanpa alasan kuat.

Avoid:

* Feather
* Font Awesome
* random SVG icon packs
* mixed icon styles

---

# 25. ACCESSIBILITY

UI harus memperhatikan:

* keyboard navigation
* focus state
* semantic HTML
* contrast
* readable typography
* aria labels untuk icon-only controls

Icon-only button wajib memiliki accessible label.

---

# 26. PERFORMANCE RULES

Prioritas:

```text
Server Component
↓
Server-side data fetch
↓
Client Component only when interaction requires it
```

Hindari client rendering untuk seluruh aplikasi jika tidak diperlukan.

Avoid unnecessary:

* useEffect
* client state
* duplicate requests
* polling
* large bundle dependencies

---

# 27. DATABASE QUERY RULES

Query harus:

* scoped by school
* indexed where appropriate
* paginated for large lists
* select only required columns
* avoid N+1 queries

Jangan:

```text
SELECT *
```

jika hanya memerlukan beberapa kolom.

---

# 28. DASHBOARD RULES

Dashboard tidak boleh berisi angka statis.

Contoh:

```text
Teacher Count
Growth Average
Pending Coaching
Early Warnings
Supervision Completion
```

Semua harus dihitung dari database/query layer.

---

# 29. AUDITABILITY

Perubahan penting harus dapat dilacak.

Gunakan:

```text
audit_logs
```

Untuk operasi seperti:

* create
* update
* delete
* status change
* permission change
* important AI action

---

# 30. AI AUDITABILITY

Setiap AI workflow penting harus dapat dilacak minimal:

```text
user_id
school_id
feature
input/context reference
model/provider
created_at
result status
```

Jangan menyimpan secret credentials di AI interaction logs.

---

# 31. TESTING

Minimal testing:

```text
Unit Tests
Integration Tests
Authorization Tests
RLS Tests
Critical Flow Tests
AI Output Validation Tests
```

Critical user flow:

```text
Login
 ↓
Open Teacher
 ↓
View Supervision
 ↓
AI Coach
 ↓
Create Coaching
 ↓
Create Follow-up
 ↓
Complete Follow-up
 ↓
Growth update
```

Flow ini harus selalu dapat dijalankan.

---

# 32. DEMO SEED

Untuk keperluan lomba, gunakan seed data yang realistis.

Seed harus:

* explicit
* reproducible
* easily removable
* development/demo only

Gunakan script seperti:

```text
seed-demo
```

Jangan memasukkan demo data secara manual ke production.

---

# 33. ENVIRONMENT

Minimal:

```text
.env.local
```

Environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

AI_PROVIDER
AI_API_KEY
```

Never commit `.env.local`.

---

# 34. GIT RULES

Commit harus meaningful.

Contoh:

```text
feat: add teacher growth profile
feat: add supervision workflow
fix: enforce teacher school isolation
feat: add AI coach context engine
fix: validate coaching action schema
```

Jangan menggunakan:

```text
update
fix
final
final2
really-final
```

untuk commit utama.

---

# 35. DEVELOPMENT WORKFLOW

Urutan pengerjaan:

```text
1. Project setup
2. Supabase connection
3. Database schema
4. RLS
5. Auth
6. Roles
7. School isolation
8. Teacher module
9. Competency
10. Supervision
11. Coaching
12. Teacher Growth
13. AI Context Engine
14. AI Coach
15. School Insight
16. Early Warning
17. Supporting modules
18. Polish
19. Testing
20. Deployment
```

Jangan melompat langsung ke AI sebelum data core tersedia.

---

# 36. MVP PRIORITY

Priority P0:

```text
Authentication
Dashboard
Teachers
Competencies
Supervision
Coaching
Teacher Growth
AI Coach
AI School Insight
Early Warning
```

Priority P1:

```text
Journal
Lesson Plans
Assessments
Good Practices
Students
Administration
```

Priority P2:

```text
Learning Community
Advanced analytics
Advanced automation
Additional AI tools
```

---

# 37. DEVELOPMENT PRINCIPLE

When asked to implement a feature:

1. Understand the data model.
2. Check existing architecture.
3. Reuse existing utilities/components/services.
4. Implement database changes first when required.
5. Implement authorization.
6. Implement server-side business logic.
7. Implement UI.
8. Add validation.
9. Add loading/error/empty states.
10. Test critical paths.

Do not rewrite working modules unnecessarily.

---

# 38. CHANGE SAFETY

Before modifying an existing feature:

* inspect related files
* inspect database relations
* inspect authorization
* inspect existing service functions
* inspect existing UI components

Do not assume architecture.

Do not duplicate an existing service because you failed to locate it.

---

# 39. NO OVERENGINEERING

Do not introduce:

* unnecessary microservices
* unnecessary state management
* unnecessary dependencies
* unnecessary abstraction layers
* unnecessary background workers

Prefer the simplest architecture that remains maintainable and secure.

---

# 40. NO UNDERENGINEERING

Do not:

* put all logic in page.tsx
* put all queries in components
* bypass RLS
* hardcode IDs
* trust client-side roles
* trust raw AI output
* duplicate database logic
* hide errors

---

# 41. AI UX

AI responses must feel like part of SMART KASEK.

Avoid generic:

> "As an AI language model..."

Preferred:

```text
SMART KASEK AI Coach
```

AI UI should communicate:

```text
Insight
Evidence
Recommendation
Suggested Action
```

Where possible, show the source or basis of the recommendation.

---

# 42. AI DISCLAIMERS

AI recommendations should not be presented as absolute decisions.

Use language such as:

```text
Rekomendasi AI
Bahan pertimbangan
Berdasarkan data yang tersedia
Perlu verifikasi Kepala Sekolah
```

Do not present AI-generated assumptions as verified school facts.

---

# 43. PRODUCT NARRATIVE

The main product story is:

```text
SUPERVISI
     ↓
TEMUAN
     ↓
AI COACH
     ↓
COACHING
     ↓
TINDAK LANJUT
     ↓
TEACHER GROWTH
     ↓
SCHOOL INSIGHT
```

Every major feature should reinforce this story.

---

# 44. DEFINITION OF DONE

A feature is not complete merely because the UI exists.

A feature is complete when:

```text
UI
+
Database
+
Validation
+
Authorization
+
Error Handling
+
Responsive UX
+
Real Data
+
Testing
```

are implemented as appropriate.

For AI features additionally require:

```text
Context
+
Structured Output
+
Validation
+
Fallback
+
Auditability
```

---

# 45. WHEN SOMETHING IS UNCLEAR

Do not invent business rules silently.

Use existing project conventions first.

If implementation can safely proceed with a reasonable assumption:

1. make the assumption
2. implement it cleanly
3. document it in code or project notes

Do not block development unnecessarily.

---

# 46. AGENT BEHAVIOR

The coding agent should behave as a senior full-stack engineer.

Responsibilities:

* protect architecture
* protect data integrity
* protect security
* minimize unnecessary changes
* produce production-quality code
* maintain consistency
* explain important tradeoffs
* verify changes before declaring completion

Do not claim that something works without verifying it.

---

# 47. FINAL IMPLEMENTATION PRINCIPLE

SMART KASEK should ultimately demonstrate:

```text
                    SMART KASEK
                         │
                         ▼
                  SCHOOL DATA
                         │
                         ▼
                    ANALYTICS
                         │
                         ▼
                        AI
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          COACH         INSIGHT    WARNING
             │           │           │
             └───────────┼───────────┘
                         ▼
                    KASEK DECISION
                         │
                         ▼
                      ACTION
                         │
                         ▼
                  TEACHER GROWTH
                         │
                         ▼
                    NEW DATA
                         │
                         └──────────────→ LOOP
```

The system must feel like a **decision-support platform for school leadership**, not merely a CRUD application with an AI chatbot attached.
