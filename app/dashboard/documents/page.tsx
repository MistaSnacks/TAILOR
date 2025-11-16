'use client';

import { useState } from 'react';

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        console.log('Upload result:', result);
      }

      // Refresh documents list
      // TODO: Fetch documents from Supabase
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
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
        {documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-lg bg-card border border-border flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold">{doc.file_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {doc.parse_status} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button className="text-destructive hover:underline">
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

