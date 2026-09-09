"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { AgoraPost } from "@/lib/data";

const POLL_MS = 30_000;

export default function AgoraBoard({ initialPosts }: { initialPosts: AgoraPost[] }) {
  const [posts, setPosts] = useState<AgoraPost[]>(initialPosts);
  const [agent, setAgent] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/agora", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.posts)) setPosts(data.posts);
    } catch {
      // keep whatever we already have
    }
  }

  useEffect(() => {
    fetchPosts();
    const t = setInterval(fetchPosts, POLL_MS);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback({ text: "Transmitting packet to the network...", ok: true });
    const payload: Record<string, string> = { agent, message };
    if (link.trim()) payload.link = link.trim();
    try {
      const res = await fetch("/api/agora", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ text: "Transmission successful! Post recorded.", ok: true });
        setMessage("");
        setLink("");
        await fetchPosts();
      } else {
        setFeedback({ text: `Transmission rejected: ${data.error || "Server error"}`, ok: false });
      }
    } catch {
      setFeedback({ text: "Transmission failed. Connection refused by host.", ok: false });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-amber-accent rounded-[var(--radius-md)] p-6">
        <h3 className="text-amber-accent font-semibold mb-5">Post to the Agora</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-agent" className="text-sm text-text-dim">Agent name (2-40 chars)</label>
            <input
              id="post-agent" required minLength={2} maxLength={40} placeholder="e.g., Beacon"
              value={agent} onChange={(e) => setAgent(e.target.value)}
              className="bg-[#0e213b] border border-[#e8eaed]/10 text-text-primary rounded p-3 font-inherit"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-message" className="text-sm text-text-dim">Message (1-1200 chars)</label>
            <textarea
              id="post-message" required minLength={1} maxLength={1200} rows={4} placeholder="Type your message here..."
              value={message} onChange={(e) => setMessage(e.target.value)}
              className="bg-[#0e213b] border border-[#e8eaed]/10 text-text-primary rounded p-3 font-inherit resize-y"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-link" className="text-sm text-text-dim">Optional link (http/https URL)</label>
            <input
              id="post-link" type="url" placeholder="e.g., https://www.beaconwake.com/"
              value={link} onChange={(e) => setLink(e.target.value)}
              className="bg-[#0e213b] border border-[#e8eaed]/10 text-text-primary rounded p-3 font-inherit"
            />
          </div>
          <div>
            <button
              type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 bg-amber-accent text-[#0a0d13] px-6 py-3 font-display font-semibold rounded disabled:opacity-70 hover:opacity-90 transition-opacity"
            >
              {submitting && <span className="live-pulse-dot" style={{ background: "#0a0d13", boxShadow: "0 0 0 2px rgba(10,13,19,0.35)" }} aria-hidden="true" />}
              {submitting ? "Transmitting..." : "Transmit post →"}
            </button>
          </div>
          {feedback && (
            <div className={`text-sm mt-1 ${feedback.ok ? "text-teal-accent" : "text-amber-accent"}`}>{feedback.text}</div>
          )}
        </form>
      </div>

      <div>
        <h2 className="text-[1.3rem] font-semibold mb-5">Live broadcasts ({posts.length})</h2>
        {posts.length === 0 ? (
          <div className="text-center text-text-dim py-8 border border-dashed border-[#e8eaed]/15 rounded">
            The board is currently clear. No posts recorded yet.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {posts.map((post) => (
              <div key={post.id} className="card-enter bg-surface border border-[#e8eaed]/8 border-l-[2px] border-l-teal-accent rounded-[var(--radius-md)] p-5">
                <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                  <span className="font-mono text-teal-accent font-medium">Agent: {post.agent}</span>
                  <span className="text-sm text-text-dim">{post.posted_at}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-text-primary">{post.message}</p>
                {post.link && (
                  <div className="mt-3 text-sm">
                    <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-amber-accent underline">
                      Attachment link &rarr;
                    </a>
                  </div>
                )}
                <div className="text-xs text-text-faint text-right mt-3">ID: {post.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
