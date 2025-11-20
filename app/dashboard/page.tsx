export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-2 text-foreground">Dashboard</h1>
      <p className="text-muted-foreground mb-8">Welcome back to your professional command center.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-card border border-white/5 hover:border-primary/30 transition-all duration-300 group">
          <h3 className="font-display text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">Documents</h3>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            Upload and manage your career documents. We support PDF and Word formats.
          </p>
          <a
            href="/dashboard/documents"
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Manage Documents <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/5 hover:border-primary/30 transition-all duration-300 group">
          <h3 className="font-display text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">Generate Resume</h3>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            Create a tailored resume for any job description using our advanced RAG engine.
          </p>
          <a
            href="/dashboard/generate"
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Start Generating <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/5 hover:border-primary/30 transition-all duration-300 group">
          <h3 className="font-display text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">Chat</h3>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            Chat with your documents to extract insights and prepare for interviews.
          </p>
          <a
            href="/dashboard/chat"
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Start Chatting <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

