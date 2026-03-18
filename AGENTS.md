# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>document-writer</name>
<description>Use when writing blog posts or documentation markdown files - provides writing style guide (active voice, present tense), content structure patterns, and MDC component usage. Overrides brevity rules for proper grammar. Use nuxt-content for MDC syntax, nuxt-ui for component props.</description>
<location>project</location>
</skill>

<skill>
<name>motion</name>
<description>Use when adding animations with Motion Vue (motion-v) - provides motion component API, gesture animations, scroll-linked effects, layout transitions, and composables for Vue 3/Nuxt</description>
<location>project</location>
</skill>

<skill>
<name>nuxt</name>
<description>Use when working on Nuxt 4+ projects - provides server routes, file-based routing, middleware patterns, Nuxt-specific composables, and configuration with latest docs. Covers h3 v1 helpers (validation, WebSocket, SSE) and nitropack v2 patterns. Updated for Nuxt 4.3+.</description>
<location>project</location>
</skill>

<skill>
<name>nuxt-better-auth</name>
<description>Use when implementing auth in Nuxt apps with @onmax/nuxt-better-auth - provides useUserSession composable, server auth helpers, route protection, and Better Auth plugins integration.</description>
<location>project</location>
</skill>

<skill>
<name>nuxt-content</name>
<description>Use when working with Nuxt Content v3, markdown content, or CMS features in Nuxt - provides collections (local/remote/API sources), queryCollection API, MDC rendering, database configuration, NuxtStudio integration, hooks, i18n patterns, and LLMs integration</description>
<location>project</location>
</skill>

<skill>
<name>nuxt-modules</name>
<description>"Use when creating Nuxt modules: (1) Published npm modules (@nuxtjs/, nuxt-), (2) Local project modules (modules/ directory), (3) Runtime extensions (components, composables, plugins), (4) Server extensions (API routes, middleware), (5) Releasing/publishing modules to npm, (6) Setting up CI/CD workflows for modules. Provides defineNuxtModule patterns, Kit utilities, hooks, E2E testing, and release automation."</description>
<location>project</location>
</skill>

<skill>
<name>nuxt-seo</name>
<description>Nuxt SEO meta-module with robots, sitemap, og-image, schema-org. Use when configuring SEO, generating sitemaps, creating OG images, or adding structured data.</description>
<location>project</location>
</skill>

<skill>
<name>nuxt-studio</name>
<description>Use when working with Nuxt Studio, the self-hosted open-source CMS for Nuxt Content sites - provides visual editing, media management, Git-based publishing, auth providers, and AI content assistance</description>
<location>project</location>
</skill>

<skill>
<name>nuxt-ui</name>
<description>Use when building styled UI with @nuxt/ui v4 components - create forms with validation, implement data tables with sorting, build modal dialogs and overlays, configure Tailwind Variants theming. Use vue skill for raw component patterns, reka-ui for headless primitives.</description>
<location>project</location>
</skill>

<skill>
<name>nuxthub</name>
<description>Use when building NuxtHub v0.10.6 applications - provides database (Drizzle ORM with sqlite/postgresql/mysql), KV storage, blob storage, and cache APIs. Covers configuration, schema definition, migrations, multi-cloud deployment (Cloudflare, Vercel), and the new hub:db, hub:kv, hub:blob virtual module imports.</description>
<location>project</location>
</skill>

<skill>
<name>pnpm</name>
<description>Use when managing Node.js dependencies with pnpm - install packages, configure monorepo workspaces, set up pnpm catalogs, resolve dependency conflicts with overrides, patch third-party packages, and configure CI pipelines for pnpm projects</description>
<location>project</location>
</skill>

<skill>
<name>reka-ui</name>
<description>Use when building with Reka UI (headless Vue components) - provides component API, accessibility patterns, composition (asChild), controlled/uncontrolled state, virtualization, and styling integration. Formerly Radix Vue.</description>
<location>project</location>
</skill>

<skill>
<name>tresjs</name>
<description>Use when building 3D scenes with TresJS (Vue Three.js) - provides TresCanvas, composables (useTres, useLoop), Cientos helpers (OrbitControls, useGLTF, Environment), and post-processing effects</description>
<location>project</location>
</skill>

<skill>
<name>ts-library</name>
<description>Use when authoring TypeScript libraries or npm packages - covers project setup, package.json exports, build tooling (tsdown/unbuild), API design patterns, type inference tricks, testing, and publishing to npm. Use when bundling, configuring dual CJS/ESM output, or setting up release workflows.</description>
<location>project</location>
</skill>

<skill>
<name>tsdown</name>
<description>Use when bundling TypeScript libraries - provides tsdown configuration, dual ESM/CJS output, .d.ts generation, package validation, and plugin authoring</description>
<location>project</location>
</skill>

<skill>
<name>vite</name>
<description>Vite build tool configuration, plugin API, SSR, and Vite 8 Rolldown migration. Use when working with Vite projects, vite.config.ts, Vite plugins, or building libraries/SSR apps with Vite.</description>
<location>project</location>
</skill>

<skill>
<name>vitest</name>
<description>Use when writing unit/integration tests for Vite projects - configure vitest.config.ts, write test suites with describe/it, create mock implementations with vi.fn and vi.mock, set up code coverage thresholds, and run tests in parallel</description>
<location>project</location>
</skill>

<skill>
<name>vue</name>
<description>Use when editing .vue files, creating Vue 3 components, writing composables, or testing Vue code - provides Composition API patterns, props/emits best practices, VueUse integration, and reactive destructuring guidance</description>
<location>project</location>
</skill>

<skill>
<name>vueuse</name>
<description>Use when working with VueUse composables - track mouse position with useMouse, manage localStorage with useStorage, detect network status with useNetwork, debounce values with refDebounced, and access browser APIs reactively. Check VueUse before writing custom composables - most patterns already implemented.</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
