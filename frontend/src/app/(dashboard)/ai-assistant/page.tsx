"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import { patientsApi } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8747";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Patient = {
  id: number;
  full_name: string;
};

const SUGGESTIONS = [
  "What dietary changes would help pacify Vata dosha?",
  "Summarize this patient's recent check-in trends",
  "Suggest a morning dinacharya routine for a Pitta-dominant patient",
  "What herbs support healthy digestion and agni?",
  "Draft follow-up questions for a patient with joint pain",
  "Explain the relationship between ama and chronic inflammation",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [patientId, setPatientId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ["patients-list"],
    queryFn: () => patientsApi.list().then((r) => r.data),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || streaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: msg };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          patient_id: patientId,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: `Error: ${res.status === 402 ? "Active subscription required." : err}` }
              : m
          )
        );
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream reader");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, content: m.content + data } : m
              )
            );
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: m.content || "Failed to connect. Is the backend running?" }
            : m
        )
      );
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Ayurvedic clinical support</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Patient context:</span>
          <Select
            value={patientId?.toString() ?? ""}
            onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : null)}
            className="w-48 text-sm"
          >
            <option value="">None (general)</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-8 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-lg font-semibold">Ayurvedic AI Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Ask about Ayurvedic protocols, get patient insights, draft care plans, or explore
                dosha-specific recommendations. Select a patient for personalized context.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 max-w-lg w-full">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs border rounded-lg p-3 hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content || (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Thinking...
                  </span>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="size-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background px-6 py-3 shrink-0">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Ayurvedic protocols, patient care, dosha analysis..."
            rows={1}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[42px] max-h-[120px]"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <Button
            size="icon"
            disabled={!input.trim() || streaming}
            onClick={() => handleSend()}
            className="shrink-0 h-[42px] w-[42px]"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          AI responses are for clinical reference only. Always apply your professional judgement.
        </p>
      </div>
    </div>
  );
}
