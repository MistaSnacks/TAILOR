'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Target,
  MessageCircle,
  Briefcase,
  TrendingUp,
  Heart,
  Lightbulb,
  FileText,
  GraduationCap,
  Compass,
  RefreshCw,
  Lock,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

type SuggestionCategory = {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  suggestions: string[];
};

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Check access on page load
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Use the dashboard stats API which includes access info
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          // Only allow access if user has unlimited access
          if (data.generationUsage?.hasUnlimited) {
            setAccessBlocked(false);
          } else {
            // Free user - block chat
            setAccessBlocked(true);
          }
        } else {
          // Non-OK response - deny access
          setAccessBlocked(true);
        }
      } catch (error) {
        // Fetch failure - deny access
        console.error('Error checking access:', error);
        setAccessBlocked(true);
      } finally {
        setCheckingAccess(false);
      }
    };
    checkAccess();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages,
        }),
      });

      // Handle paywall (403)
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.upgrade) {
          setAccessBlocked(true);
          setLoading(false);
          // Remove the user message since we couldn't process it
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          return;
        }
      }

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const suggestionCategories: SuggestionCategory[] = [
    {
      id: 'interview',
      icon: <Target className="w-4 h-4 md:w-5 md:h-5" />,
      label: 'Interview',
      color: 'from-violet-500/20 to-violet-600/20 border-violet-500/30 hover:border-violet-400/50',
      suggestions: [
        "Generate interview questions for my target role",
        "Help me prepare STAR stories from my experience",
        "What behavioral questions should I expect?",
        "Practice a mock interview with me",
      ],
    },
    {
      id: 'resume',
      icon: <FileText className="w-4 h-4 md:w-5 md:h-5" />,
      label: 'Resume',
      color: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 hover:border-emerald-400/50',
      suggestions: [
        "What are my strongest accomplishments?",
        "Which bullets should I highlight for tech roles?",
        "Summarize my career progression",
        "What skills am I underselling?",
      ],
    },
    {
      id: 'career',
      icon: <Compass className="w-4 h-4 md:w-5 md:h-5" />,
      label: 'Career',
      color: 'from-amber-500/20 to-amber-600/20 border-amber-500/30 hover:border-amber-400/50',
      suggestions: [
        "Help me plan a career transition to product management",
        "What roles match my experience best?",
        "How can I position myself for leadership?",
        "What skills should I develop next?",
      ],
    },
    {
      id: 'confidence',
      icon: <Heart className="w-4 h-4 md:w-5 md:h-5" />,
      label: 'Confidence',
      color: 'from-rose-500/20 to-rose-600/20 border-rose-500/30 hover:border-rose-400/50',
      suggestions: [
        "I'm nervous about an upcoming interview",
        "Help me overcome imposter syndrome",
        "How do I negotiate salary confidently?",
        "I feel underqualified for roles I want",
      ],
    },
  ];

  const quickPrompts = [
    { icon: '🎯', text: "What makes me stand out?" },
    { icon: '📈', text: "Analyze my experience gaps" },
    { icon: '💡', text: "Improve my profile" },
    { icon: '🔍', text: "Review my work history" },
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setActiveCategory(null);
  };

  const clearChat = () => {
    setMessages([]);
  };

  // Format message content with markdown-like styling
  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let keyCounter = 0;

    const processBoldText = (text: string): React.ReactNode => {
      if (!text.includes('**')) return text;
      const parts = text.split(/\*\*(.*?)\*\*/g);
      return parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part));
    };

    const flushList = () => {
      if (currentList && currentList.items.length > 0) {
        const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
        const listClass = currentList.type === 'ul'
          ? 'ml-4 my-2 space-y-1 list-disc list-outside'
          : 'ml-4 my-2 space-y-1 list-decimal list-outside';
        elements.push(
          <ListTag key={keyCounter++} className={listClass}>
            {currentList.items.map((item, idx) => (
              <li key={idx}>{processBoldText(item)}</li>
            ))}
          </ListTag>
        );
        currentList = null;
      }
    };

    lines.forEach((line, i) => {
      // Handle headers
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={keyCounter++} className="font-semibold text-base md:text-lg mt-4 mb-2">
            {processBoldText(line.slice(4))}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={keyCounter++} className="font-bold text-lg md:text-xl mt-4 mb-2">
            {processBoldText(line.slice(3))}
          </h2>
        );
        return;
      }

      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        if (currentList?.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(line.slice(2));
        return;
      }

      // Handle numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s(.+)$/);
      if (numberedMatch) {
        if (currentList?.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(numberedMatch[2]);
        return;
      }

      // Empty lines flush current list
      if (!line.trim()) {
        flushList();
        elements.push(<br key={keyCounter++} />);
        return;
      }

      // Regular paragraph (flush list first)
      flushList();
      elements.push(
        <p key={keyCounter++} className="my-1">
          {processBoldText(line)}
        </p>
      );
    });

    // Flush any remaining list
    flushList();

    return elements;
  };

  // Loading state while checking access
  if (checkingAccess) {
    return (
      <div className="min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Paywall screen
  if (accessBlocked) {
    return (
      <div className="min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="glass-card p-8 rounded-2xl border border-primary/20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Premium Feature</h2>
            <p className="text-muted-foreground mb-6">
              AI Career Coaching is available with a paid subscription. Upgrade to unlock personalized interview prep, career guidance, and confidence building.
            </p>
            <Link
              href="/pricing"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              Upgrade Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-5xl mx-auto px-3 md:px-4 py-3 md:py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 md:mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25 overflow-hidden">
                <span className="font-display text-lg md:text-2xl font-bold text-white leading-none">T</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                <Sparkles className="w-2 h-2 md:w-3 md:h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-xl md:text-3xl font-bold tracking-tight">
                T<span className="text-primary">AI</span>LOR
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">Your AI Career Coach</p>
            </div>
          </div>
          {messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearChat}
              className="flex items-center gap-1 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">New Chat</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-3 md:mb-4 rounded-xl md:rounded-2xl glass-card border border-border p-3 md:p-6 shadow-sm bg-gradient-to-b from-card/50 to-card">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            {/* Welcome Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-6 md:mb-8"
            >
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary/20 via-violet-500/20 to-emerald-500/20 flex items-center justify-center border border-primary/20">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Bot className="w-10 h-10 md:w-14 md:h-14 text-primary" />
                </motion.div>
              </div>
              <motion.div
                className="absolute -top-1 -right-1 md:-top-2 md:-right-2"
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-amber-500" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-xl md:text-2xl font-bold mb-2 md:mb-3"
            >
              Hi, I&apos;m T<span className="text-primary">AI</span>LOR! 👋
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm md:text-base text-muted-foreground max-w-lg mb-6 md:mb-8 leading-relaxed"
            >
              I&apos;m your AI career coach. I know your resume and can help you
              <span className="text-primary font-medium"> ace interviews</span>,
              <span className="text-emerald-500 font-medium"> plan career moves</span>, and
              <span className="text-amber-500 font-medium"> build confidence</span>.
            </motion.p>

            {/* Category Buttons - Scrollable on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6 md:mb-8 w-full"
            >
              {suggestionCategories.map((category, index) => (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                  className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-gradient-to-br ${category.color} border transition-all duration-200 ${activeCategory === category.id
                    ? 'ring-2 ring-primary/50 scale-105'
                    : 'hover:scale-105'
                    }`}
                >
                  {category.icon}
                  <span className="font-medium text-xs md:text-sm">{category.label}</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Category Suggestions */}
            <AnimatePresence mode="wait">
              {activeCategory && (
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="w-full max-w-2xl mb-6 md:mb-8"
                >
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
                    {suggestionCategories
                      .find(c => c.id === activeCategory)
                      ?.suggestions.map((suggestion, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="p-3 md:p-4 text-left rounded-lg md:rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                          <span className="text-xs md:text-sm leading-relaxed group-hover:text-primary transition-colors">
                            {suggestion}
                          </span>
                        </motion.button>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Prompts */}
            {!activeCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 gap-2 md:gap-3 max-w-2xl w-full"
              >
                {quickPrompts.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    onClick={() => setInput(prompt.text)}
                    className="p-3 md:p-4 text-left rounded-lg md:rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <span className="mr-1.5 md:mr-2 text-base md:text-xl group-hover:scale-110 inline-block transition-transform">{prompt.icon}</span>
                    <span className="font-medium text-xs md:text-sm">{prompt.text}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md'
                      : 'bg-gradient-to-br from-primary via-primary/80 to-violet-600 shadow-md'
                      }`}>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        <span className="font-display font-bold text-xs md:text-sm text-white leading-none">T</span>
                      )}
                    </div>
                    <div
                      className={`px-3 py-2.5 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl shadow-sm ${message.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm'
                        : 'bg-card border border-border rounded-tl-sm'
                        }`}
                    >
                      <div className="leading-relaxed prose prose-sm max-w-none dark:prose-invert text-sm md:text-base">
                        {message.role === 'assistant'
                          ? formatContent(message.content)
                          : message.content
                        }
                      </div>
                      <div
                        className={`text-[9px] md:text-[10px] mt-2 md:mt-3 opacity-70 ${message.role === 'user'
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                          }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex gap-2 md:gap-3 max-w-[85%]">
                  <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gradient-to-br from-primary via-primary/80 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                    <span className="font-display font-bold text-xs md:text-sm text-white leading-none">T</span>
                  </div>
                  <div className="px-3 py-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl rounded-tl-sm bg-card border border-border shadow-sm flex items-center gap-2 md:gap-3">
                    <span className="text-xs md:text-sm text-muted-foreground font-medium">Thinking</span>
                    <div className="flex gap-1 md:gap-1.5">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-violet-500"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                        className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onSubmit={handleSend}
        className="flex gap-2 md:gap-3"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your career..."
            className="w-full px-4 py-3 md:px-5 md:py-4 pr-10 md:pr-12 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all text-sm md:text-base"
            disabled={loading}
          />
          <MessageCircle className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground/50" />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-1.5 md:gap-2"
        >
          <Send className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden sm:inline text-sm md:text-base">Send</span>
        </button>
      </motion.form>
    </div>
  );
}
