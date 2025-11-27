'use client';

import { useState, useEffect, useCallback } from 'react';

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

  // Shared upload logic for both click and drag-drop
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Filter for valid file types
    const validFiles = fileArray.filter(file => {
      const isValid = file.type === 'application/pdf' || 
                      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                      file.name.endsWith('.pdf') || 
                      file.name.endsWith('.docx');
      if (!isValid) {
        console.warn(`⚠️ Skipping invalid file type: ${file.name} (${file.type})`);
      }
      return isValid;
    });

    if (validFiles.length === 0) {
      alert('Please upload PDF or DOCX files only.');
      return;
    }

    console.log('📤 File upload initiated:', validFiles.length, 'file(s)');
    setUploading(true);

    try {
      for (const file of validFiles) {
        console.log('📤 Uploading file:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
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
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.warn('⚠️ No files selected');
      return;
    }
    await uploadFiles(files);
    // Reset file input to allow re-uploading the same file
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  }, [uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (uploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  }, [uploading, uploadFiles]);

  const handleDelete = async (docId: string, fileName: string) => {
    const confirmMessage = `Delete "${fileName}"? This will also remove all processed data from this document. This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      console.log('🗑️ Deleting document:', docId);

      const response = await fetch(`/api/upload?id=${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      console.log('✅ Document deleted successfully');

      // Remove from local state immediately
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      alert(error.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl font-bold mb-6">Documents</h1>

      {/* Upload area with drag and drop */}
      <div className="mb-8">
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200
            ${isDragging 
              ? 'border-primary bg-primary/10 scale-[1.02]' 
              : 'border-border hover:border-primary/50'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
            onClick={(e) => {
              // Reset value on click to allow re-selecting the same file
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer block ${uploading ? 'pointer-events-none' : ''}`}
          >
            <div className={`text-6xl mb-4 transition-transform duration-200 ${isDragging ? 'scale-110' : ''}`}>
              {isDragging ? '📥' : '📄'}
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">
              {uploading ? 'Uploading...' : isDragging ? 'Drop files here!' : 'Upload Documents'}
            </h3>
            <p className="text-muted-foreground">
              {isDragging 
                ? 'Release to upload your files' 
                : 'Drag and drop or click to upload PDF or DOCX files'
              }
            </p>
            {!uploading && !isDragging && (
              <p className="text-xs text-muted-foreground/60 mt-2">
                Supports multiple files
              </p>
            )}
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
                    <span className={`px-2 py-1 text-xs rounded ${doc.parse_status === 'completed'
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
                  onClick={() => handleDelete(doc.id, doc.file_name)}
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

