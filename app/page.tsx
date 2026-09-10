"use client";

import Image from "next/image";
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  Cpu,
  Database,
  HeartPulse,
  Mic2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import TifaWidget from "@/components/TifaWidget";

const apiEndpoints = [
  { method: "POST", path: "/api/tifa" },
  { method: "POST", path: "/api/tifa/stream" },
  { method: "POST", path: "/api/voice/jobs" },
  { method: "GET", path: "/api/voice/jobs/{jobId}" },
  { method: "GET", path: "/api/voice/jobs/{jobId}/audio" },
  { method: "GET", path: "/api/health" },
];

const frameworkModules = [
  {
    name: "tifa-core",
    description: "Shared contracts, tenant context, events, usage, and error envelopes.",
    icon: ShieldCheck,
  },
  {
    name: "tifa-runtime",
    description: "Local-first sessions, runtime directories, TTS worker status, and future persistence adapters.",
    icon: Activity,
  },
  {
    name: "tifa-provider-gateway",
    description: "LLM provider interface, Ollama-compatible adapter, router policy, and cloud provider scaffolds.",
    icon: Bot,
  },
  {
    name: "tifa-voice",
    description: "Piper local voice jobs, audio caching, worker health, and object storage contracts.",
    icon: Mic2,
  },
  {
    name: "tifa-data-connectors",
    description: "PostgreSQL financial connector, safety checks, and guarded Text-to-SQL planning.",
    icon: Database,
  },
  {
    name: "tifa-widget",
    description: "Typed widget boundary for the floating Tifa assistant and future React package extraction.",
    icon: HeartPulse,
  },
];

const runtimeFeatures = [
  "Works without PostgreSQL or Redis",
  "Piper voice stays on the local machine",
  "Cloud adapters remain opt-in",
];

export default function Home() {
  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <a
        href="#overview"
        className="fixed left-4 top-4 z-[70] -translate-y-20 rounded-lg bg-[var(--primary)] px-4 py-3 font-semibold text-[var(--primary-contrast)] transition focus:translate-y-0"
      >
        Skip to content
      </a>

      <div aria-hidden="true" className="aurora-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-52 size-[34rem] rounded-full bg-[var(--aurora-blue)] opacity-[0.12] blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-52 top-20 size-[32rem] rounded-full bg-[var(--aurora-violet)] opacity-[0.1] blur-[150px]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 pb-24 sm:px-8 lg:px-10">
        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[var(--border)]">
          <a href="#overview" className="flex min-h-11 items-center gap-3 rounded-xl" aria-label="Tifa AI home">
            <span className="relative size-10 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <Image src="/tifa-assistant-mark.png" alt="" fill sizes="40px" className="object-cover" priority />
            </span>
            <span className="text-base font-semibold tracking-[-0.02em]">Tifa AI</span>
          </a>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {[
              ["Modules", "#modules"],
              ["APIs", "#apis"],
              ["Runtime", "#runtime"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="flex min-h-11 items-center rounded-xl px-4 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-secondary)] sm:flex">
              <span className="size-2 rounded-full bg-[var(--success)] shadow-[0_0_14px_var(--success)]" />
              Local-first
            </div>
            <ThemeToggle />
          </div>
        </header>

        <section id="overview" aria-labelledby="hero-heading" className="grid min-h-[34rem] items-center gap-12 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-secondary)] shadow-sm">
              <Sparkles size={15} className="text-[var(--primary)]" aria-hidden="true" />
              Local-first assistant framework
            </div>
            <h1 id="hero-heading" className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Build every assistant experience with <span className="aurora-text">Tifa AI.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-[var(--text-secondary)] sm:text-xl">
              A reusable foundation for streaming AI, provider routing, local voice jobs, guarded data connectors, and SaaS-ready runtime contracts.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#modules"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-base font-semibold text-[var(--primary-contrast)] shadow-[0_16px_40px_-20px_var(--primary)] transition hover:-translate-y-0.5"
              >
                Explore the framework
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a
                href="#apis"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--control-border)] bg-[var(--surface)] px-5 text-base font-semibold text-[var(--foreground)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-elevated)]"
              >
                View local APIs
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-[var(--text-muted)]">
              {["Streaming-ready", "Piper voice", "Provider routing"].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check size={15} className="text-[var(--success)]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[31rem] items-center justify-center lg:justify-end">
            <div aria-hidden="true" className="absolute size-[82%] rounded-full border border-[var(--border)] opacity-80" />
            <div aria-hidden="true" className="absolute size-[65%] rounded-full bg-[var(--aurora-blue)] opacity-20 blur-[85px]" />
            <div className="relative aspect-square w-[min(82vw,28rem)] overflow-hidden rounded-[32%] border border-[var(--control-border)] bg-[#050816] shadow-[0_30px_90px_-35px_var(--shadow-color)]">
              <Image
                src="/tifa-assistant-mark.png"
                alt="Tifa AI coding robot"
                fill
                priority
                sizes="(min-width: 1024px) 448px, 82vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
            </div>
            <div className="absolute -bottom-4 left-0 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium shadow-lg sm:left-4">
              <Cpu size={17} className="text-[var(--primary)]" aria-hidden="true" />
              Runs where you choose
            </div>
          </div>
        </section>

        <section id="modules" aria-labelledby="modules-heading" className="scroll-mt-6 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="mono-label text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Architecture</p>
            <h2 id="modules-heading" className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Six boundaries. One assistant framework.</h2>
            <p className="mt-4 text-base leading-7 text-[var(--text-secondary)]">Compose only what each product needs while preserving stable contracts between chat, voice, data, and runtime services.</p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {frameworkModules.map((module) => {
              const Icon = module.icon;
              return (
                <article key={module.name} className="aurora-card group rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--control-border)]">
                  <div className="mb-5 grid size-11 place-items-center rounded-xl bg-[var(--surface-elevated)] text-[var(--primary)] transition group-hover:bg-[var(--surface-soft)]">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="mono-label text-sm font-semibold text-[var(--foreground)]">{module.name}</h3>
                  <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">{module.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 py-14 sm:py-20 lg:grid-cols-[1.25fr_0.75fr]">
          <div id="apis" aria-labelledby="apis-heading" className="aurora-card scroll-mt-6 rounded-3xl p-6 sm:p-8">
            <p className="mono-label text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Interface</p>
            <h2 id="apis-heading" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Stable local APIs</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {apiEndpoints.map((endpoint) => (
                <code key={`${endpoint.method}-${endpoint.path}`} className="mono-label flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-secondary)]">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${endpoint.method === "POST" ? "bg-[var(--primary)] text-[var(--primary-contrast)]" : "bg-[var(--surface-soft)] text-[var(--primary)]"}`}>
                    {endpoint.method}
                  </span>
                  <span className="truncate">{endpoint.path}</span>
                </code>
              ))}
            </div>
          </div>

          <div id="runtime" aria-labelledby="runtime-heading" className="aurora-card scroll-mt-6 rounded-3xl p-6 sm:p-8">
            <p className="mono-label text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Runtime</p>
            <h2 id="runtime-heading" className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Local mode by default</h2>
            <ul className="mt-7 space-y-4">
              {runtimeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-base leading-6 text-[var(--text-secondary)]">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] text-[var(--success)]">
                    <Check size={15} aria-hidden="true" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <TifaWidget mood="focused" />
    </main>
  );
}
