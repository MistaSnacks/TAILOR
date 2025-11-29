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
  RefreshCw
} from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
      icon: <Target className="w-5 h-5" />,
      label: 'Interview Prep',
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
      icon: <FileText className="w-5 h-5" />,
      label: 'Resume Help',
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
      icon: <Compass className="w-5 h-5" />,
      label: 'Career Strategy',
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
      icon: <Heart className="w-5 h-5" />,
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
    { icon: '🎯', text: "What makes me stand out as a candidate?" },
    { icon: '📈', text: "Analyze gaps in my experience" },
    { icon: '💡', text: "Suggest ways to improve my profile" },
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
    // Split by newlines and handle basic formatting
    return content.split('\n').map((line, i) => {
      // Handle headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="font-semibold text-lg mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="font-bold text-xl mt-4 mb-2">{line.slice(3)}</h2>;
      }
      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="ml-4 my-1">{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={i} className="ml-4 my-1 list-decimal">{line.slice(line.indexOf(' ') + 1)}</li>;
      }
      // Handle bold text
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="my-1">
            {parts.map((part, j) => 
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        );
      }
      // Empty lines
      if (!line.trim()) {
        return <br key={i} />;
      }
      return <p key={i} className="my-1">{line}</p>;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-violet-600 flex items-center justify-center shadow-lg shadow-primary/25">
                <span className="font-display text-2xl font-bold text-white">T</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                TAILOR
              </h1>
              <p className="text-muted-foreground text-sm">Your AI Career Coach</p>
            </div>
          </div>
          {messages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              New Chat
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-4 rounded-2xl glass-card border border-border p-6 shadow-sm bg-gradient-to-b from-card/50 to-card">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {/* Welcome Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative mb-8"
            >
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/20 via-violet-500/20 to-emerald-500/20 flex items-center justify-center border border-primary/20">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Bot className="w-14 h-14 text-primary" />
                </motion.div>
              </div>
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-amber-500" />
              </motion.div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-2xl font-bold mb-3"
            >
              Hi, I'm TAILOR! 👋
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground max-w-lg mb-8 leading-relaxed"
            >
              I'm your personal AI career coach. I know your resume inside and out, and I'm here to help you 
              <span className="text-primary font-medium"> ace interviews</span>, 
              <span className="text-emerald-500 font-medium"> navigate career transitions</span>, and 
              <span className="text-amber-500 font-medium"> build confidence</span>. 
              What can I help you with today?
            </motion.p>

            {/* Category Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-3 mb-8"
            >
              {suggestionCategories.map((category, index) => (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br ${category.color} border transition-all duration-200 ${
                    activeCategory === category.id 
                      ? 'ring-2 ring-primary/50 scale-105' 
                      : 'hover:scale-105'
                  }`}
                >
                  {category.icon}
                  <span className="font-medium text-sm">{category.label}</span>
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
                  className="w-full max-w-2xl mb-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {suggestionCategories
                      .find(c => c.id === activeCategory)
                      ?.suggestions.map((suggestion, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="p-4 text-left rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                          <span className="text-sm leading-relaxed group-hover:text-primary transition-colors">
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
                className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full"
              >
                {quickPrompts.map((prompt, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    onClick={() => setInput(prompt.text)}
                    className="p-4 text-left rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  >
                    <span className="mr-2 text-xl group-hover:scale-110 inline-block transition-transform">{prompt.icon}</span>
                    <span className="font-medium text-sm">{prompt.text}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md' 
                        : 'bg-gradient-to-br from-violet-500/20 to-primary/20 text-primary border border-primary/20'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <span className="font-display font-bold text-sm">T</span>
                      )}
                    </div>
                    <div
                      className={`px-5 py-3.5 rounded-2xl shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm'
                          : 'bg-card border border-border rounded-tl-sm'
                      }`}
                    >
                      <div className="leading-relaxed prose prose-sm max-w-none dark:prose-invert">
                        {message.role === 'assistant' 
                          ? formatContent(message.content)
                          : message.content
                        }
                      </div>
                      <div
                        className={`text-[10px] mt-3 opacity-70 ${
                          message.role === 'user'
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
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <span className="font-display font-bold text-sm text-primary">T</span>
                  </div>
                  <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-card border border-border shadow-sm flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-medium">TAILOR is thinking</span>
                    <div className="flex gap-1.5">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 rounded-full bg-primary"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 rounded-full bg-violet-500"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 rounded-full bg-emerald-500"
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
        className="flex gap-3"
      >
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask TAILOR anything about your career..."
            className="w-full px-5 py-4 pr-12 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all"
            disabled={loading}
          />
          <MessageCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
        </div>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </motion.form>
    </div>
  );
}
