'use client';

import { useState, useEffect, useCallback } from 'react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Trash2, CheckCircle, AlertCircle, FileType } from 'lucide-react';

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
      // alert('Files uploaded successfully!');
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
      // Optimistic update
      setDocuments(prev => prev.filter(d => d.id !== docId));
      console.log('🗑️ Deleting document:', docId);

      const response = await fetch(`/api/upload?id=${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
        // Revert optimistic update on failure
        fetchDocuments();
      }

      console.log('✅ Document deleted successfully');
    } catch (error: any) {
      console.error('❌ Delete error:', error);
      alert(error.message || 'Failed to delete document');
      fetchDocuments(); // Revert on error
    }
  };

  if (uploading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <TailorLoading mode="upload" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-xl">
          <UploadCloud className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold font-display">Documents</h1>
          <p className="text-muted-foreground">
            Upload your existing resumes or LinkedIn profiles to extract your experience.
          </p>
        </div>
      </div>

      {/* Upload area with drag and drop */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-12"
      >
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative overflow-hidden
            border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
            ${isDragging
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-xl'
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }
            glass-card
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
            className={`cursor-pointer block relative z-10 ${uploading ? 'pointer-events-none' : ''}`}
          >
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-300 ${isDragging ? 'scale-110 bg-primary/20' : ''}`}>
              <UploadCloud className={`w-10 h-10 text-primary transition-all duration-300 ${isDragging ? 'scale-110' : ''}`} />
            </div>
            <h3 className="font-display text-2xl font-semibold mb-3">
              {isDragging ? 'Drop files here!' : 'Upload Documents'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {isDragging
                ? 'Release to upload your files instantly'
                : 'Drag and drop your PDF or DOCX files here, or click to browse'
              }
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <FileType className="w-3 h-3" /> PDF
              </span>
              <span className="flex items-center gap-1">
                <FileType className="w-3 h-3" /> DOCX
              </span>
            </div>
          </label>
        </div>
      </motion.div>

      {/* Documents list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="font-display text-2xl font-semibold mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Your Documents
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <TailorLoading mode="general" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-xl border border-dashed border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground">
              Upload your resume to start building your profile.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl glass-card border border-border flex items-center justify-between hover:border-primary/50 transition-all hover:shadow-md group"
                >
                  <div className="flex-1 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{doc.file_name}</h3>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${doc.parse_status === 'completed'
                          ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                          : doc.parse_status === 'processing'
                            ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                            : 'bg-red-500/10 text-red-600 border border-red-500/20'
                          }`}>
                          {doc.parse_status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {doc.parse_status === 'processing' && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />}
                          {doc.parse_status === 'failed' && <AlertCircle className="w-3 h-3" />}
                          <span className="capitalize">{doc.parse_status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="uppercase">{doc.file_type.split('/').pop()}</span>
                        <span>•</span>
                        <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id, doc.file_name)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
