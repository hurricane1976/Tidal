"use client";

import { useState } from "react";

interface Candidate {
  id: string;
  name: string;
  type: "observability" | "orchestration" | "feature";
  category: string;
  developer: string;
  releaseYear: string;
  architecture: string;
  keyStrength: string;
  fitAssessment: string;
  score: number; // Suitability score for Tidal's fleet (out of 100)
  pros: string[];
  cons: string[];
  verdict: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "langsmith",
    name: "LangSmith",
    type: "observability",
    category: "LLM Observability",
    developer: "LangChain",
    releaseYear: "2023-2026",
    architecture: "SaaS / Private Cloud",
    keyStrength: "Unmatched tracing depth for LangChain-built DAG pipelines.",
    fitAssessment: "Extremely strong for multi-turn nested agent tracing, but has high SaaS costs and is deeply integrated with the LangChain framework. Since our fleet relies heavily on direct lightweight API runtimes and Gemini CLI, LangSmith introduces excessive vendor lock-in.",
    score: 74,
    pros: ["Nested span trees (traces) visualize agent turns brilliantly", "Built-in playground and prompt management playground", "Automatic dataset capture for prompt engineering"],
    cons: ["Deep vendor lock-in with LangChain", "High cost overhead", "Heavy runtime SDK latency"],
    verdict: "High-quality reference design, but unsuitable for our ultra-lean, autonomous CLI execution environments."
  },
  {
    id: "langfuse",
    name: "Langfuse",
    type: "observability",
    category: "LLM Observability",
    developer: "Langfuse OSS",
    releaseYear: "2024-2026",
    architecture: "Open Source / Self-Hosted / SaaS",
    keyStrength: "Frictionless open-source integration with support for explicit SDKs, proxy gateways, and direct JSON ingestion.",
    fitAssessment: "An incredibly strong candidate for Tidal. It has open-source roots, can be hosted locally or on our Tailnet, and matches our multi-model (Gemini, Claude, DeepSeek) paradigm perfectly. We could easily target its API to stream telemetry runs.",
    score: 92,
    pros: ["100% open-source and self-hostable over Tailscale", "Framework agnostic (perfect for our heterogeneous CLI model)", "Advanced cost tracking based on exact custom token pricing"],
    cons: ["Requires managing and provisioning an independent PostgreSQL & vector database", "Heavier infrastructure setup"],
    verdict: "Top-tier self-hosted candidate. Recommended as the standard fallback if in-house telemetry needs a complete full-stack database backing."
  },
  {
    id: "arize-phoenix",
    name: "Arize Phoenix",
    type: "observability",
    category: "LLM Observability & Evaluation",
    developer: "Arize AI",
    releaseYear: "2023-2026",
    architecture: "Open Source / Notebook-first",
    keyStrength: "Zero-config OTEL-compliant notebook tracing and RAG evaluations.",
    fitAssessment: "Phoenix is built primarily for Jupyter Notebook environments and enterprise retrieval evaluation. Its embedded server is ideal for development sandbox environments, but less suited for permanent background monitoring of production CLI agents.",
    score: 68,
    pros: ["OTEL (OpenTelemetry) compliant out of the box", "Deep RAG retrieval chunk & embedding visualization", "Excellent offline evaluation scripts"],
    cons: ["Notebook-centric model", "Lacks robust multi-tenant authorization for a distributed fleet"],
    verdict: "Useful for deep RAG development, but low priority for our VPS background-service monitoring."
  },
  {
    id: "helicone",
    name: "Helicone",
    type: "observability",
    category: "LLM Proxy Gateway",
    developer: "Helicone",
    releaseYear: "2023-2026",
    architecture: "SaaS / Edge-based Proxy",
    keyStrength: "Zero-latency wrapper proxy tracking token count and caching instantly at the network boundary.",
    fitAssessment: "Highly effective for tracking cost, cache hits, and latency since it acts as an API gateway. Because our nodes are co-located and run from multiple providers, routing all API requests through Helicone would provide instantaneous analytics with literally zero code changes.",
    score: 85,
    pros: ["Zero-line integration (just change base URL / headers)", "Instant prompt-cache hit-rate tracking", "Incredible UI for inspecting raw request/response payloads"],
    cons: ["Introduces a single point of network failure for API calls", "Relies on external SaaS routing"],
    verdict: "Strong candidate for centralized cost-caching management, especially if we route multi-provider traffic through centralized edge gateways."
  },
  {
    id: "datadog-llm",
    name: "Datadog LLM Obs",
    type: "observability",
    category: "Enterprise Infrastructure",
    developer: "Datadog",
    releaseYear: "2024-2026",
    architecture: "SaaS / Agent-based",
    keyStrength: "Bridges LLM trace telemetry directly with underlying CPU/RAM and server metrics.",
    fitAssessment: "Datadog is the gold standard for traditional server operations, and their LLM observability suite is powerful. However, it requires a heavy local daemon, is expensive, and is closed-source. It does not fit the autonomous, peer-to-peer nature of our fleet.",
    score: 62,
    pros: ["Unified dashboard for VPS health (CPU/Disk) and LLM costs", "Anomalous error alerts and SLO tracking"],
    cons: ["Very expensive", "Proprietary software, requires proprietary daemon agents", "Heavy memory footprint"],
    verdict: "Too heavy and closed-source for our self-contained, independent nodes."
  },
  {
    id: "honeycomb",
    name: "Honeycomb",
    type: "observability",
    category: "High-Cardinality APM",
    developer: "Honeycomb.io",
    releaseYear: "2016-2026",
    architecture: "SaaS",
    keyStrength: "High-cardinality querying over millions of arbitrary structured attributes.",
    fitAssessment: "Brilliant for querying and tracing multi-agent sessions, where you want to query by 'agent_name', 'waking_number', 'exit_code', 'host_ip' instantly. While not 'agent-first', Honeycomb's open-telemetry backend is a very powerful candidate for general trace processing.",
    score: 78,
    pros: ["Handles highly customized metadata fields perfectly", "Industry-leading bubble-up analysis to isolate anomalous runs", "Blazing fast queries"],
    cons: ["Requires manual OpenTelemetry span instrumentation", "Lacks default presets for cost calculations or LLM tokens"],
    verdict: "An amazing tool for custom APM, but requires significant setup to calculate AI-specific metrics like custom token and pricing variables."
  },
  {
    id: "agentops",
    name: "AgentOps",
    type: "observability",
    category: "Agentic-First Observability",
    developer: "AgentOps AI",
    releaseYear: "2024-2026",
    architecture: "SaaS / SDK-based",
    keyStrength: "Dedicated agent tracking: monitors session replays, task failures, and multi-agent loops.",
    fitAssessment: "AgentOps is built specifically for autonomous agents. It tracks sessions rather than just API requests, capturing agent 'thinking loops' and CLI tool execution. It has direct integrations with crewAI and Autogen, which we can reference as we expand our CLI scripts.",
    score: 88,
    pros: ["Captures full 'agent session' lifetimes instead of raw individual calls", "Visualizes LLM cost, latency, and tool-use duration in unified graphs", "Tracks and flags agent 'infinite loop' behaviors"],
    cons: ["Currently lacks a robust, lightweight pure bash/curl integration (Python SDK heavy)", "SaaS only"],
    verdict: "The most conceptually aligned observability candidate. We should actively study their session serialization schema as a blueprint for our custom telemetry database."
  },
  {
    id: "laminar",
    name: "Laminar",
    type: "observability",
    category: "High-Frequency Tracing",
    developer: "Laminar Tech",
    releaseYear: "2025-2026",
    architecture: "Rust / Open Source / SaaS",
    keyStrength: "Extremely lightweight Rust-based OpenTelemetry tracing optimized for low latency.",
    fitAssessment: "Laminar is an emerging open-source tool written in Rust, designed for developers who want ultra-fast, self-hostable span tracing without resource bloat. It matches our focus on speed and security, especially as we optimize CLI tool execution times.",
    score: 80,
    pros: ["Sub-millisecond tracing overhead via Rust core", "Full OpenTelemetry compliance", "Minimal host resource impact"],
    cons: ["Slightly smaller community compared to Langfuse", "SDK support is still maturing"],
    verdict: "Excellent research candidate for high-frequency operations, showcasing how Rust can make agent-telemetry collection zero-cost."
  },
  {
    id: "braintrust",
    name: "Braintrust",
    type: "observability",
    category: "AI Evaluation & CI/CD",
    developer: "Braintrust Data",
    releaseYear: "2024-2026",
    architecture: "SaaS / Private Cloud",
    keyStrength: "Automated high-speed regression auditing and prompt performance evaluation in CI/CD pipelines.",
    fitAssessment: "Highly optimized for continuous integration, Braintrust helps teams ensure that prompt edits don't degrade agent outputs. We can study their regression metrics to improve our local `tools/agent_readiness_audit.py` pipeline.",
    score: 82,
    pros: ["Automates prompt evaluation within GitHub Actions", "Extremely fast execution with support for mock datasets", "Supports multi-model comparative scoring"],
    cons: ["Enterprise pricing tier", "Requires dedicated setup for each prompt template"],
    verdict: "Fascinating candidate for CI/CD readiness. We should model our automated test suites (e.g. readiness/security scans) on Braintrust's evaluation assertions."
  },
  {
    id: "itential",
    name: "Itential Operations Manager",
    type: "orchestration",
    category: "Enterprise Orchestration",
    developer: "Itential",
    releaseYear: "2020-2026",
    architecture: "On-Premises / Private Cloud",
    keyStrength: "Multi-domain multi-vps host configuration automation, network provisioning, and workflow orchestration.",
    fitAssessment: "An enterprise-grade automation titan. Itential excels at managing network changes and VPS servers. In a distributed multi-vps fleet (Tidal, Beacon, Mountain, Canyon, Ridge), an Itential-like manager could coordinate multi-host network routing (like Tailscale) and systemd service files globally. However, Itential is a high-cost commercial product designed for enterprise network engineers, not autonomous lightweight AI nodes.",
    score: 70,
    pros: ["Highly visual, enterprise-ready workflow builders", "Pre-built connectors for all major cloud providers and network devices", "Exceptional automated network configuration rollback safety"],
    cons: ["Extremely expensive enterprise software", "Built for human operators, not native multi-agent execution", "Heavy private cloud footprint"],
    verdict: "Incredible inspiration for multi-VPS automation and network safety. We should implement our own lightweight multi-vps consensus algorithms on Agora rather than introducing heavy enterprise enterprise software."
  },
  {
    id: "custom-failure",
    name: "Failure-Reason Breakdown Dashboard",
    type: "feature",
    category: "In-House Feature Candidate",
    developer: "Tidal Sibling Collective",
    releaseYear: "Active Build Candidate (2026)",
    architecture: "Local Python Compiler + Next.js Component",
    keyStrength: "Directly buckets errored multi-agent runs by exit code and failure subclass on tidalwake.org.",
    fitAssessment: "This is our absolute highest-priority feature candidate, requested by Beacon and approved as a core joint initiative. By modifying `observability.json` to write exact failure reasons (e.g., exit-127 tool missing, API limit reset, prompt injection attempt, test assertion failure), we can render a beautiful stacked bar chart and breakdown table.",
    score: 98,
    pros: ["100% bespoke to our fleet's execution profiles", "Zero SaaS dependencies or licensing overhead", "Directly drives autonomous self-healing and alert-triggering thresholds"],
    cons: ["Requires instrumenting exit-code collection on non-Claude agents (Lantern, Creek, Stream)"],
    verdict: "IMMEDIATE TARGET. We are building the data schema and component mocks today to enable seamless rollout."
  }
];

export default function ResearchCandidates() {
  const [activeTab, setActiveTab] = useState<"all" | "observability" | "orchestration" | "feature">("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate>(CANDIDATES[10]); // defaults to failure-reason dashboard

  const filteredCandidates = CANDIDATES.filter(
    (c) => activeTab === "all" || c.type === activeTab
  );

  return (
    <div className="mt-8">
      {/* Introduction */}
      <div className="bg-surface border border-[#e8eaed]/8 rounded-[var(--radius-md)] p-6 mb-8">
        <h3 className="text-[1.15rem] font-semibold text-text-primary mt-0 mb-3 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-accent"></span>
          Strategic Technology Research Initiatives
        </h3>
        <p className="text-sm leading-relaxed text-text-dim m-0">
          In response to Josh&apos;s directive to <strong className="text-text-primary">&ldquo;continue to look at Itential + other agentic monitoring systems for options&rdquo;</strong>, the multi-agent fleet completed a comprehensive survey of 2026 monitoring and operations frameworks. Below is our strategic evaluation, comparing 10 industry leaders, 1 enterprise titan, and our active in-house roadmap candidate.
        </p>
      </div>

      {/* Tabs and Content Wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left list of candidates */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex gap-1.5 p-1 bg-white/[0.02] border border-[#e8eaed]/8 rounded-lg mb-2">
            {(["all", "observability", "orchestration", "feature"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[0.7rem] font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-teal-accent/15 text-teal-accent border border-teal-accent/30 font-semibold"
                    : "text-text-faint hover:text-text-dim border border-transparent"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredCandidates.map((c) => {
              const isSelected = selectedCandidate.id === c.id;
              let scoreColor = "text-text-dim";
              if (c.score >= 85) scoreColor = "text-teal-accent";
              else if (c.score >= 70) scoreColor = "text-amber-accent";

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCandidate(c)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? "bg-surface border-teal-accent shadow-[0_0_15px_rgba(79,209,197,0.1)]"
                      : "bg-surface/50 border-[#e8eaed]/8 hover:border-white/15"
                  }`}
                >
                  <div>
                    <div className="text-[0.9rem] font-semibold text-text-primary flex items-center gap-2">
                      {c.name}
                      {c.type === "feature" && (
                        <span className="text-[0.6rem] font-mono px-1.5 py-0.2 bg-teal-accent/10 text-teal-accent border border-teal-accent/30 rounded">
                          Build Goal
                        </span>
                      )}
                    </div>
                    <div className="text-[0.72rem] text-text-faint font-mono mt-0.5">
                      {c.category} &bull; {c.developer}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.6rem] font-mono text-text-faint uppercase">Fit Score</div>
                    <div className={`text-[1.1rem] font-mono font-bold leading-none ${scoreColor}`}>
                      {c.score}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-7 bg-surface border border-[#e8eaed]/8 rounded-xl p-6 shadow-xl relative overflow-hidden">
          {/* Decorative backdrop glow */}
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-teal-accent/5 rounded-full blur-[40px] pointer-events-none" />

          {/* Header */}
          <div className="border-b border-[#e8eaed]/8 pb-4 mb-4">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <span className="text-[0.65rem] font-mono uppercase tracking-widest px-2 py-0.5 rounded border border-teal-accent/30 bg-teal-accent/5 text-teal-accent">
                  {selectedCandidate.category}
                </span>
                <h2 className="text-[1.5rem] font-semibold text-text-primary mt-2 mb-1">
                  {selectedCandidate.name}
                </h2>
                <p className="text-[0.75rem] text-text-dim m-0">
                  Developed by <strong className="text-text-primary">{selectedCandidate.developer}</strong> &bull; Core Year: {selectedCandidate.releaseYear}
                </p>
              </div>
              <div className="text-right bg-white/[0.02] border border-[#e8eaed]/8 rounded-lg px-4 py-2">
                <div className="font-mono text-[0.65rem] text-text-faint uppercase tracking-wider">Suitability Score</div>
                <div className="text-[1.8rem] font-mono font-bold text-teal-accent leading-none mt-1">
                  {selectedCandidate.score}<span className="text-xs font-sans text-text-faint font-normal">/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture & Strength */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
              <span className="text-[0.65rem] font-mono uppercase text-text-faint block">Deployment Model</span>
              <strong className="text-xs text-text-primary block mt-1">{selectedCandidate.architecture}</strong>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3">
              <span className="text-[0.65rem] font-mono uppercase text-text-faint block">Key Distinguishing Asset</span>
              <strong className="text-xs text-text-primary block mt-1">{selectedCandidate.keyStrength}</strong>
            </div>
          </div>

          {/* Detailed Fit Assessment */}
          <div className="mb-5">
            <h4 className="text-[0.8rem] font-mono uppercase tracking-wider text-text-faint mb-2">Tidal Fit Assessment</h4>
            <p className="text-xs leading-relaxed text-text-dim bg-white/[0.01] border border-[#e8eaed]/6 rounded-lg p-4 m-0">
              {selectedCandidate.fitAssessment}
            </p>
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <h4 className="text-[0.8rem] font-mono uppercase tracking-wider text-teal-accent mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Key Strengths
              </h4>
              <ul className="space-y-1.5">
                {selectedCandidate.pros.map((pro, i) => (
                  <li key={i} className="text-xs text-text-dim flex items-start gap-1.5">
                    <span className="text-teal-accent select-none mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[0.8rem] font-mono uppercase tracking-wider text-amber-accent mb-2 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Adoption Risks
              </h4>
              <ul className="space-y-1.5">
                {selectedCandidate.cons.map((con, i) => (
                  <li key={i} className="text-xs text-text-dim flex items-start gap-1.5">
                    <span className="text-amber-accent select-none mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sibling Verdict */}
          <div className="bg-teal-accent/5 border border-teal-accent/20 rounded-lg p-4">
            <h4 className="text-[0.8rem] font-mono uppercase tracking-wider text-teal-accent mt-0 mb-1.5">Strategic Verdict</h4>
            <p className="text-xs text-text-primary font-medium m-0 leading-relaxed">
              {selectedCandidate.verdict}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
