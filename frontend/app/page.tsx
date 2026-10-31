"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  Flame,
  GitBranch,
  Layers,
  Loader2,
  Scroll,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

type Tab = "spirit" | "family" | "timeline";
type FamilyViewMode = "tree" | "gallery" | "both";

interface FamilyMember {
  name: string;
  born_year: number;
  death_year?: number | null;
  image_url?: string | null;
  relationship?: string | null;
  generation?: number | null;
}

interface Message {
  role: "user" | "spirit";
  content: string;
  model?: string;
  tokens?: number | null;
  family_data?: FamilyMember[] | null;
}

interface TimelineResult {
  status: string;
  rows_analyzed: number;
  pattern_reliability_score: number;
  summary?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getErrorMessage(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null);
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("spirit");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "spirit",
      content:
        "🕯️ The candles are lit upon the digital ofrenda. I am the Spirit of the Archive, preserving our family heritage locally so it is never lost to cloud decay. Whisper a question or ask of our ancestors.",
      model: "Digital Ofrenda Keeper",
    },
  ]);
  const [loadingSpirit, setLoadingSpirit] = useState(false);

  // Family tree state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<File | null>(null);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [familySuccess, setFamilySuccess] = useState("");
  const [familyViewMode, setFamilyViewMode] = useState<FamilyViewMode>("tree");
  const [familySearch, setFamilySearch] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState("all");

  // Timeline analytics state
  const [selectedTimelineFile, setSelectedTimelineFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<TimelineResult | null>(null);
  const [timelineError, setTimelineError] = useState("");
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Check API health and fetch initial family tree
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/`)
      .then((res) => {
        if (active) setApiOnline(res.ok);
      })
      .catch(() => {
        if (active) setApiOnline(false);
      });

    fetch(`${API_URL}/api/v1/spirit/family-tree`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.family) {
          setFamilyMembers(data.family);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  async function handleSpiritSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userMessage = prompt.trim();
    if (!userMessage || loadingSpirit) return;

    setPrompt("");
    setMessages((current) => [...current, { role: "user", content: userMessage }]);
    setLoadingSpirit(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/spirit/channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage, temperature }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "The local spirit could not respond."));
      }

      const data: { response: string; model: string; tokens_eval?: number; family_data?: FamilyMember[] } =
        await response.json();

      setMessages((current) => [
        ...current,
        {
          role: "spirit",
          content: data.response,
          model: data.model,
          tokens: data.tokens_eval,
          family_data: data.family_data,
        },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to reach the local API.";
      setMessages((current) => [
        ...current,
        {
          role: "spirit",
          content: `🕯️ Connection notice: ${detail}. The digital veil rests, but the archive remembers.`,
          model: "Veiled Archive",
        },
      ]);
    } finally {
      setLoadingSpirit(false);
    }
  }

  function handleQuickPrompt(text: string) {
    setPrompt(text);
  }

  function whisperAboutMember(member: FamilyMember) {
    const rel = member.relationship ? ` [${member.relationship}]` : "";
    setActiveTab("spirit");
    setPrompt(`Tell me the story and sacred memory of ${member.name}${rel}, born in ${member.born_year}.`);
  }

  // Timeline file upload handler
  async function handleTimelineUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTimelineFile || loadingTimeline) return;

    setLoadingTimeline(true);
    setTimelineError("");
    setAnalysisResult(null);
    const formData = new FormData();
    formData.append("file", selectedTimelineFile);

    try {
      const response = await fetch(`${API_URL}/api/v1/timeline/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Timeline analysis failed."));
      }
      setAnalysisResult(await response.json());
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : "Unable to reach the local API.");
    } finally {
      setLoadingTimeline(false);
    }
  }

  function chooseTimelineFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedTimelineFile(null);
      setAnalysisResult(null);
      setTimelineError("Choose a CSV file to analyze.");
      return;
    }
    setSelectedTimelineFile(file);
    setAnalysisResult(null);
    setTimelineError("");
  }

  // Family tree file upload handler
  async function handleFamilyUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFamilyFile || loadingFamily) return;

    setLoadingFamily(true);
    setFamilyError("");
    setFamilySuccess("");
    const formData = new FormData();
    formData.append("file", selectedFamilyFile);

    try {
      const response = await fetch(`${API_URL}/api/v1/spirit/family-tree/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await getErrorMessage(response, "Family tree upload failed."));
      }
      const data = await response.json();
      if (data?.family) {
        setFamilyMembers(data.family);
        setFamilySuccess(
          `Successfully welcomed ${data.family.length} family members into the digital ofrenda and family tree.`
        );
      }
    } catch (error) {
      setFamilyError(error instanceof Error ? error.message : "Unable to upload family CSV.");
    } finally {
      setLoadingFamily(false);
    }
  }

  function chooseFamilyFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFamilyFile(null);
      setFamilyError("Choose a CSV file for the family tree.");
      return;
    }
    setSelectedFamilyFile(file);
    setFamilyError("");
    setFamilySuccess("");
  }

  // Filtered family members
  const filteredFamily = familyMembers.filter((m) => {
    const q = familySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      (m.relationship && m.relationship.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (relationshipFilter === "all") return true;
    const rel = (m.relationship || "").toLowerCase();
    const gen = m.generation || 1;

    if (relationshipFilter === "ancestors") {
      return (
        gen === 1 ||
        rel.includes("ancestor") ||
        rel.includes("grand") ||
        rel.includes("elder")
      );
    }
    if (relationshipFilter === "mothers_fathers") {
      return (
        gen === 2 ||
        rel.includes("mother") ||
        rel.includes("father") ||
        rel.includes("parent") ||
        rel.includes("aunt") ||
        rel.includes("uncle")
      );
    }
    if (relationshipFilter === "daughters") {
      return (
        (gen === 3 || rel.includes("daughter") || rel.includes("son")) &&
        !rel.includes("grand")
      );
    }
    if (relationshipFilter === "granddaughters") {
      return (
        gen === 4 ||
        rel.includes("granddaughter") ||
        rel.includes("grandson") ||
        rel.includes("grandchild")
      );
    }
    return true;
  });

  // Group into hierarchical generations
  // Row 1: Ancestors / Grandparents / Parents (Gen 1)
  // Row 2: Daughters & Sons / Parents (Gen 2 or Gen 3 daughters)
  // Row 3: Granddaughters & Descendants (Gen 4 or granddaughters)
  const ancestorsRow: FamilyMember[] = [];
  const daughtersRow: FamilyMember[] = [];
  const granddaughtersRow: FamilyMember[] = [];

  filteredFamily.forEach((member) => {
    const rel = (member.relationship || "").toLowerCase();
    const gen = member.generation;

    if (
      gen === 1 ||
      rel.includes("great-grand") ||
      rel.includes("grandmother") ||
      rel.includes("grandfather") ||
      rel.includes("ancestor") ||
      rel.includes("elder") ||
      rel.includes("forefather")
    ) {
      ancestorsRow.push(member);
    } else if (
      gen === 4 ||
      rel.includes("granddaughter") ||
      rel.includes("grandson") ||
      rel.includes("grandchild")
    ) {
      granddaughtersRow.push(member);
    } else {
      // Daughters / Parents / Middle row
      daughtersRow.push(member);
    }
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-7 sm:py-9">
      {/* Header */}
      <header className="rise-in flex flex-col gap-6 border-b border-spirit-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-marigold/40 bg-marigold/10 text-marigold shadow-candle">
            <Flame size={25} aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-marigold">
              Living Digital Ofrenda · Local Heritage
            </p>
            <h1 className="font-serif text-2xl font-semibold tracking-normal text-[#fff5e8] sm:text-3xl">
              Memoria Viva
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div
            className="inline-flex items-center gap-2 border border-spirit-border bg-spirit-card px-3 py-2 text-[#d9cec4]"
            role="status"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === null ? "bg-amber-400" : apiOnline ? "bg-emerald-400" : "bg-red-400"
              }`}
              aria-hidden="true"
            />
            API {apiOnline === null ? "checking" : apiOnline ? "online" : "offline"}
          </div>
          <div className="inline-flex items-center gap-2 border border-spirit-border bg-spirit-card px-3 py-2 text-[#d9cec4]">
            <ShieldCheck size={14} className="text-marigold" aria-hidden="true" />
            Private &amp; Cloud-Proof
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav
        className="rise-in mt-6 flex w-full flex-wrap gap-2 border-b border-spirit-border"
        aria-label="Archive tools"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "spirit"}
          onClick={() => setActiveTab("spirit")}
          className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "spirit"
              ? "border-marigold text-marigold-glow"
              : "border-transparent text-spirit-muted hover:text-[#fff5e8]"
          }`}
        >
          <Sparkles size={17} aria-hidden="true" />
          Spirit Channeler
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "family"}
          onClick={() => setActiveTab("family")}
          className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "family"
              ? "border-marigold text-marigold-glow"
              : "border-transparent text-spirit-muted hover:text-[#fff5e8]"
          }`}
        >
          <Users size={17} aria-hidden="true" />
          Living Gallery &amp; Family Tree
          {familyMembers.length > 0 && (
            <span className="ml-1 rounded-full bg-marigold/20 px-2 py-0.5 text-[10px] text-marigold">
              {familyMembers.length}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "timeline"
              ? "border-marigold text-marigold-glow"
              : "border-transparent text-spirit-muted hover:text-[#fff5e8]"
          }`}
        >
          <Cpu size={17} aria-hidden="true" />
          Timeline Analytics
        </button>
      </nav>

      {/* Active Tab Content */}
      <section className="rise-in mt-5 flex flex-1 flex-col" role="tabpanel">
        {activeTab === "spirit" ? (
          /* ================= SPIRIT CHANNELER CHAT ================= */
          <div className="flex min-h-[min(75vh,720px)] flex-1 flex-col border border-spirit-border bg-spirit-card shadow-candle">
            {/* Top Toolbar */}
            <div className="flex flex-col gap-3 border-b border-spirit-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h2 className="inline-flex items-center gap-2 font-serif text-lg text-[#fff5e8]">
                <Terminal size={18} className="text-marigold" aria-hidden="true" />
                Local Séance · Digital Ofrenda
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-3 text-xs text-spirit-muted">
                  <span>
                    Creativity <strong className="ml-1 font-medium text-marigold-glow">{temperature.toFixed(1)}</strong>
                  </span>
                  <input
                    aria-label="Creativity temperature"
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.1"
                    value={temperature}
                    onChange={(event) => setTemperature(Number(event.target.value))}
                    className="w-24 accent-marigold"
                  />
                </label>
              </div>
            </div>

            {/* Quick Sample Input Chips */}
            <div className="flex flex-wrap items-center gap-2 border-b border-spirit-border/60 bg-spirit-dark/50 px-4 py-2 text-xs text-spirit-muted sm:px-6">
              <span className="font-serif text-[#ffd06a]">Whisper an inquiry:</span>
              <button
                type="button"
                onClick={() => handleQuickPrompt("Who are our ancestors resting in this ofrenda?")}
                className="rounded border border-spirit-border bg-spirit-card px-2.5 py-1 text-spirit-muted transition-colors hover:border-marigold hover:text-[#fff5e8]"
              >
                🕯️ Who are our ancestors?
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("Show the hierarchical family tree and honor their memory.")}
                className="rounded border border-spirit-border bg-spirit-card px-2.5 py-1 text-spirit-muted transition-colors hover:border-marigold hover:text-[#fff5e8]"
              >
                📜 Show family tree
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("Whisper a story of our mothers and daughters from the early 1900s.")}
                className="rounded border border-spirit-border bg-spirit-card px-2.5 py-1 text-spirit-muted transition-colors hover:border-marigold hover:text-[#fff5e8]"
              >
                ✨ Mothers &amp; Daughters memory
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt("Is there any record of lost memories or forgotten souls?")}
                className="rounded border border-spirit-border bg-spirit-card px-2.5 py-1 text-spirit-muted transition-colors hover:border-marigold hover:text-[#fff5e8]"
              >
                🍂 Forgotten memories
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div
              className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
              aria-live="polite"
              aria-label="Conversation"
            >
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[92%] sm:max-w-[80%]">
                    <div
                      className={`whitespace-pre-wrap break-words px-5 py-3.5 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-marigold font-medium text-[#21180d]"
                          : "border border-spirit-border bg-spirit-dark text-[#e9ded4]"
                      }`}
                    >
                      {message.content}

                      {/* In-Chat Family Tree Cards with Round Profile Image Nodes & Bracketed Relationships */}
                      {message.family_data && message.family_data.length > 0 && (
                        <div className="mt-4 border-t border-spirit-border/70 pt-3">
                          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-marigold">
                            <Flame size={13} aria-hidden="true" />
                            Ancestral Souls In The Archive
                          </p>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {message.family_data.map((member, idx) => (
                              <div
                                key={idx}
                                className="group flex items-center gap-3 border border-spirit-border/80 bg-spirit-card/90 p-2.5 transition-all hover:border-marigold/60"
                              >
                                {/* Round Profile Image Node */}
                                <div className="relative h-12 w-12 shrink-0">
                                  <img
                                    src={member.image_url || "/no_image.png"}
                                    alt={member.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/no_image.png";
                                    }}
                                    className="h-12 w-12 rounded-full border-2 border-marigold/70 object-cover bg-spirit-dark shadow-candle"
                                  />
                                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-marigold/60 bg-spirit-dark text-[9px] text-marigold">
                                    🕯️
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  {/* Name with relationship details included in brackets */}
                                  <p className="truncate font-serif text-sm font-medium text-[#fff5e8]">
                                    {member.name}{" "}
                                    {member.relationship && (
                                      <span className="font-mono text-xs font-semibold text-marigold">
                                        [{member.relationship}]
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-spirit-muted">
                                    {member.born_year} – {member.death_year ?? "Present / Eternal"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loadingSpirit && (
                <p className="flex items-center gap-2 text-sm text-marigold-glow" role="status">
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  The ofrenda is gathering ancestral echoes…
                </p>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSpiritSubmit}
              className="flex items-end gap-3 border-t border-spirit-border p-4 sm:px-6"
            >
              <label className="sr-only" htmlFor="spirit-prompt">
                Message the archive
              </label>
              <textarea
                id="spirit-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={1000}
                rows={1}
                placeholder="Whisper a question or family name to the archive…"
                className="max-h-32 min-h-12 flex-1 resize-y border border-spirit-border bg-spirit-dark px-4 py-3 text-sm text-[#fff5e8] placeholder:text-[#81746d] focus:border-marigold focus:outline-none"
              />
              <button
                type="submit"
                disabled={!prompt.trim() || loadingSpirit}
                aria-label="Send message"
                title="Send message"
                className="flex h-12 w-12 shrink-0 items-center justify-center bg-marigold text-[#21180d] transition-colors hover:bg-marigold-glow disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Send size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        ) : activeTab === "family" ? (
          /* ================= LIVING GALLERY OF ANCESTORS & FAMILY TREE TAB ================= */
          <div className="flex-1 space-y-6 border border-spirit-border bg-spirit-card p-5 shadow-candle sm:p-7">
            {/* Top Ofrenda Banner */}
            <div className="flex flex-col gap-4 border-b border-spirit-border pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-marigold">
                  Día de los Muertos Digital Ofrenda
                </p>
                <h2 className="font-serif text-2xl text-[#fff5e8]">
                  Living Gallery &amp; Ancestral Family Tree
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-spirit-muted">
                  Honor your lineage across the generations. Round portrait nodes, visual family timeline lines,
                  and bracketed relationship details (e.g. <span className="text-[#ffd06a] font-mono">[Mother]</span>,{" "}
                  <span className="text-[#ffd06a] font-mono">[Daughter]</span>,{" "}
                  <span className="text-[#ffd06a] font-mono">[Granddaughter]</span>).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="border border-marigold/30 bg-marigold/10 px-3 py-1.5 font-serif text-sm text-marigold">
                  {familyMembers.length} Ancestors Honored
                </span>
              </div>
            </div>

            {/* View Selector Controls */}
            <div className="flex flex-col gap-4 border-b border-spirit-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Option Selector: Tree vs Gallery vs Both */}
              <div className="inline-flex rounded border border-spirit-border bg-spirit-dark/80 p-1">
                <button
                  type="button"
                  onClick={() => setFamilyViewMode("tree")}
                  className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    familyViewMode === "tree"
                      ? "bg-marigold font-semibold text-[#21180d] shadow-candle"
                      : "text-spirit-muted hover:text-[#fff5e8]"
                  }`}
                >
                  <GitBranch size={14} aria-hidden="true" />
                  Hierarchical Family Tree
                </button>
                <button
                  type="button"
                  onClick={() => setFamilyViewMode("gallery")}
                  className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    familyViewMode === "gallery"
                      ? "bg-marigold font-semibold text-[#21180d] shadow-candle"
                      : "text-spirit-muted hover:text-[#fff5e8]"
                  }`}
                >
                  <Flame size={14} aria-hidden="true" />
                  Living Gallery of Ancestors
                </button>
                <button
                  type="button"
                  onClick={() => setFamilyViewMode("both")}
                  className={`inline-flex items-center gap-2 rounded px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    familyViewMode === "both"
                      ? "bg-marigold font-semibold text-[#21180d] shadow-candle"
                      : "text-spirit-muted hover:text-[#fff5e8]"
                  }`}
                >
                  <Layers size={14} aria-hidden="true" />
                  Tree &amp; Gallery
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-spirit-muted" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search ancestors or roles…"
                    value={familySearch}
                    onChange={(e) => setFamilySearch(e.target.value)}
                    className="h-8 rounded border border-spirit-border bg-spirit-dark pl-8 pr-3 text-xs text-[#fff5e8] placeholder:text-[#705a49] focus:border-marigold focus:outline-none"
                  />
                  {familySearch && (
                    <button
                      type="button"
                      onClick={() => setFamilySearch("")}
                      className="absolute right-2 top-2 text-spirit-muted hover:text-marigold"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={relationshipFilter}
                  onChange={(e) => setRelationshipFilter(e.target.value)}
                  className="h-8 rounded border border-spirit-border bg-spirit-dark px-2.5 text-xs text-[#fff5e8] focus:border-marigold focus:outline-none"
                >
                  <option value="all">All Generations</option>
                  <option value="ancestors">Ancestors &amp; Grandparents</option>
                  <option value="mothers_fathers">Mothers &amp; Fathers</option>
                  <option value="daughters">Daughters &amp; Sons</option>
                  <option value="granddaughters">Granddaughters &amp; Descendants</option>
                </select>
              </div>
            </div>

            {/* CSV Upload Form */}
            <form onSubmit={handleFamilyUpload} className="space-y-4">
              <label className="group flex min-h-32 cursor-pointer flex-col items-center justify-center border border-dashed border-[#705a49] bg-spirit-dark/70 px-5 py-5 text-center transition-colors hover:border-marigold">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => chooseFamilyFile(event.target.files?.[0])}
                />
                {selectedFamilyFile ? (
                  <>
                    <FileSpreadsheet size={30} className="mb-2 text-marigold" aria-hidden="true" />
                    <span className="max-w-full break-all text-sm font-medium text-[#fff5e8]">
                      {selectedFamilyFile.name}
                    </span>
                    <span className="mt-1 text-xs text-spirit-muted">
                      {(selectedFamilyFile.size / 1024).toFixed(1)} KB · Ready to import
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud
                      size={30}
                      className="mb-2 text-marigold transition-transform group-hover:-translate-y-1"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-[#fff5e8]">
                      Import Family Tree CSV (timeline.csv)
                    </span>
                    <span className="mt-1 text-xs text-spirit-muted">
                      Columns: name, born_year, death_year, image_url, relationship, generation
                    </span>
                  </>
                )}
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!selectedFamilyFile || loadingFamily}
                  className="inline-flex min-h-10 items-center justify-center gap-2 bg-marigold px-4 text-xs font-semibold uppercase tracking-wider text-[#21180d] transition-colors hover:bg-marigold-glow disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loadingFamily ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Scroll size={15} aria-hidden="true" />}
                  {loadingFamily ? "Archiving Ancestors…" : "Import to Ofrenda"}
                </button>

                {selectedFamilyFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFamilyFile(null);
                      setFamilyError("");
                      setFamilySuccess("");
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center border border-spirit-border text-spirit-muted transition-colors hover:border-marigold hover:text-marigold"
                    aria-label="Remove selected file"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>

            {/* Error or Success notification */}
            {familyError && (
              <div className="flex items-start gap-2 border border-red-900/70 bg-red-950/30 p-3.5 text-xs text-red-200" role="alert">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{familyError}</span>
              </div>
            )}
            {familySuccess && (
              <div className="flex items-start gap-2 border border-emerald-900/70 bg-emerald-950/30 p-3.5 text-xs text-emerald-200" role="status">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{familySuccess}</span>
              </div>
            )}

            {/* ================= SECTION 1: HIERARCHICAL FAMILY TREE ================= */}
            {(familyViewMode === "tree" || familyViewMode === "both") && (
              <div className="mt-6 border border-spirit-border/80 bg-spirit-dark/60 p-5 sm:p-6 shadow-candle">
                <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-spirit-border/60 pb-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-serif text-lg text-[#fff5e8]">
                      <GitBranch size={18} className="text-marigold" />
                      Hierarchical Family Lineage
                    </h3>
                    <p className="text-xs text-spirit-muted">
                      Structured rows connected by ancestral timeline lines: Ancestors &amp; Parents atop, Daughters in middle, Granddaughters below.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-marigold">
                    {filteredFamily.length} Nodes in Hierarchy
                  </span>
                </div>

                {filteredFamily.length === 0 ? (
                  <div className="border border-dashed border-spirit-border p-8 text-center text-spirit-muted text-sm">
                    No family members match your filter.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* ROW 1: ANCESTORS & PARENTS (TOP ROW) */}
                    {ancestorsRow.length > 0 && (
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-marigold/40 bg-marigold/10 px-3 py-1 font-serif text-xs font-semibold text-marigold">
                            <Flame size={12} />
                            Top Row · Ancestors &amp; Parents
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-spirit-muted">
                            Founding Generations
                          </span>
                        </div>

                        {/* Round Profile Image Nodes */}
                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 py-2">
                          {ancestorsRow.map((member, idx) => (
                            <div
                              key={idx}
                              onClick={() => whisperAboutMember(member)}
                              title={`Click to whisper inquiry about ${member.name} in séance`}
                              className="group flex flex-col items-center cursor-pointer transition-transform duration-300 hover:-translate-y-1"
                            >
                              {/* Round Profile Image Node */}
                              <div className="relative">
                                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-2 border-marigold/80 bg-spirit-dark shadow-[0_0_15px_rgba(255,183,77,0.25)] transition-all duration-300 group-hover:border-marigold group-hover:shadow-[0_0_22px_rgba(255,183,77,0.55)] group-hover:ring-4 group-hover:ring-marigold/20">
                                  <img
                                    src={member.image_url || "/no_image.png"}
                                    alt={member.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/no_image.png";
                                    }}
                                    className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                </div>
                                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-marigold/70 bg-spirit-dark text-xs text-marigold shadow-candle">
                                  🕯️
                                </span>
                              </div>

                              {/* Name with relationship details included in brackets */}
                              <div className="mt-2.5 text-center max-w-[140px]">
                                <h4 className="truncate font-serif text-xs sm:text-sm font-semibold text-[#fff5e8] group-hover:text-marigold-glow">
                                  {member.name}
                                </h4>
                                {member.relationship && (
                                  <p className="font-mono text-[11px] font-bold text-marigold">
                                    [{member.relationship}]
                                  </p>
                                )}
                                <p className="text-[10px] text-spirit-muted">
                                  {member.born_year} – {member.death_year ?? "Eternal"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Visual Timeline / Family Tree Connector Lines (between Ancestors and Daughters) */}
                        {daughtersRow.length > 0 && (
                          <div className="relative my-4 flex flex-col items-center">
                            {/* Vertical trunk line */}
                            <div className="h-6 w-0.5 bg-gradient-to-b from-marigold via-marigold/80 to-marigold/40 shadow-[0_0_8px_#ffd06a]" />
                            {/* Central glowing hub */}
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-16 sm:w-36 bg-gradient-to-r from-transparent via-marigold/60 to-marigold shadow-[0_0_6px_#ffd06a]" />
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-marigold bg-spirit-dark text-[10px] text-marigold shadow-[0_0_10px_#ffd06a]">
                                ✦
                              </div>
                              <span className="h-1.5 w-16 sm:w-36 bg-gradient-to-r from-marigold via-marigold/60 to-transparent shadow-[0_0_6px_#ffd06a]" />
                            </div>
                            {/* Vertical trunk line into daughters */}
                            <div className="h-6 w-0.5 bg-gradient-to-b from-marigold/40 to-marigold shadow-[0_0_8px_#ffd06a]" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROW 2: DAUGHTERS & MIDDLE GENERATION (NEXT ROW DOWN) */}
                    {daughtersRow.length > 0 && (
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1 font-serif text-xs font-semibold text-[#f59e0b]">
                            <GitBranch size={12} />
                            Next Row Down · Daughters &amp; Mothers
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-spirit-muted">
                            The Sustaining Lineage
                          </span>
                        </div>

                        {/* Round Profile Image Nodes */}
                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 py-2">
                          {daughtersRow.map((member, idx) => (
                            <div
                              key={idx}
                              onClick={() => whisperAboutMember(member)}
                              title={`Click to whisper inquiry about ${member.name} in séance`}
                              className="group flex flex-col items-center cursor-pointer transition-transform duration-300 hover:-translate-y-1"
                            >
                              {/* Round Profile Image Node */}
                              <div className="relative">
                                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-2 border-marigold/80 bg-spirit-dark shadow-[0_0_15px_rgba(255,183,77,0.25)] transition-all duration-300 group-hover:border-marigold group-hover:shadow-[0_0_22px_rgba(255,183,77,0.55)] group-hover:ring-4 group-hover:ring-marigold/20">
                                  <img
                                    src={member.image_url || "/no_image.png"}
                                    alt={member.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/no_image.png";
                                    }}
                                    className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                </div>
                                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-marigold/70 bg-spirit-dark text-xs text-marigold shadow-candle">
                                  🕯️
                                </span>
                              </div>

                              {/* Name with relationship details included in brackets */}
                              <div className="mt-2.5 text-center max-w-[140px]">
                                <h4 className="truncate font-serif text-xs sm:text-sm font-semibold text-[#fff5e8] group-hover:text-marigold-glow">
                                  {member.name}
                                </h4>
                                {member.relationship && (
                                  <p className="font-mono text-[11px] font-bold text-marigold">
                                    [{member.relationship}]
                                  </p>
                                )}
                                <p className="text-[10px] text-spirit-muted">
                                  {member.born_year} – {member.death_year ?? "Present"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Visual Timeline / Family Tree Connector Lines (between Daughters and Granddaughters) */}
                        {granddaughtersRow.length > 0 && (
                          <div className="relative my-4 flex flex-col items-center">
                            {/* Vertical trunk line */}
                            <div className="h-6 w-0.5 bg-gradient-to-b from-marigold via-marigold/80 to-marigold/40 shadow-[0_0_8px_#ffd06a]" />
                            {/* Central glowing hub */}
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-16 sm:w-36 bg-gradient-to-r from-transparent via-marigold/60 to-marigold shadow-[0_0_6px_#ffd06a]" />
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-marigold bg-spirit-dark text-[10px] text-marigold shadow-[0_0_10px_#ffd06a]">
                                ✦
                              </div>
                              <span className="h-1.5 w-16 sm:w-36 bg-gradient-to-r from-marigold via-marigold/60 to-transparent shadow-[0_0_6px_#ffd06a]" />
                            </div>
                            {/* Vertical trunk line into granddaughters */}
                            <div className="h-6 w-0.5 bg-gradient-to-b from-marigold/40 to-marigold shadow-[0_0_8px_#ffd06a]" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROW 3: GRANDDAUGHTERS & DESCENDANTS (SUBSEQUENT ROW BELOW) */}
                    {granddaughtersRow.length > 0 && (
                      <div className="relative">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 font-serif text-xs font-semibold text-amber-300">
                            <Sparkles size={12} />
                            Subsequent Row Below · Granddaughters &amp; Living Branches
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-spirit-muted">
                            Living Continuity
                          </span>
                        </div>

                        {/* Round Profile Image Nodes */}
                        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 py-2">
                          {granddaughtersRow.map((member, idx) => (
                            <div
                              key={idx}
                              onClick={() => whisperAboutMember(member)}
                              title={`Click to whisper inquiry about ${member.name} in séance`}
                              className="group flex flex-col items-center cursor-pointer transition-transform duration-300 hover:-translate-y-1"
                            >
                              {/* Round Profile Image Node */}
                              <div className="relative">
                                <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-2 border-marigold/80 bg-spirit-dark shadow-[0_0_15px_rgba(255,183,77,0.25)] transition-all duration-300 group-hover:border-marigold group-hover:shadow-[0_0_22px_rgba(255,183,77,0.55)] group-hover:ring-4 group-hover:ring-marigold/20">
                                  <img
                                    src={member.image_url || "/no_image.png"}
                                    alt={member.name}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/no_image.png";
                                    }}
                                    className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                </div>
                                <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-marigold/70 bg-spirit-dark text-xs text-marigold shadow-candle">
                                  🕯️
                                </span>
                              </div>

                              {/* Name with relationship details included in brackets */}
                              <div className="mt-2.5 text-center max-w-[140px]">
                                <h4 className="truncate font-serif text-xs sm:text-sm font-semibold text-[#fff5e8] group-hover:text-marigold-glow">
                                  {member.name}
                                </h4>
                                {member.relationship && (
                                  <p className="font-mono text-[11px] font-bold text-marigold">
                                    [{member.relationship}]
                                  </p>
                                )}
                                <p className="text-[10px] text-spirit-muted">
                                  {member.born_year} – {member.death_year ?? "Living Branch"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= SECTION 2: LIVING GALLERY OF ANCESTORS ================= */}
            {(familyViewMode === "gallery" || familyViewMode === "both") && (
              <div className="mt-8">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 font-serif text-lg text-[#fff5e8]">
                    <Flame size={18} className="text-marigold" />
                    Living Gallery of Ancestors
                  </h3>
                  <span className="text-xs text-spirit-muted">
                    Click any portrait to whisper their name in the séance
                  </span>
                </div>

                {filteredFamily.length === 0 ? (
                  <div className="border border-dashed border-spirit-border p-8 text-center text-spirit-muted text-sm">
                    No ancestors have been recorded yet. Upload a CSV to bring their portraits to life.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredFamily.map((member, index) => (
                      <div
                        key={index}
                        onClick={() => whisperAboutMember(member)}
                        className="group relative flex items-center gap-4 border border-spirit-border bg-spirit-dark/80 p-4 transition-all duration-300 hover:border-marigold hover:shadow-candle cursor-pointer"
                      >
                        {/* Round Profile Image Node in Gallery Card */}
                        <div className="relative h-16 w-16 shrink-0">
                          <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-marigold/70 bg-spirit-card transition-all duration-300 group-hover:border-marigold group-hover:ring-2 group-hover:ring-marigold/30 shadow-candle">
                            <img
                              src={member.image_url || "/no_image.png"}
                              alt={member.name}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/no_image.png";
                              }}
                              className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          </div>
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-marigold/60 bg-spirit-dark text-[10px] text-marigold shadow-candle">
                            🕯️
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* Name with relationship details included in brackets */}
                          <h4 className="truncate font-serif text-base font-semibold text-[#fff5e8] group-hover:text-marigold-glow">
                            {member.name}{" "}
                            {member.relationship && (
                              <span className="font-mono text-xs font-bold text-marigold">
                                [{member.relationship}]
                              </span>
                            )}
                          </h4>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-spirit-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-marigold/70" />
                            {member.born_year} – {member.death_year ?? "Present / Living"}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="inline-block text-[10px] uppercase tracking-wider text-marigold/80">
                              {member.death_year ? "In Sacred Rest" : "Living Branch"}
                            </span>
                            <span className="text-[10px] font-mono text-spirit-muted group-hover:text-[#fff5e8]">
                              Whisper Séance →
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ================= TIMELINE ANALYTICS TAB ================= */
          <div className="flex-1 border border-spirit-border bg-spirit-card p-5 shadow-candle sm:p-7">
            <div className="mb-6 border-b border-spirit-border pb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-marigold">
                Historical patterns
              </p>
              <h2 className="font-serif text-xl text-[#fff5e8]">Timeline analysis</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-spirit-muted">
                Choose a CSV with a <code className="text-[#ffd06a]">target</code> column. The local TabPFN analyzer
                evaluates historical records and reports its pattern match score.
              </p>
            </div>

            <form onSubmit={handleTimelineUpload} className="max-w-3xl space-y-4">
              <label className="group flex min-h-48 cursor-pointer flex-col items-center justify-center border border-dashed border-[#705a49] bg-spirit-dark/70 px-5 py-8 text-center transition-colors hover:border-marigold">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => chooseTimelineFile(event.target.files?.[0])}
                />
                {selectedTimelineFile ? (
                  <>
                    <FileSpreadsheet size={34} className="mb-3 text-marigold" aria-hidden="true" />
                    <span className="max-w-full break-all text-sm font-medium text-[#fff5e8]">
                      {selectedTimelineFile.name}
                    </span>
                    <span className="mt-1 text-xs text-spirit-muted">
                      {(selectedTimelineFile.size / 1024).toFixed(1)} KB · CSV
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud
                      size={34}
                      className="mb-3 text-marigold transition-transform group-hover:-translate-y-1"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium text-[#fff5e8]">Select a historical CSV file (timeline.csv)</span>
                    <span className="mt-1 text-xs text-spirit-muted">CSV format · include a target column</span>
                  </>
                )}
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={!selectedTimelineFile || loadingTimeline}
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-marigold px-5 text-sm font-semibold text-[#21180d] transition-colors hover:bg-marigold-glow disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loadingTimeline ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Cpu size={16} aria-hidden="true" />}
                  {loadingTimeline ? "Analyzing…" : "Run analysis"}
                </button>
                {selectedTimelineFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTimelineFile(null);
                      setAnalysisResult(null);
                      setTimelineError("");
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center border border-spirit-border text-spirit-muted transition-colors hover:border-marigold hover:text-marigold"
                    aria-label="Remove selected file"
                    title="Remove selected file"
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>

            {timelineError && (
              <div className="mt-6 flex max-w-3xl items-start gap-2 border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200" role="alert">
                <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{timelineError}</span>
              </div>
            )}

            {analysisResult && (
              <div className="mt-6 max-w-3xl border border-spirit-border bg-spirit-dark p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-marigold-glow">
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Analysis complete · {analysisResult.status}
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="border border-spirit-border bg-spirit-card p-4">
                    <dt className="text-xs text-spirit-muted">Rows analyzed</dt>
                    <dd className="mt-1 text-2xl font-semibold text-[#fff5e8]">{analysisResult.rows_analyzed}</dd>
                  </div>
                  <div className="border border-spirit-border bg-spirit-card p-4">
                    <dt className="text-xs text-spirit-muted">Pattern match score</dt>
                    <dd className="mt-1 text-2xl font-semibold text-marigold-glow">
                      {analysisResult.pattern_reliability_score}%
                    </dd>
                  </div>
                </dl>
                {analysisResult.summary && (
                  <p className="mt-4 text-sm leading-6 text-[#c8bbb1]">{analysisResult.summary}</p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-7 flex flex-col gap-2 border-t border-spirit-border/70 pt-4 text-xs text-spirit-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="font-serif text-sm text-[#d9cec4]">Memoria Viva · Digital Ofrenda</span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} aria-hidden="true" /> Preserved locally against cloud decay.
        </span>
      </footer>
    </main>
  );
}