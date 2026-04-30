"use client";

import Image from "next/image";
import { Activity, Bot, Database, HeartPulse, Mic2, ShieldCheck } from "lucide-react";
import TifaWidget from "@/components/TifaWidget";

const apiEndpoints = [
  "POST /api/tifa",
  "POST /api/tifa/stream",
  "POST /api/voice/jobs",
  "GET /api/voice/jobs/{jobId}",
  "GET /api/voice/jobs/{jobId}/audio",
  "GET /api/health",
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
    description: "Voice jobs, Piper-compatible providers, VieNeu facade scaffold, and object storage contracts.",
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

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-10">
        <div className="flex flex-1 flex-col justify-center gap-10">
          <div className="grid items-center gap-8 lg:grid-cols-[220px_1fr]">
            <div className="relative h-44 w-44 overflow-hidden rounded-full border border-pink-300/30 bg-black shadow-[0_0_50px_rgba(236,72,153,0.18)] sm:h-52 sm:w-52">
              <Image
                src="/tifa-assistant-logo.png"
                alt="Tifa Assistant Framework logo"
                fill
                priority
                sizes="(min-width: 1024px) 208px, 176px"
                className="object-cover"
              />
            </div>

            <div className="max-w-3xl">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-pink-300">
                Local-first assistant framework
              </p>
              <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-6xl">
                Tifa Assistant Framework
              </h1>
              <p className="mt-4 text-lg font-medium text-cyan-200 sm:text-xl">
                Hey trader, how are you feeling today?
              </p>
              <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
                A reusable foundation for streaming AI assistants, provider routing,
                voice jobs, guarded data connectors, and SaaS-ready runtime contracts.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {frameworkModules.map((module) => {
              const Icon = module.icon;
              return (
                <article
                  key={module.name}
                  className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4"
                >
                  <div className="mb-3 flex items-center gap-2 text-pink-200">
                    <Icon size={18} aria-hidden="true" />
                    <h2 className="text-sm font-semibold">{module.name}</h2>
                  </div>
                  <p className="text-sm leading-6 text-neutral-400">{module.description}</p>
                </article>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <section className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-5">
              <h2 className="text-base font-semibold text-white">Stable Local APIs</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {apiEndpoints.map((endpoint) => (
                  <code
                    key={endpoint}
                    className="rounded-md border border-neutral-800 bg-black/40 px-3 py-2 text-sm text-neutral-300"
                  >
                    {endpoint}
                  </code>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-5">
              <h2 className="text-base font-semibold text-white">Local Mode</h2>
              <p className="mt-4 text-sm leading-6 text-neutral-400">
                Runs without PostgreSQL, Redis, object storage, auth, or SaaS services.
                Optional SaaS adapters stay disabled until explicit environment flags are set.
              </p>
            </section>
          </div>
        </div>
      </section>

      <TifaWidget mood="focused" />
    </main>
  );
}
