# Eventra 项目交接手册（给接手的 AI / 开发者）

> 基线：`main` @ PR #31（2026-11-09）。整理日期：2026-11-09。
> 读完本文即可开始开发。本文描述的是**代码当前真实状态**；与旧审计文档冲突时以本文和代码为准。
> 所有路径相对仓库根目录；`src/...` 下的 `@/` 别名指向 `src/`。

---

## 0. 先读这 12 条（最容易踩的坑）

1. **Next.js 是 16.4（App Router），不是你记忆中的版本。** 动用任何 Next API 前先读 `node_modules/next/dist/docs/`（`AGENTS.md` 的要求）。中间件文件叫 `src/proxy.ts`，导出函数名是 `proxy`，**没有** `middleware.ts`。
2. **只能连 Eventra 自己的 Supabase 项目** `tbicyyhprqbhimhrihgn`。`src/lib/supabase/project.ts` 的 `eventraDatabaseUrl()` 对任何其他 URL 直接抛错（防止连到兄弟项目 Pomelo）。不要绕过它。
3. **本地开发连的就是生产数据库**（`.env.local` 指向生产项目，没有独立的 staging 库）。本地点按钮 = 改线上数据。测试请用隔离的测试记录并清理。
4. **合并到 `main` 会自动部署生产**（Vercel → https://eventra.crestpointmarketing.net），但**数据库迁移不会自动应用**。新迁移必须先 `npx supabase db push --linked`（需要用户明确同意），再合并依赖它的代码。
5. **权限在数据库里，不在前端。** public schema 的所有表都开了 RLS；访问前提是用户在 `eventra_members` 表里。注册 ≠ 有权限。前端隐藏按钮只是体验，真正拦截靠 RLS 和触发器。
6. **新建 events / leads / assets 时 owner 字段必须等于当前用户**（触发器 `protect_eventra_ownership` 强制）。用 `insertOwnedEvent`（`src/lib/events/write.ts`）和 `insertAssignedTask`（`src/lib/tasks/write.ts`），不要直接 `insert`。
7. **任务没有 `module` / `reminder_at` 列**，它们以 HTML 注释编码在 `tasks.description` 开头（`<!-- eventra:module=x -->`）。读写任务用 `src/lib/api/tasks.ts` 的导出函数（`fetchTasks`、`fetchEventTasks`、`fetchTask`、`createTask`、`updateTask`），它们内部调用未导出的 `normalizeTask` / `prepareTaskWrite`；必须直接写库时用 `lib/tasks/modules.ts` 的 `encodeTaskModule` / `encodeTaskReminder`（参照 `tasks/new/page.tsx`）。`tasks.event_id` 必填。
8. **日期列是 `YYYY-MM-DD` 字符串。** 不要 `new Date('2026-10-01')`（按 UTC 解析，美国时区会差一天）。用 `src/lib/date-only.ts`：`formatDateOnly`、`dateOnlyToLocalDate`、`localDateKey`。
9. **shadcn `Select` 会丢弃 `''` 值**（`src/components/ui/select.tsx`，为了修 Radix 重置 bug）。选项值不要用空字符串，用 `'all'` 之类的哨兵值。
10. **搜索结果不得编造任何事实。** 未知就是 Unknown，不是 No 也不是 0；没有官方原文引用就不能标 Verified。见第 9 节。
11. **全量列表用 `fetchAllRows`**（`src/lib/api/pagination.ts`），Supabase 单次最多返回 1000 行。
12. **写完任何影响事件/任务的数据后调用 `refreshEventData(queryClient)`**（`src/lib/query-refresh.ts`），否则 EventPulse、Dashboard、任务列表会显示旧数据。

---

## 1. 产品是什么

Eventra（产品内模块名 **EventPulse**）是 B2B 营销团队的**活动营销管理 SaaS**：找到值得参加/赞助/参展的行业活动 → 核验 → 纳入活动组合 → 拆任务执行 → 收集线索 → AI 辅助跟进邮件。

核心闭环：

```
Discover（AI 搜索 + 官网证据核验）
  → Review 队列 / 直接导入（人工确认，绝不自动入库）
  → My Events（活动组合 Portfolio）→ 活动详情（AI 分析、风险、评论、文件、分享）
  → Tasks（28 个起步任务模板、8 个业务模块、清单、协作者、成本）
  → Leads（导入、AI 摘要/评分、备注、活动记录）
  → Email（模板库 + AI 草稿，手动发送后标记）
  → Reports（统计）
```

- 用户：一个市场团队（单团队、单工作区；没有多租户）。
- 设计原则（来自产品方）："Find broadly, verify narrowly, explain every result, and import only with user approval."

### 1.1 页面与路由（共 29 个）

工作区页面都在 `src/app/(dashboard)/`，需要登录 + 团队成员身份。左侧栏定义在 `src/components/layout/app-shell.tsx`：`MAIN_NAV`（主菜单）和 `FOOTER_NAV`（Settings、Help & Support）；顶栏标题来自 `PAGE_TITLES`（**按顺序首个匹配生效**，具体路径要排在前缀之前，如 `/events/new` 在 `/events` 前）。

| 侧栏菜单 | 路由 | 主要文件 | 说明 |
|---|---|---|---|
| Discover | `/discover?view=discover` | `components/events/find-events-view.tsx` | AI 活动搜索；两种模式：Discover events / Find a specific event |
| My Events | `/discover?view=portfolio`（默认） | `app/(dashboard)/discover/page.tsx` | 活动组合表格、筛选、批量操作、导出；`?view=insights` 为洞察页 |
| Review | `/discover?view=review` | `components/events/review-queue-view.tsx` | 搜索结果审核队列（批准/拒绝） |
| Overview | `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | 周/月/年日历（.ics 导出）、统计卡 |
| Leads | `/leads`、`/leads/[id]` | `app/(dashboard)/leads/...` | 线索列表、详情、AI、邮件 |
| Tasks | `/tasks`、`/tasks/new`、`/tasks/[id]` | `app/(dashboard)/tasks/...` | 任务列表（按 8 模块分组）、详情 |
| Email Templates | `/email-templates` | `components/email-templates/*` | 模板库 |
| Assets | `/assets` | `app/(dashboard)/assets/page.tsx` | 文件库 |
| Reports | `/analytics` | `app/(dashboard)/analytics/page.tsx` | 客户端计算的统计图表 |
| Settings | `/settings`、`/settings/{account,notifications,security,company-intelligence}` | `app/(dashboard)/settings/*` | 账户、提醒、安全、公司信息（AI 上下文） |
| Help | `/help`（公开） | `app/help/page.tsx` | 帮助指南 |

其他：`/events/new`、`/events/[id]`（`layout.tsx` 承载头部操作：编辑/复制/导出 JSON 和 PDF/删除/分享）、`/events/[id]/{edit,assets,leads}`、`/events`（重定向到 `/discover`）、`/ai-demo`（演示页，无入口，含假数据）。

公开页面：`/`（营销首页）、`/about`、`/help`、`/contact`（只生成文本供复制，不发送）、`/login`、`/reset-password`、`/auth/callback`、`/share/[token]`（30 天有效的只读活动分享页）。公开页使用旧的顶部导航 `components/layout/top-nav.tsx`。

---

## 2. 环境、运行与发布

### 2.1 外部资源

| 资源 | 地址 / 标识 |
|---|---|
| GitHub | https://github.com/crestpointmarketing/eventra-app（`main` 为生产分支；仓库**未开启自动合并**） |
| 生产域名 | https://eventra.crestpointmarketing.net |
| Vercel 项目 | https://vercel.com/crestpointmarketings-projects/eventra-app（projectId `prj_kc8talqMja10DCFH4EkUVXhg5m7E`）；PR 会生成需要 Vercel 登录才能访问的预览地址 |
| Supabase | 项目 ref `tbicyyhprqbhimhrihgn`（名称 eventra-production），本地 CLI 已 link |
| Cron | `vercel.json`：每分钟调用 `/api/cron/event-search`（续跑搜索任务） |

### 2.2 环境变量（`.env.example`）

| 变量 | 作用 | 可见性 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 必须是 `https://tbicyyhprqbhimhrihgn.supabase.co` | 浏览器 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 公钥（受 RLS 约束） | 浏览器 |
| `OPENAI_API_KEY` | 所有 GPT 功能 | 仅服务端 |
| `PERPLEXITY_API_KEY` | 活动发现（sonar-pro）与活动分析 | 仅服务端 |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅搜索 worker 使用（绕过 RLS） | 仅服务端，绝不能加 `NEXT_PUBLIC_` |
| `CRON_SECRET` | cron 路由的 Bearer 校验 | 仅服务端 |

### 2.3 本地命令

- Node `>=22.15 <23`。`npm ci` → 复制 `.env.example` 为 `.env.local` 并填值 → `npm run dev`。
- 开发服务器默认端口 3000。
- `npm run check` = lint + `tsc --noEmit` + 单元测试 + `next build`。**提交前必须跑通**；CI（`.github/workflows/check.yml`）跑同样的命令，外加 `npm audit --omit=dev --audit-level=high`（新公布的依赖漏洞会让 CI 失败，与改动无关时用 `npm audit fix` 单独开 PR 修）。
- CI 使用占位 Supabase 地址，所以**模块顶层不能调用 `createClient()` / `new OpenAI()`**，必须懒加载，否则 build 失败。

### 2.4 发布流程（务必按顺序）

1. 新分支 → 改动 → `npm run check` → PR（squash 合并是惯例，PR 标题即 commit 标题）。
2. 如有新迁移：先 `npx supabase db push --linked --dry-run` 看清单，**征得用户同意后** `npx supabase db push --linked`。
3. CI 通过后合并 → Vercel 自动部署生产（约 1–2 分钟）。
4. 部署状态：`gh api repos/crestpointmarketing/eventra-app/commits/<sha>/status`。

Supabase CLI 新版注意：`db query` 用 `--remote`（`--linked` 已弃用），只读查询必须加 `--read-only`，写操作在 agent 模式下会要求确认。

### 2.5 管理团队成员与管理员

没有应用内成员管理。授权方式（在 Supabase SQL 编辑器执行）：

```sql
-- 加入团队（用户须先注册）
insert into public.eventra_members(user_id)
select id from auth.users where lower(email) = 'someone@example.com';
-- 设为管理员（可增删改所有人的记录）
update public.eventra_members set role = 'admin'
where user_id = (select id from auth.users where lower(email) = 'someone@example.com');
```

当前成员与角色以数据库为准（`select u.email, m.role from eventra_members m join auth.users u on u.id = m.user_id`）。仓库是公开的，不要在任何提交里写入账号、密码或密钥。

---

## 3. 技术栈

| 层 | 选型（版本以 lockfile 为准） |
|---|---|
| 框架 | Next.js 16.4.3（App Router、Turbopack）、React 19.2、TypeScript 5（strict） |
| 数据 | Supabase（Postgres + Auth + Storage），`@supabase/ssr` + `supabase-js` 2 |
| 客户端状态 | TanStack Query 5（`providers/query-provider.tsx`：staleTime 60s，关闭窗口聚焦重取，换用户时清缓存）；`zustand` 已安装但**未使用** |
| UI | Tailwind CSS 3.4、shadcn/ui（new-york）、Radix、lucide-react 0.563、sonner（toast）、framer-motion、recharts、next-themes（`class` 暗色模式） |
| 表单校验 | react-hook-form + zod 4 |
| AI | OpenAI SDK 6（`gpt-4o-mini` 为主）、Perplexity（`sonar-pro` / `sonar`，经 OpenAI SDK 的 baseURL） |
| 文件 | papaparse（CSV 导入）、exceljs（XLSX 导出）、jspdf + autotable（PDF） |
| 测试 | Node 内置 test runner + tsx；PGlite（内存 Postgres）跑真实迁移 |
| 部署 | Vercel + Vercel Cron；GitHub Actions；Dependabot |

刻意推迟的大版本升级：Tailwind 4、TypeScript 6、ESLint 10、lucide-react 1、openai 7、framer-motion 14（Dependabot PR #1/#3/#4/#5/#21 仍开着，需要单独评估迁移）。

---

## 4. 目录结构

```
src/
  proxy.ts                     Next 16 中间件：刷新会话、公开路径、/api 401
  app/
    layout.tsx                 根布局（force-dynamic、ThemeProvider、QueryProvider、Toaster）
    page.tsx, about/, help/, contact/, login/, reset-password/, auth/callback/, share/[token]/
    (dashboard)/layout.tsx     登录 + is_eventra_member 闸门 → AppShell
    (dashboard)/<页面>/         见 1.1
    api/
      ai/<13 个路由>/           AI 功能（guardAI 保护）
      discover-events/{,parse,cancel,retry,import}/   活动搜索
      cron/event-search/       Vercel Cron 续跑 worker
      events/bulk-delete/, events/[id]/share/
      company-intelligence/    GET/PUT 公司信息（debug 子路由恒返回 404）
  components/
    layout/app-shell.tsx       工作区侧栏 + 顶栏（铃铛=我逾期/今天到期任务）
    layout/top-nav.tsx         公开页顶部导航
    events/                    Discover / Portfolio / Review / 活动详情各部件（见 8.1）
    leads/, email/, email-templates/, tasks/, company-intelligence/, dashboard/, settings/, auth/, ai/
    users/user-select.tsx      负责人选择器（读 users 表）
    ui/                        shadcn 组件
  hooks/                       TanStack Query 封装（useTasks、useEvents、useLeads、useIsAdmin…）
  lib/
    supabase/{client,server,middleware,project,auth}.ts
    api/*.ts                   各表的数据访问（浏览器端；含 saved-search.ts 收藏）
    api/guard.ts               AI/搜索路由的统一守卫
    ai/*.ts                    OpenAI/Perplexity 服务、提示、schema、公司上下文
    events/*.ts                搜索流水线、导入写入、默认任务、ics、优先级、分类
    tasks/{modules,write}.ts   8 个任务模块与描述编码、带负责人的任务写入
    security/public-fetch.ts   防 SSRF 的抓取
    date-only.ts, export.ts, safe-preview.ts, query-refresh.ts, analytics.ts
  providers/                   query-provider、theme-provider
  types/                       database.ts（手写类型）、email-templates.ts、company-intelligence.ts
supabase/migrations/           唯一可信的数据库变更来源（9 个文件）
supabase/*.sql                 遗留脚本，从未作为迁移应用，忽略
tests/                         *.test.ts 单元/数据库测试；*.mjs 手动线上冒烟脚本
docs/                          审计与设计文档（见第 14 节）
```

最大的几个文件（改动热点）：`app/(dashboard)/discover/page.tsx`（~1050 行）、`tasks/[id]/page.tsx`、`components/events/search-filters.tsx`、`find-events-view.tsx`、`review-queue-view.tsx`、`leads/page.tsx`、`tasks/page.tsx`、`email/email-composer.tsx`。

---

## 5. 架构与请求流

```
浏览器组件
  → hooks/*（TanStack Query：queryKey、mutation、toast、refreshEventData）
    → lib/api/*（supabase-js，匿名公钥 + 用户 session，受 RLS 约束）
      → Postgres（RLS + 触发器 + RPC）

浏览器 → fetch('/api/...') → route handler
  → guardAI（登录、成员、body≤32KB、zod、AI 配额）
  → lib/supabase/server.ts（cookie session，仍受 RLS）
  → lib/ai/*（OpenAI / Perplexity）→ 记录 ai_usage / ai_insights

Vercel Cron（每分钟）→ /api/cron/event-search（CRON_SECRET）
  → lib/events/search-worker.ts（service role，绕过 RLS，租约制处理搜索任务）
```

### 5.1 Supabase 客户端

- 浏览器：`lib/supabase/client.ts` 的 `createClient()`（`@supabase/ssr` 内部缓存）。`lib/api/*` 旧模块用模块内懒单例 `getSupabase()`，新模块直接调 `createClient()`，两种都可以，**禁止在模块顶层创建**。
- 服务端：`lib/supabase/server.ts` 的 `await createClient()`（读 cookie）。用于 route handler、`(dashboard)/layout.tsx`、`lib/ai/*`、auth callback。
- Service role：只在 `lib/events/search-worker.ts`（带 `import 'server-only'`）。

### 5.2 认证与访问

- `lib/supabase/middleware.ts`：每个请求 `getUser()`；公开路径：`/`、`/login`、`/reset-password`、`/contact`、`/about`、`/help`、`/auth/*`、`/share/*` 和静态资源；未登录访问 `/api/*` → `401 {error:'Unauthorized'}`，其他路径 → `/login?next=<原路径>`；`/api/cron/event-search` 免会话（用 CRON_SECRET）。
- 登录方式：邮箱 + 密码（含注册 `?mode=signup`、忘记密码邮件、重设密码）。**没有 OAuth / 2FA**。
- `lib/auth/next-path.ts` 的 `safeNextPath` 只接受站内路径。
- `(dashboard)/layout.tsx`：`rpc('is_eventra_member')` 为 false 时渲染 `TeamAccessNotice`（中英双语，含重新检查/切换账号）。
- 前端判断管理员：`useIsAdmin()`（调用 `is_eventra_admin` RPC），只用于显示按钮。

---

## 6. 数据模型

迁移按顺序（另有 `20261109010000_lock_follow_up_records.sql`：锁定遗留表）：

1. `20260813010000_eventra_production_baseline.sql`：pg_dump 基线（枚举、18 张表、触发器、bucket）
2. `20260906010000_security_and_integrity.sql`：团队成员模型、RLS 重建、所有权触发器、AI 表、核心 RPC、存储策略
3. `20260906020000_template_transactions.sql`：`save_email_template`、复制模板 RPC 包装
4. `20260906030000_activity_defaults.sql`：`lead_activities.created_by` 默认值
5. `20260906040000_reliable_search.sql`：搜索任务、导入台账、队列批准（无 BEGIN/COMMIT）
6. `20260906050000_search_review_dedup.sql`：批准时按 editionKey 去重（无 BEGIN/COMMIT）
7. `20260927010000_template_soft_delete.sql`：模板软删除 RPC
8. `20261024010000_saved_search_results.sql`：收藏的搜索结果
9. `20261025010000_admin_role.sql`：`role` 列、`is_eventra_admin()`、管理员例外

### 6.1 核心表

| 表 | 用途 | 关键列 / 注意 |
|---|---|---|
| `events` | 活动组合 | `owner_id`（必填，无 FK，所有权键）；`name`、`event_type`（自由文本，分类见 `lib/events/taxonomy.ts`）；`status`（无约束：draft/planning/planned/upcoming/live/completed/canceled）；`start_date`/`end_date`（date，CHECK end≥start）；`engagement_type`（CHECK：Sponsor/Exhibit/Attend/Speaking/Follow）；`discovery_priority`（High/Medium/Low）；`source`（manual/ai_discovered）；`url` **和** `website_url`（重复列：`eventInsert` 与编辑页写两列同值；AI 导入和队列批准只写 `website_url`，`url` 为空。读取时用 `website_url ?? url`）；`metadata.search`（导入的完整搜索结果，含 `editionKey`/`seriesKey`）；`share_token`/`share_expires_at`；预算与目标/实际线索、收入；`deleted_at`（部分代码遵守）；时间戳是 `timestamp without time zone`，**无 updated_at 触发器** |
| `tasks` | 活动任务 | `event_id` 必填（级联删除）；`assigned_to`（→ users，所有权键）；`status` CHECK：draft/pending/in_progress/review/done/archived；`priority`：low/medium/high/urgent；`payment_status`：unpaid/partial/paid；`due_date`、`estimated_cost`、`actual_cost`、`vendor_company`、`contact_person`、`completed_at`、`archived_at`；`description` 内嵌 module/reminder 标记 |
| `task_checklist_items` | 任务清单 | `task_id`、`title`、`is_completed`、`position` |
| `task_collaborators` | 任务协作者 | `task_id`、`user_id`、`role`（UI 未使用） |
| `leads` | 线索 | `owner_id`（默认 auth.uid()）；`event_id` 可空；`first_name`/`last_name`/`email`/`company` 必填；`priority`（hot/warm/cold，无约束）、`stage`；`(event_id, normalized_email)` 部分唯一；AI 字段 `ai_summary`、`extracted_needs` 等；`last_contacted_at` |
| `lead_activities` | 线索时间线 / 备注 | `activity_type`（如 note、email_sent）、`activity_data jsonb`、`created_by` |
| `event_comments` | 活动评论 | 作者以 `author_email` 识别（= `auth.email()`），无编辑 |
| `assets` | 文件库 | `uploaded_by`（所有权键）、`event_id`/`task_id`（SET NULL）、`file_url`（存的是公共 URL 形式，读取时转 1 小时签名 URL） |
| `users` | auth 用户的资料镜像 | `id`、`email`、`name`；由 `handle_new_user` 触发器填充；**包含历史人物，不等于成员** |
| `eventra_members` | 团队白名单 | `user_id`、`role`（member/admin）；前端无写权限 |
| `company_intelligence` | 每用户一行的公司信息（AI 上下文） | 产品、行业、ICP、差异点、AI 行为规则等 jsonb |
| `email_templates` + `_subjects` / `_blocks` / `_ctas` | 邮件模板 | 枚举：category(follow_up/warm_up/product_info)、goal、tone、language(en/zh/bilingual)、status(active/disabled/archived)、block_type、cta_type；`is_system`、`version`（乐观锁）、`deleted_at`（软删除） |
| `event_search_jobs` | 异步 AI 搜索任务 | `user_id`、`environment`（区分生产/预览 worker）、`criteria`、`status`(queued/running/completed/warnings/failed/cancelled)、`stage`、`candidates`/`results`/`warnings` jsonb、`counts`、`lease_token`/`lease_until`/`attempts` |
| `event_search_imports` | 导入幂等台账 | PK(job_id, result_id) → event_id 或 queue_id |
| `event_discovery_queue` | 团队审核队列 | `type`(NEW/DUPLICATE/UPDATE)、`status`(PENDING/APPROVED/REJECTED)、`event_data jsonb`、`existing_event_id`、`imported_event_id` |
| `saved_search_results` | 收藏的搜索结果 | `user_id`、`job_id`、`result_id`、`result`（快照，≤256KB）；仅本人可见 |
| `ai_usage` / `ai_insights` / `ai_request_limits` | AI 调用日志 / 缓存洞察 / 配额计数 | 配额只能经 `consume_ai_request()` 修改 |

遗留未用表：`event_assets`（被 `assets` 取代）、`meetings`、`follow_up_records`（线索沟通记录，代码未使用；基线曾对 anon/authenticated 开放，已由迁移 `20261109010000_lock_follow_up_records.sql` 锁定为仅 service role 可访问）。

### 6.2 权限模型（RLS）

- `is_eventra_member()` / `is_eventra_admin()`：SECURITY DEFINER 辅助函数，所有策略都用它们。
- 主要业务表：**任何成员可读、可新增、可修改**（`team_read` / `team_insert` / `team_update`）。
- 删除（`owner_delete` 等）：

| 表 | 谁能删 |
|---|---|
| events、leads | owner 或 admin |
| tasks | admin、任务负责人或所属活动 owner |
| assets | 上传者或 admin |
| 清单项、协作者 | admin、任务负责人或活动 owner |
| 评论 | 作者（按邮箱）或 admin |
| 线索活动 | admin 或线索 owner |
| 邮件模板 | 创建者（非系统模板）或 admin（含系统模板），经 RPC |
| 审核队列 | 不能删，拒绝 = 改状态为 REJECTED |

- **所有权触发器**（触发器名 `protect_ownership`，函数 `public.protect_eventra_ownership()`；events/leads/tasks/assets/event_assets，BEFORE INSERT/UPDATE）：函数只认识三种 owner 列：`owner_id`、`uploaded_by`（assets 类）、`assigned_to`（tasks）；插入时 owner 键必须是自己；非 owner 修改时不能改 owner 键、`event_id`（例外：owner 解绑自己活动下的记录）、`deleted_at`、`share_token`、`share_expires_at`、`file_url`。**admin 和 `auth.uid()` 为空（service role / SQL 编辑器）时直接放行。** 任务的 "owner" 指所属活动的 owner。
- 存储 bucket `event-assets`：私有，25MB，限定 MIME；路径规则 `{uid}/{timestamp}_{rand}.{ext}`；成员可读，只能写自己目录（admin 可改删任意文件）。

### 6.3 RPC（数据库函数）

| 函数 | 调用方 | 作用 |
|---|---|---|
| `is_eventra_member()` / `is_eventra_admin()` | layout、guard、`useIsAdmin` | 身份判断 |
| `consume_ai_request()` | `guardAI` | 每人每分钟 20 次、每 UTC 日 500 次 |
| `delete_events_atomic(uuid[])` | `/api/events/bulk-delete` | 1–100 个，全部须为本人（或 admin）所有，事务内解绑/删除子记录后硬删除 |
| `get_shared_event(token)` | `/share/[token]`（匿名可调） | 返回裁剪后的公开字段 |
| `mark_lead_sent(lead_id, subject)` | 邮件编辑器 | 记录手动发送 |
| `save_email_template(jsonb)` | 模板编辑 | 事务性保存模板及子表；`expected_version` 不符报 40001 |
| `soft_delete_email_template(id)`、`rpc_duplicate_email_template(id, name)` | 模板 | 软删除 / 复制 |
| `create_event_search` / `cancel_event_search` / `retry_event_search` | `/api/discover-events/*` | 每人同时最多 1 个进行中任务；条件 ≤24KB；create 和 retry 在 SQL 内部消耗 AI 配额（所以搜索路由调用 `guardAI` 时传 `consumeQuota:false`）；retry 只接受 failed / warnings 状态 |
| `claim_event_search(env, id)` | worker（service role） | `FOR UPDATE SKIP LOCKED`，6 分钟租约，最多 4 次尝试 |
| `import_event_search(job, result, queue, tasks)` | `/api/discover-events/import` | 幂等导入到组合（含 ≤50 个任务）或审核队列；按 editionKey 去重；创建的任务没有负责人 |
| `approve_discovery_item(id, payload, tasks)` | Review 队列 | 幂等批准；同 editionKey 已存在则关联 |

### 6.4 新迁移的写法要求

- 文件名 `YYYYMMDDHHMMSS_描述.sql`，排序在已有文件之后；用 `BEGIN; ... COMMIT;` 包裹。
- **必须能在 PGlite 测试环境跑通**：只可使用测试桩提供的角色 anon/authenticated/service_role、`auth.users(id, email, raw_user_meta_data)`、`auth.uid()`、`auth.email()`、`auth.role()`、`extensions.uuid_generate_v4()`、`storage.buckets`、`storage.foldername()`、`storage.objects(bucket_id, name)`；不要 `CREATE EXTENSION`、`auth.jwt()`、pg_cron、pg_net、vault。
- 替换已有函数前，先对比线上版本和仓库版本是否一致（曾发生过线上手动建过函数、迁移记录缺失的情况，需要 `supabase migration repair`）。
- 在 `tests/database.test.ts` 加对应测试（用 `asUser(db, id)` 切换身份）。

---

## 7. 前端约定

### 7.1 数据获取与缓存

- 每个领域一个 hook 文件（`src/hooks/useX.ts`），mutation 模式统一：`onSuccess` → 失效缓存 + `toast.success`；`onError` → `toast.error`。
- 常用 query key：`['events']`、`['event', id]`、`['tasks', filters]`、`['tasks','event',id]`、`['tasks', id]`、`['leads']`、`['lead', id]`、`['lead-activities', id]`、`['assets', filters]`、`['users']`、`['users', id]`、`['user']`、`['current-user-email']`、`['is-admin']`、`['company-intelligence']`、`['event-comments', id]`、`['checklist', taskId]`、`['collaborators', taskId]`、`['discovery-queue']`、`['eventpulse-events']`、`['eventpulse-task-summary']`、`['eventpulse-review-count']`、`['email-recommendation', leadId]`、`['ai', …]`（`hooks/useAI.ts`）、模板用 `emailTemplateKeys` 工厂。
- `refreshEventData(queryClient)` 失效：`events`、`event`、`eventpulse-events`、`eventpulse-task-summary`、`eventpulse-review-count`、`tasks`、`task`（`['task']` 没有对应查询）。另外 `review-queue-view.tsx` 和 `eventpulse-detail-sheet.tsx` 里失效的 `['discover-events']` 也没有对应查询，是残留。
- Discover 搜索不用 TanStack Query：`find-events-view.tsx` 用本地 state + 进行中时每 3 秒轮询 `/api/discover-events`。

### 7.2 UI 规范

- 工作区布局：`AppShell`（左侧 `w-56` 深色侧栏 `#111827` + 顶部 `h-16` 栏）；页面内容自带 `px-4 sm:px-6` 内边距。
- 全局样式 `src/app/globals.css`：HSL token（亮/暗）、`.eventra-workspace`（14px 基准、表格、输入框、焦点）、按钮类 `.workspace-action`（lime 主按钮）和 `.workspace-secondary`；移动端最小触控高度 44px。
- 字重只用 400/500/600；暗色模式用 `dark:` 类。新组件优先用语义 token（`bg-card`、`text-muted-foreground`、`border-border`）。
- 图标：lucide-react；提示：sonner；对话框/抽屉：shadcn `Dialog` / `Sheet`；下拉：`DropdownMenu`。
- 未知值显示 `Unknown`，不显示 0 或空白；不展示编造的统计数字。
- 导出：`lib/export.ts`（CSV 公式注入防护；活动导出实际是 XLSX）；PDF 在 `events/[id]/layout.tsx`。
- 邮件模板预览：`lib/safe-preview.ts` 先转义再插入，不要直接把用户内容放进 `dangerouslySetInnerHTML`。

### 7.3 写入规则

- 活动：`insertOwnedEvent` / `eventInsert`（字段白名单、`url = website_url`、owner = 当前用户）；删除走 `/api/events/bulk-delete`，错误用 `eventDeleteFailure` 映射。
- 任务：`insertAssignedTask`（负责人默认当前用户，保证创建者能删除）；`seedDefaultEventTasks` 生成 28 个起步任务（按标题幂等）。注意 `seedDefaultEventTasks`、`import_event_search`、`approve_discovery_item` 创建的任务都不设负责人，只有活动 owner 或 admin 能删；模块定义 `lib/tasks/modules.ts`（strategy、budget_planning、marketing、sales、logistics_operations、execution、follow_up、analytics_roi）。
- 文件：`lib/api/assets.ts`（上传到 `{uid}/`、类型白名单、按扩展名补 content-type，修复 Windows CSV）。

---

## 8. 各模块实现要点

### 8.1 Discover（`components/events/`）

| 文件 | 职责 |
|---|---|
| `find-events-view.tsx` | 总控：两种模式、条件 chips、历史任务、进度、结果分类标签（Strict / Needs Verification / Excluded / Saved）、导入、收藏、详情页切换、右侧证据面板（≥1280px 常驻，否则抽屉）|
| `search-filters.tsx` + `advanced-search-controls.tsx` | 左侧筛选（日期、地区多选、国家/州/市、行业、技术、类型、形式、受众、主办方）与高级筛选抽屉（prefer/require 规则）；`advancedRequest` 计数器用于“Add filter”打开抽屉 |
| `discover-result-card.tsx` | 结果卡片：收起态（名称、日期、地点、类型·形式、状态、Save、View event、导入状态）/ Show details 原地展开（About、演讲人/国家/参会数、来源、数据质量、Visit official website）|
| `search-result-details.tsx` | View event 打开的站内活动详情页；Back to events 保留列表的筛选与滚动位置（列表保持挂载，只是隐藏）|
| `specific-event-search.tsx` | 精确查找：单输入框（名称或 URL）、5 步进度、届次排序标签 Best match / Possible match / Past edition（`rankEditions`）|
| `field-evidence-sheet.tsx` | `EvidencePanel`（Field Evidence / Raw Sources 两个标签）、`FieldEvidenceSheet`（抽屉）、`EvidenceBadge` |
| `search-import-dialog.tsx` | 导入确认：去重检查、组合 vs 审核队列、是否生成 {count} 个任务 |
| `review-queue-view.tsx` | 审核队列 |
| `search-ui.tsx` | 共用：相对时间、日期区间格式、地点、官方来源判断、`EventThumb`（og:image 或日期卡片）、`SearchStepper` |

### 8.2 My Events / Portfolio（`app/(dashboard)/discover/page.tsx`）

`?view=` 由 `useSearchParams` 驱动（`switchView` 用 `history.replaceState`）。分页拉取全部活动和任务、多维筛选、行内修改、批量修改/删除、导出、详情抽屉 `eventpulse-detail-sheet.tsx`、Insights（未来 30 天、组合分布、疑似重复 `lib/events/duplicates.ts`）。

### 8.3 其他模块

- **活动详情** `events/[id]/`：Overview（AI 分析 `analyze-event`、评论）、Tasks（`event-tasks-tab.tsx`，含 AI 依赖分析）、Email、Risks（`analyze-risks`，结果不保存）、Insights；头部操作在 `layout.tsx`。
- **任务** `tasks/`：8 模块分组、多维筛选（列表分页按钮目前是禁用的占位）、AI 任务生成器、详情页（行内编辑、清单、协作者、预算、附件、提醒）。提醒由 `components/tasks/task-reminder-notifier.tsx` 每 30 秒检查并弹 toast，开关存在 localStorage。
- **线索** `leads/`：搜索/筛选/分页、新增、CSV 导入（≤1000 行/5MB，AI 处理在浏览器跑）、导出、批量状态、批量 AI 摘要、详情（AI 概览、推荐、备注时间线、邮件页签）。**还没有编辑/删除入口。**
- **邮件**：`components/email/email-composer.tsx`（模板推荐、AI 草稿、主题行、复制、`mark_lead_sent` 手动标记）。**不实际发信。**
- **模板** `components/email-templates/`：创建/编辑（乐观锁）、复制、启停、软删除；所有者或 admin 才显示编辑/删除。
- **公司信息** `settings/company-intelligence`：三个页签，30 秒自动存草稿；被部分 AI 服务注入为系统提示（`lib/ai/company-context.ts`）。
- **Reports** `analytics/`：客户端从 events + leads 计算，无日期范围/导出。

---

## 9. 活动搜索流水线（最复杂的部分）

文档：`docs/reliable-event-search.md`。代码：`src/lib/events/search-*.ts`。

1. **条件** `search-contract.ts`：`searchCriteriaSchema`（strict；mode discover|specific；日期、国家/州/市、`regions`、类型、行业、技术、关键词 any/all/exclude、主办方、受众、includePast、advanced）。`SEARCH_FIELDS` = 核心字段 + 高级字段 + `PROFILE_FIELDS`（country_count、speaker_count、exhibitor_count，仅展示，不参与匹配和 Verified 判定）。
2. **创建** `POST /api/discover-events` → `create_event_search` RPC → 返回 202，用 `after()` 立即在本次请求里跑 worker。
3. **Worker** `search-worker.ts`：claim 租约 → 生成查询 → Perplexity `sonar-pro` 找候选（最多 16 个，加上用户给的 URL）→ 每批 2 个核验 → 每步 checkpoint（只更新持有 `lease_token` 的行）→ 215 秒预算用完就重新排队，交给每分钟的 cron 续跑 → 去重 → `completed` / `warnings` / `failed`。
4. **核验** `search-research.ts`：
   - `fetchPublicText`（`lib/security/public-fetch.ts`：每跳 DNS 固定、只允许公网单播地址、80/443 端口、512KB、≤3 次跳转、8 秒）；
   - 聚合站点（eventbrite、10times…）记为 third_party；
   - 主办方页与活动页相互印证才算 `official_edition`；
   - 最多再跟 2 个同域报名/赞助/演讲页面；
   - 取活动页 og:image 作为封面；
   - `gpt-4o-mini` 抽取字段，要求**逐字引用原文**；`validateEvidence` 校验引用确实在网页里，`valueSupported` 按字段类型校验上下文（日期须含年月日、价格须有票价语境等），不满足就降为 unverified。
5. **评估** `search-evaluation.ts`：`resolveField`（多个已核实值不一致 → `conflict`）；分类：任一必需条件失败 → **excluded**；任一必需条件未知、核心字段冲突或有警告 → **verification**；否则 **strict**。`seriesKey` = 系列名 + 主办方 + 官网域名；`editionKey` = seriesKey + 起止日期（日期确认后才有）。区域匹配用 `lib/events/regions.ts`。
6. **导入** `POST /api/discover-events/import` → `import_event_search` RPC（幂等、去重、可选生成任务）；或进审核队列 → `approve_discovery_item`。

不变式（改代码时不得破坏）：绝不编造；Unknown ≠ No；prefer 规则只影响排序不排除；推断的受众不算已核实；不做汇率换算，不从 "$" 推断 USD；活动日期不能当截止日期；HTTP 200 不是证据；搜索本身从不写入组合，只有用户确认导入才写。

测试：`tests/search-evaluation.test.ts`（17 项）覆盖以上规则；改评估逻辑必须补测试。

---

## 10. AI 能力

- 守卫 `lib/api/guard.ts` 的 `guardAI(request, {consumeQuota?})`（body 大小、zod 和配额只在 POST 时检查，GET 跳过）：401 未登录 / 403 非成员 / 503 权限服务异常 / 413 请求体 >32KB / 400 JSON 或字段非法 / 429 超配额（`Retry-After: 60`）。它读取的是 body 的 clone，路由里仍可 `await request.json()`。
- 服务 `lib/ai/openai-service.ts`：懒加载 OpenAI 客户端（45 秒超时，重试 1 次）；`generateChatCompletion`（默认 `gpt-4o-mini`，返回 `{content, usage, error}`，供应商错误映射为安全文案）；`trackUsage` 写 `ai_usage`；`storeAIInsight` 写 `ai_insights`；`trackedChatCompletion`。
- Perplexity：`lib/ai/perplexity.ts` 只负责创建客户端；模型由调用方决定：活动发现用 `sonar-pro`（`search-research.ts`），活动分析同时用 `sonar-pro` 和 `sonar`（`event-intelligence-service.ts`）。
- 错误响应统一 `{ error: string }`；成功形状各路由不同。

| 路由 | 前端调用处 | 状态 |
|---|---|---|
| `ai/summarize-lead` | 线索列表、导入、线索详情 | 在用 |
| `ai/generate-email-draft`、`generate-subject-lines`、`recommend-email` | 邮件编辑器 | 在用 |
| `ai/analyze-event`、`analyze-risks` | 活动详情 | 在用 |
| `ai/generate-tasks`、`analyze-dependencies` | 任务页、活动任务页签 | 在用 |
| `ai/predict-completion`、`progress-insights`、`qualify-lead` | 只被未挂载的组件调用 | 实际无人用 |
| `ai/score-lead`、`generate-content` | 只有 `/ai-demo` | 演示 |
| `discover-events/parse` | Discover “Extract filters from text” | 在用（不记 ai_usage）|

**新增 AI 路由模板**（参照 `app/api/ai/summarize-lead/route.ts`）：

```ts
export async function POST(request: NextRequest) {
    const denied = await guardAI(request)
    if (denied) return denied
    try {
        const { leadId } = await request.json()
        const supabase = await createClient()          // 受 RLS 约束
        // ... 读取数据，拼 messages
        const { content, error } = await generateChatCompletion({
            messages, model: 'gpt-4o-mini', maxTokens: 1500, temperature: 0.4,
            feature: 'lead_summary', requestData: { leadId },  // 必须是 openai-service.ts 中 AIFeature 联合类型的值；新功能先在那里加
        })
        if (error || !content) return NextResponse.json({ error: error || 'Generation failed' }, { status: 500 })
        const parsed = mySchema.parse(JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)))
        return NextResponse.json({ success: true, ...parsed })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
    }
}
```

长任务：`export const maxDuration = 300`，用 `after()` 在响应后继续执行。

---

## 11. 常见开发任务食谱

**新增一个工作区页面**
1. 建 `src/app/(dashboard)/<name>/page.tsx`（客户端组件写 `'use client'`；如用 `useSearchParams` 要包 `Suspense`）。
2. 在 `app-shell.tsx` 的 `MAIN_NAV` 和 `PAGE_TITLES` 加入口和标题。
3. 数据用 hook + `lib/api`，见下一条。

**给已有表加字段并在页面使用**
1. 写迁移（6.4 节规则），必要时调整 RLS/触发器；在 `tests/database.test.ts` 加测试。
2. 更新 `src/types/database.ts` 的手写类型和相关 `lib/api/*` 的 select 列表。
3. 改 hook / 组件；写操作成功后失效相关 query key。
4. `npm run check` → PR → 先应用迁移再合并。

**新增一张业务表**
- 开 RLS；`revoke all ... from anon`；`grant select, insert, update, delete ... to authenticated`；策略都以 `public.is_eventra_member()` 为前提；删除策略加 `OR public.is_eventra_admin()`。
- 如需所有权：owner 列命名为 `owner_id`、默认 `auth.uid()`（否则要改 `protect_eventra_ownership()` 里的 owner 列判断），并加触发器 `CREATE TRIGGER protect_ownership BEFORE INSERT OR UPDATE ON public.<表> FOR EACH ROW EXECUTE FUNCTION public.protect_eventra_ownership();`。插入时的 owner 校验只对 events/leads/assets/event_assets 生效，新表要校验需改函数。

**改搜索字段或规则**
- 字段加到 `search-contract.ts` 的对应列表（`ADVANCED_SEARCH_FIELDS`，或展示类的 `PROFILE_FIELDS`）；在 `search-research.ts` 的抽取提示和 `valueSupported` 加上下文校验；展示处有三处：`field-evidence-sheet.tsx` 的 `ROWS`、`discover-result-card.tsx` 的 `STATS`、`search-result-details.tsx` 的信息表；补 `search-evaluation.test.ts`。旧任务由 `hydrateSearchJob` 兼容。

**本地验证 UI 但不想登录生产账号**
- 做法一（推荐）：在 `src/app/share/<临时名>/page.tsx` 写一个临时页面（`/share/*` 是公开路径），用假数据渲染组件，必要时 mock `window.fetch`；验证后删除，**不要提交**。
- 做法二：`node tests/ui-fixture.mjs create <email> <password>` 用生产 service role 创建临时成员账号做真实登录测试，结束后 `node tests/ui-fixture.mjs` 删除。它会写生产库，必须先征得用户同意。

**本地跑 Discover 搜索的注意事项**
- 搜索任务的 `environment` 取自 `VERCEL_ENV` / `VERCEL_URL`，本地是 `development`。生产 cron 只认领生产环境的任务，所以本地或预览环境的搜索一旦超过 215 秒预算被重新排队，就不会再被续跑，并会以“already running”阻塞该用户的新搜索，直到在界面上取消它。

---

## 12. 测试

| 文件 | 覆盖 |
|---|---|
| `tests/database.test.ts`（9 项） | PGlite 加载基线和全部迁移：遗留表锁定、活动所有权与删除、搜索任务隔离/租约/取消/事务导入、成员 RLS 与原子删除、AI 配额并发、模板回滚与软删除、收藏隐私、管理员角色 |
| `tests/search-evaluation.test.ts` | 搜索评估全部规则（17 项）|
| `tests/domain.test.ts` | SSRF、线索映射、转化计数、>1000 行分页、Dashboard 筛选、安全跳转、CSV 注入、分析分组 |
| `tests/event-write.test.ts` | 活动写入白名单、过期会话、删除错误映射 |
| `tests/ics.test.ts` | 日历导出格式 |
| `tests/remediation.test.ts` | 数据库隔离、模板预览转义 |

共 42 项（database 9、search-evaluation 17、domain 8、event-write 3、ics 3、remediation 2），`npm test` 约 10–15 秒。`tests/*.mjs` 是针对**线上**的手动脚本（`production-smoke`、`search-smoke`、`crud-system-smoke`、`event-crud-smoke` 建临时记录并清理；`ui-fixture` 创建/删除临时成员账号），不进 CI，运行前须征得用户同意。没有 E2E 测试。

---

## 13. 功能现状

**已完成**：上文第 1、8 节列出的全部模块；管理员角色（数据库层）；收藏搜索结果；Discover 改版（侧栏、证据面板、精确查找、紧凑卡片 + 站内详情页）。

**需要更新（有入口但不完整）**
- 任务列表分页按钮是禁用占位；任务批量删除逐条调用、无汇总错误。
- 通知设置只存在浏览器 localStorage。
- Reports 无日期范围、筛选、导出。
- 线索状态卡只读；线索 Schedule 只打开 Google Calendar 链接。
- Discover 站内结果详情页的 Agenda & speakers 只显示“未核实”（搜索不抓取议程/演讲人）。
- 风险分析结果每次重新生成。
- `/ai-demo` 含假数据；首页演示视频与营销数字是占位。

**未完成**
- 应用内成员邀请/管理、角色管理界面（目前只能 SQL）。
- 线索编辑与删除入口；活动内新增/移除线索。
- 真实发信与送达追踪、邮件通知、通知中心。
- 多工作区、OAuth/2FA。
- 任务看板/日历、任务依赖编辑、自定义任务模板、改活动日期时重排任务。
- Portfolio 的 Saved Views；保存搜索条件到服务器与定时运行；导入时合并/更新已有活动；审核分配与审核历史。
- CRM / 日历 / Slack 集成；ROI 与收入归因。
- E2E 测试；迁移差异检查进 CI；搜索任务卡死告警。

**技术债**
- 93/102 个历史活动、全部 95 条历史线索的 owner 没有登录账号（只有 admin 能删）；负责人选择器读 `users` 表，会列出非成员历史人物。
- 任务 module/reminder 编码在 description，应拆列。
- 未挂载组件：`components/ai/{lead-ai-summary,lead-qualification-badge,progress-insights-widget,risk-analysis-dashboard,task-progress-predictor}.tsx`、`components/leads/lead-score-cell.tsx`；未用的 `lib/api/lead-activities.ts`、若干 hooks（`useCachedLeadScore`、`useAIUsageStats`、`useInvalidateLeads`、`useUpdateChecklistItem`、`useReorderChecklistItems`、`useUpdateCollaboratorRole`、`useArchiveTask`）；`/api/company-intelligence/debug`。
- 残留调试日志：`lib/api/tasks.ts`、`lib/api/users.ts`、`lib/api/lead-activities.ts`、`components/leads/lead-intelligence/ai-overview.tsx`、`app/api/company-intelligence/route.ts`（会打印用户 id）。
- 基线迁移是 pg_dump 快照，曾包含过宽的授权（`follow_up_records` 已于 2026-11-09 修复）。新增或改动表时检查 `has_table_privilege('anon', ...)`，不要只看 `information_schema.role_table_grants`（只读角色看不到全部授权）。
- 遗留表 `event_assets`、`meetings` 与 `supabase/*.sql` 散落脚本。
- `summarize-lead` 等部分 AI 路由没有注入公司上下文；`discover-events/parse` 与搜索抽取不记 `ai_usage`。

---

## 14. 变更历史（最近）

| PR | 内容 |
|---|---|
| #31 | 锁定遗留表 `follow_up_records`（开启 RLS、收回公开权限）|
| #30 | Discover 紧凑结果卡片、原地展开详情、站内活动详情页 |
| #29 | 管理员角色（`eventra_members.role`、`is_eventra_admin`、全部所有权例外）|
| #28 | 依赖安全更新（Next 16.4.3 等）|
| #27 | Discover 改版：左侧栏导航、证据面板、精确查找、地区筛选、封面图、统计字段、收藏 |
| #26 | 修复活动编辑保存、模板编辑保存、Windows CSV 上传；任务删除入口 |
| #25 | 全系统审计修复（登录回跳、事件/任务/线索/模板/文件流程）|
| #24 | Dashboard 只显示 Sponsor/Exhibit/Attend 并按参与方式着色 |
| #22–#23 | 活动日历与 .ics 导出；Portfolio 改版 |
| #19–#20 | 数据库隔离、审计流程修复、创建时所有权 |
| #7–#14 | 可靠的活动搜索（证据、持久任务、显式导入）及其 UI |

## 15. 其他文档

- `docs/reliable-event-search.md`：搜索设计说明。
- `docs/DATABASE_CONNECTIONS.md`、`docs/DATABASE_SYSTEM_AUDIT_2026-09-27_ZH.md`：数据库连接与增删改审计。
- `docs/REMEDIATION_2026-09-18.md`：全项目审计后的修复记录。
- 以下文档只在原开发者本地存在、未入库（含内部运营细节，仓库公开）：`docs/PROJECT_AUDIT_2026-09-18_ZH.md`（全项目审计）、`docs/FIGMA_REDESIGN_TASK_UPDATED_ZH.md` 与 `docs/FIGMA_REDESIGN_AUDIT_ZH.md`（设计任务书与路由/字段规格）。
- `docs/workspace-page-coverage.md`、`docs/figma-ui-implementation.md`。
- `README.md`：简要说明与团队访问规则。
