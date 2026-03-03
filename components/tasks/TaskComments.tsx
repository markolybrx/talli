"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profile?: { full_name: string | null; avatar_url: string | null; email: string };
}

interface TaskCommentsProps {
  taskId: string;
  members: { id: string; profile: { full_name: string | null; avatar_url: string | null; email: string } }[];
  currentUserId: string;
}

export function TaskComments({ taskId, members, currentUserId }: TaskCommentsProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`comments:${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("task_comments")
      .select("*, profile:user_id(full_name, avatar_url, email)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (data) setComments(data as Comment[]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "@") {
      setShowMentions(true);
      setMentionSearch("");
    } else if (e.key === "Escape") {
      setShowMentions(false);
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
    if (showMentions) {
      const lastAtIndex = content.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        setMentionSearch(content.slice(lastAtIndex + 1));
      }
    }
  };

  const insertMention = (name: string) => {
    const lastAtIndex = content.lastIndexOf("@");
    const before = content.slice(0, lastAtIndex);
    setContent(`${before}@${name} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredMembers = members.filter((m) =>
    (m.profile.full_name ?? m.profile.email).toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!content.trim() || !session?.user?.id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId,
        user_id: session.user.id,
        content: content.trim(),
      });
      if (error) throw error;

      // Handle @mentions — create notifications
      const mentionMatches = content.match(/@(\w+[\w\s]*)/g) ?? [];
      for (const mention of mentionMatches) {
        const name = mention.slice(1).trim();
        const mentioned = members.find((m) =>
          (m.profile.full_name ?? "").toLowerCase().startsWith(name.toLowerCase())
        );
        if (mentioned && mentioned.id !== session.user.id) {
          await supabase.from("notifications").insert({
            user_id: mentioned.id,
            title: "You were mentioned",
            message: `${session.user.name ?? "Someone"} mentioned you in a comment.`,
            type: "mention",
            task_id: taskId,
          });
        }
      }

      setContent("");
      await fetchComments();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return;
    await supabase.from("task_comments").update({ content: editContent, updated_at: new Date().toISOString() }).eq("id", id);
    setEditingId(null);
    await fetchComments();
    toast.success("Comment updated");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("task_comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    toast.success("Comment deleted");
  };

  const renderContent = (text: string) =>
    text.split(/(@\w[\w\s]*)/).map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="text-brand font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  return (
    <div className="space-y-5">
      {/* Comment list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">No comments yet. Be the first to comment.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar name={comment.profile?.full_name} src={comment.profile?.avatar_url} size="sm" className="flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-text-primary">
                    {comment.profile?.full_name ?? comment.profile?.email ?? "Unknown"}
                  </span>
                  <span className="text-xs text-text-secondary">{formatDateTime(comment.created_at)}</span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-text-secondary">(edited)</span>
                  )}
                </div>
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(comment.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-text-primary leading-relaxed">
                    {renderContent(comment.content)}
                  </div>
                )}
              </div>
              {comment.user_id === currentUserId && editingId !== comment.id && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
                  <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(comment.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment input */}
      <div className="flex gap-3">
        <Avatar name={session?.user?.name} src={session?.user?.image} size="sm" className="flex-shrink-0 mt-1" />
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (showMentions) {
                const lastAt = e.target.value.lastIndexOf("@");
                setMentionSearch(lastAt !== -1 ? e.target.value.slice(lastAt + 1) : "");
              }
            }}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Write a comment... Use @ to mention teammates"
            className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none transition-all"
          />
          {/* Mention dropdown */}
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-56 bg-surface border border-border rounded-xl shadow-dropdown py-1 z-50">
              {filteredMembers.map((m) => (
                <button key={m.id} onClick={() => insertMention(m.profile.full_name ?? m.profile.email)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left transition-colors">
                  <Avatar name={m.profile.full_name} src={m.profile.avatar_url} size="xs" />
                  <span className="text-sm text-text-primary">{m.profile.full_name ?? m.profile.email}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-text-secondary">Press Ctrl+Enter to submit</p>
            <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!content.trim()}>
              Post Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
