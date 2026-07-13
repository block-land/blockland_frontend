"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Send, User, MessageSquare, ShieldCheck, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DUMMY_TILES } from "@/lib/tiles";

interface Message {
  id: string;
  sender: "user" | "other";
  text: string;
  time: string;
}

interface ChatThread {
  id: string;
  name: string;
  avatar: string;
  walletAddress: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  online: boolean;
  messages: Message[];
}

export default function MessagePage() {
  const [mounted, setMounted] = useState(false);
  const [threads, setOffers] = useState<ChatThread[]>([
    {
      id: "th-01",
      name: "SolanaCrusader",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x7a8b...d3e1",
      lastMessage: "I received your offer of 300 USDC. Let me think about it.",
      time: "10:35 AM",
      unreadCount: 1,
      online: true,
      messages: [
        {
          id: "m-01",
          sender: "user",
          text: "Hi Crusader! Is the Golden Gate Bridge Vista tile negotiable?",
          time: "10:30 AM",
        },
        {
          id: "m-02",
          sender: "other",
          text: "I received your offer of 300 USDC. Let me think about it.",
          time: "10:35 AM",
        },
      ],
    },
    {
      id: "th-02",
      name: "BlockLord",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x9f3c...a89c",
      lastMessage: "Can we close at 280 USDC? Let me know.",
      time: "Yesterday",
      unreadCount: 1,
      online: true,
      messages: [
        {
          id: "m-03",
          sender: "other",
          text: "Can we close at 280 USDC? Let me know.",
          time: "Yesterday",
        },
      ],
    },
    {
      id: "th-03",
      name: "CryptoExplorer",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60",
      walletAddress: "0x2b8a...ff54",
      lastMessage: "Sounds good, thanks!",
      time: "2 days ago",
      unreadCount: 0,
      online: false,
      messages: [
        {
          id: "m-04",
          sender: "user",
          text: "Offer submitted! Thank you.",
          time: "3:40 PM",
        },
        {
          id: "m-05",
          sender: "other",
          text: "Sounds good, thanks!",
          time: "3:42 PM",
        },
      ],
    },
  ]);

  const [activeThreadId, setActiveThreadId] = useState("th-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  // Auto Scroll Chat view to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThreadId, activeThread?.messages, isTyping]);

  // Read message marking
  useEffect(() => {
    if (activeThread && activeThread.unreadCount > 0) {
      setOffers((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, unreadCount: 0 } : t))
      );
    }
  }, [activeThreadId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Update messages local state
    setOffers((prev) =>
      prev.map((t) => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            lastMessage: newMessage,
            time: "Just now",
            messages: [...t.messages, userMsg],
          };
        }
        return t;
      })
    );

    setNewMessage("");
    setIsTyping(true);

    // Simulated responses
    const replies = [
      "Let me think about your proposal.",
      "Are you willing to raise your offer slightly?",
      "That works for me. Please submit the offer on the marketplace page so I can approve it.",
      "Thanks, I will get back to you soon.",
    ];

    setTimeout(() => {
      setIsTyping(false);
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const botMsg: Message = {
        id: `msg-reply-${Date.now()}`,
        sender: "other",
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setOffers((prev) =>
        prev.map((t) => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              lastMessage: randomReply,
              time: "Just now",
              messages: [...t.messages, botMsg],
            };
          }
          return t;
        })
      );
    }, 1500);
  };

  const filteredThreads = threads.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="h-[calc(100vh-100px)] mx-auto flex w-full max-w-[1440px] flex-col px-6 py-4 sm:px-10 lg:px-[68px] overflow-hidden">
    {/* <div className="h-[calc(100vh-100px)] bg-black text-white p-6 font-sans flex flex-col overflow-hidden"> */}
      <div className="flex-1 flex gap-6 h-full overflow-hidden">
        
        {/* Left Column: Messages List Sidebar */}
        <div className="w-full md:w-[350px] shrink-0 bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col overflow-hidden">
          {/* Header & Search */}
          <div className="p-5 border-b border-zinc-900 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Messages
            </h2>
            <div className="relative bg-black flex gap-2.5 h-[40px] items-center px-3 rounded-xl border border-zinc-800 focus-within:border-zinc-700">
              <Search className="h-4 w-4 text-zinc-550 shrink-0" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none p-0 text-sm text-white placeholder-zinc-550"
              />
            </div>
          </div>

          {/* Threads List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all text-left cursor-pointer ${
                    thread.id === activeThreadId
                      ? "bg-zinc-900 border border-zinc-800"
                      : "hover:bg-zinc-900/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={thread.avatar}
                        alt={thread.name}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                      />
                      {thread.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-955" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-white flex items-center gap-1">
                        {thread.name}
                        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-[160px]">
                        {thread.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1.5 shrink-0">
                    <span className="text-[10px] text-zinc-500 font-mono">{thread.time}</span>
                    {thread.unreadCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-semibold text-black mx-auto">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Column: Chat Screen Area */}
        <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col overflow-hidden">
          {activeThread ? (
            <>
              {/* Active Header */}
              <div className="bg-zinc-900 border-b border-zinc-800 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={activeThread.avatar}
                      alt={activeThread.name}
                      className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                    />
                    {activeThread.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-900" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base flex items-center gap-1.5">
                      {activeThread.name}
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{activeThread.walletAddress}</p>
                  </div>
                </div>
              </div>

              {/* Chat Viewport messages area */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {activeThread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-end gap-2 max-w-[70%] group">
                        {msg.sender === "other" && (
                          <img
                            src={activeThread.avatar}
                            alt={activeThread.name}
                            className="w-6 h-6 rounded-full object-cover border border-zinc-800 shrink-0 mb-1"
                          />
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words ${
                            msg.sender === "user"
                              ? "bg-primary text-black rounded-tr-none font-medium"
                              : "bg-zinc-900 border border-zinc-800 text-white rounded-tl-none"
                          }`}
                        >
                          <p>{msg.text}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-550 mt-1 px-8 font-mono flex items-center gap-1">
                        {msg.time}
                        {msg.sender === "user" && <CheckCheck className="h-3 w-3 text-primary" />}
                      </span>
                    </div>
                  ))}

                  {/* Typing simulated indicator */}
                  {isTyping && (
                    <div className="flex flex-col items-start">
                      <div className="flex items-end gap-2 max-w-[70%]">
                        <img
                          src={activeThread.avatar}
                          alt={activeThread.name}
                          className="w-6 h-6 rounded-full object-cover border border-zinc-800 shrink-0 mb-1"
                        />
                        <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl rounded-tl-none px-4 py-2 text-xs flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input form footer */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-zinc-900 bg-zinc-900/30 flex gap-3 items-center"
              >
                <input
                  type="text"
                  placeholder="Aa"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none ring-0 focus:ring-0 text-white placeholder-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 rounded-xl bg-primary text-black disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-all cursor-pointer shrink-0"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-zinc-700" />
              <h3 className="font-semibold text-white text-lg">No active conversation</h3>
              <p className="text-zinc-500 text-sm max-w-xs">
                Select a conversation from the sidebar to start messaging.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
