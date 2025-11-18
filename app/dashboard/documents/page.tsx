'use client';

import { useState, useEffect } from 'react';

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      console.log('📄 Fetching documents...');
      const response = await fetch('/api/upload');
      
      if (response.ok) {
        const data = await response.json();
        console.log('📄 Documents fetched:', data.documents?.length || 0);
        setDocuments(data.documents || []);
      } else {
        console.error('Failed to fetch documents:', response.status);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        console.log('📤 Uploading file:', file.name);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();
        console.log('✅ Upload result:', result);
      }

      // Refresh documents list
      await fetchDocuments();
      alert('Files uploaded successfully!');
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      alert(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      // TODO: Implement delete endpoint
      console.log('Deleting document:', docId);
      alert('Delete functionality coming soon!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-6">Documents</h1>
      
      {/* Upload area */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <div className="text-6xl mb-4">📄</div>
            <h3 className="font-display text-xl font-semibold mb-2">
              {uploading ? 'Uploading...' : 'Upload Documents'}
            </h3>
            <p className="text-muted-foreground">
              Drag and drop or click to upload PDF or DOCX files
            </p>
          </label>
        </div>
      </div>

      {/* Documents list */}
      <div>
        <h2 className="font-display text-2xl font-semibold mb-4">Your Documents</h2>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No documents uploaded yet. Upload your resume or LinkedIn profile to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-lg bg-card border border-border flex items-center justify-between hover:border-primary/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{doc.file_name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${
                      doc.parse_status === 'completed' 
                        ? 'bg-green-500/20 text-green-400'
                        : doc.parse_status === 'processing'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {doc.parse_status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {doc.file_type} • {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

