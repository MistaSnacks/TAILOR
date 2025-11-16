export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-6">Dashboard</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg bg-card border border-border">
          <h3 className="font-display text-xl font-semibold mb-2">Documents</h3>
          <p className="text-muted-foreground mb-4">
            Upload and manage your career documents
          </p>
          <a
            href="/dashboard/documents"
            className="text-primary hover:underline"
          >
            Manage Documents →
          </a>
        </div>
        <div className="p-6 rounded-lg bg-card border border-border">
          <h3 className="font-display text-xl font-semibold mb-2">Generate Resume</h3>
          <p className="text-muted-foreground mb-4">
            Create a tailored resume for any job
          </p>
          <a
            href="/dashboard/generate"
            className="text-primary hover:underline"
          >
            Start Generating →
          </a>
        </div>
        <div className="p-6 rounded-lg bg-card border border-border">
          <h3 className="font-display text-xl font-semibold mb-2">Chat</h3>
          <p className="text-muted-foreground mb-4">
            Chat with your documents for insights
          </p>
          <a
            href="/dashboard/chat"
            className="text-primary hover:underline"
          >
            Start Chatting →
          </a>
        </div>
      </div>
    </div>
  );
}

