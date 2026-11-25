# Deploying the web app with Azure DevOps + Azure Static Web Apps

This walks through deploying the Flashy/StuddyPebble **web client** using your
Azure for Students subscription, the way an AZ-400 / Azure DevOps course would
have you do it: code in a repo → pipeline builds it → pipeline deploys it.

Cost note: Azure Static Web Apps has a **Free tier** and Azure DevOps is free
for small teams, so this consumes **$0** of your $100 student credit.

## 0. What you need first — the Supabase backend

The app uses the existing **Flashy** Supabase project
(`bsxgeoeluwecvrhrztcm`, the same one `mobile/.env` points at). Free-tier
projects **pause** after inactivity and drop out of DNS; if the app ever
shows "Failed to fetch", open the project in
[supabase.com/dashboard](https://supabase.com/dashboard) and click
**Restore project**.

Already in place on this project: all tables + RLS (`groups`, `flashcards`,
`quiz_results`, `deck_collections`, `deck_collection_members`), the
`flashcard-images` storage bucket, the three edge functions
(`explain-card`, `chat-card`, `parse-bulk-cards`) and the `OPENAI_API_KEY`
secret.

1. From **Project Settings → API**, note the **Project URL** and **anon key**
   (or run `supabase projects api-keys --project-ref bsxgeoeluwecvrhrztcm`).
2. For local development, those two values live in `client/.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). While developing you can
   instead run `supabase start` and use the local URL/key it prints.
3. If the schema or functions ever need updating from this repo:
   ```bash
   supabase link --project-ref bsxgeoeluwecvrhrztcm
   supabase db push                  # applies supabase/migrations
   supabase functions deploy explain-card chat-card parse-bulk-cards
   ```
4. In **Authentication → URL Configuration**, add your Static Web App URL
   (once you know it, step 2 below) as a redirect URL.

## 1. Create the Static Web App (Azure portal)

1. Sign in to [portal.azure.com](https://portal.azure.com) with your student account.
2. **Create a resource → Static Web App**.
3. Subscription: *Azure for Students*; create a resource group, e.g. `rg-studdypebble`.
4. Name: e.g. `studdypebble-web`; Plan: **Free**; pick a nearby region.
5. Deployment source: **Other** (we deploy from Azure DevOps, not GitHub Actions).
6. Create it, open the resource, and click **Manage deployment token** — copy it.

## 2. Create the Azure DevOps project and pipeline

1. Go to [dev.azure.com](https://dev.azure.com), sign in with the same account,
   and create an organization (if you don't have one) and a project, e.g. `studdypebble`.
2. Push this repo to Azure Repos, or point the pipeline at GitHub:
   - Azure Repos: `git remote add azure <repo URL>` → `git push azure laya-develop`
   - or GitHub: just authorize the GitHub connection when creating the pipeline.
3. **Pipelines → New pipeline** → pick your repo → **Existing Azure Pipelines
   YAML file** → select `/azure-pipelines.yml`.
4. Before running, click **Variables** and add:
   | Variable | Value | Secret |
   |---|---|---|
   | `VITE_SUPABASE_URL` | your new project URL | no |
   | `VITE_SUPABASE_ANON_KEY` | the anon key | yes |
   | `AZURE_SWA_TOKEN` | deployment token from step 1.6 | yes |
5. **Run**. The pipeline installs Node 20, builds `client/` with Vite, publishes
   the build artifact, and deploys `client/dist` to your Static Web App.
6. Open the Static Web App's URL (shown on its Overview page) — the app is live.

## 3. How the pieces fit (course concepts you're practicing)

- **`azure-pipelines.yml`** — pipeline-as-code (CI/CD in YAML, triggers, tasks).
- **Pipeline variables & secrets** — `$(VAR)` substitution, secret masking.
- **Build artifact** — `publish: client/dist` shows artifact publishing between
  build and deploy; split the steps into `Build`/`Deploy` stages later to
  practice multi-stage pipelines, environments, and approvals.
- **`client/public/staticwebapp.config.json`** — SPA fallback routing so
  deep links like `/group/<id>/study` serve `index.html` instead of 404.
- The site is static: all data access goes browser → Supabase, so there is no
  server to deploy. Supabase anon keys are designed to be public; row-level
  security (in `schema.sql`) is what protects each user's data.

## 4. Ideas to extend it for the course

- Split the pipeline into Build and Deploy **stages** with an **environment**
  and a manual approval check on Deploy.
- Add a PR-triggered run that only builds (no deploy) as a quality gate.
- Add `npm audit` or a linter step and publish results.
- Create a second Static Web App as a **staging** slot and deploy per branch.
