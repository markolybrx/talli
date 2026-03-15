"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Send, Trash2, Sparkles, Loader2 } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
  is_ai?: boolean;
}

interface TaskCommentsProps {
  taskId: string;
  workspaceId?: string;
}

export function TaskComments({ taskId, workspaceId }: TaskCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!taskId) return;
    fetch(`/api/tasks/${taskId}/comments`)
      .then((d) => d.json())
      .then((d) => setComments(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setComments((prev) => [...prev, data]);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    await fetch(`/api/tasks/${taskId}/comments?$id=${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleSummarize = async () => {
    if (!workspaceId || comments.length < 2) return;
    setSummarizing(true);
    try {
      const res = await fetch("/api/ai/summarize-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, workspaceId }),
      });
      const data = await res.json();
      if (data.summary) setAiSummary(data.summary);
    } finally {
      setSummarizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Comments {comments.length > 0 && `(${comments.length})`}
        </h3>
        {comments.length >= 2 && (
          <button
            onClick={handleSummarize}
            disabled={summarizing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 disabled:opacity-50"
          >
            {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Summarize
          </button>
        )}
      </div>

      {aiSummary && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">AI Summary</span>
          </div>
          <p className="text-xs text-violet-800 dark:text-violet-200">{aiSummary}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-24">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((c) => {
            const isOwn = c.user_id === session?.user?.id;
            const name = c.profiles?.full_name || "User";
            const avatar = c.profiles?.avatar_url;
            return (
              <div key={c.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                {avatar ? (
                  <img src={avatar} alt={name} className="w-7 h-7 rounded-full shrink-0 object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center shrink-0 text-violet-600 text-xs font-medium">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div className={`max-w-xs ${isOwn ? "items-end" : ""} flex flex-col gap-0.5`}>
                  <span className="text-xs text-gray-400">
                    {name} &bull; {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className={`group relative p-2.5 rounded-xl text-sm ${isOwn ? "bg-violet-600 text-white" : "bg-gray-100 dark:bg-gray-750 text-gray-800 dark:text-gray-200"}`}>
                    {c.content}
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (⃞-Enter to send)"
          rows={2}
          className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="self-end p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
