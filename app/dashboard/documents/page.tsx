'use client';

import { useState, useEffect, useCallback } from 'react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Trash2, CheckCircle, AlertCircle, FileType, Calendar, HardDrive } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// Proper type interface for documents
export interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  parse_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at?: string;
  storage_path?: string | null;
  source_resume_id?: string | null;
}

interface DocumentsResponse {
  documents: Document[];
}

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/upload');

      if (response.ok) {
        const data = await response.json() as DocumentsResponse;
        setDocuments(data.documents || []);
      }
    } catch (error) {
      // Silent fail - UI will show empty state
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
      return isValid;
    });

    if (validFiles.length === 0) {
      alert('Please upload PDF or DOCX files only.');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
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
        return response;
      });

      await Promise.all(uploadPromises);
      await fetchDocuments();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
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
    const confirmMessage = `Delete "${fileName}"? This will also remove all processed data. This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingId(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));

      const response = await fetch(`/api/upload?id=${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete document';
      alert(errorMessage);
      fetchDocuments();
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusConfig = (status: Document['parse_status']) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="w-3.5 h-3.5" />,
          label: 'Processed',
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
        };
      case 'processing':
        return {
          icon: <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />,
          label: 'Processing',
          className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'Failed',
          className: 'bg-red-500/10 text-red-600 border-red-500/20',
        };
      default:
        return {
          icon: <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground animate-pulse" />,
          label: 'Pending',
          className: 'bg-muted text-muted-foreground border-border',
        };
    }
  };

  if (uploading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <TailorLoading mode="upload" />
      </div>
    );
  }

  return (
    <motion.div
      {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } })}
      className="container mx-auto px-4 py-4 md:py-8 max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-xl flex-shrink-0">
          <UploadCloud className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload resumes to build your profile.
          </p>
        </div>
      </div>

      {/* Upload area - Compact on mobile */}
      <motion.div
        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { delay: 0.1 } })}
        className="mb-6 md:mb-8"
      >
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative overflow-hidden
            border-2 border-dashed rounded-xl p-6 md:p-10 text-center transition-all duration-300
            ${isDragging
              ? 'border-primary bg-primary/5 scale-[1.01] shadow-lg'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 active:bg-muted/50'
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
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer block relative z-10 ${uploading ? 'pointer-events-none' : ''}`}
          >
            <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-300 ${isDragging ? 'scale-110 bg-primary/20' : ''}`}>
              <UploadCloud className={`w-7 h-7 md:w-8 md:h-8 text-primary transition-all duration-300 ${isDragging ? 'scale-110' : ''}`} />
            </div>
            <h3 className="font-display text-lg md:text-xl font-semibold mb-2">
              {isDragging ? 'Drop here!' : 'Upload Documents'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tap to browse or drag & drop
            </p>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-full text-xs text-muted-foreground">
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
        {...(prefersReducedMotion ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.2 } })}
      >
        <h2 className="font-display text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Your Documents
          {documents.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">({documents.length})</span>
          )}
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <TailorLoading mode="general" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 md:py-14 glass-card rounded-xl border border-dashed border-border">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-semibold mb-1">No documents yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your resume to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {documents.map((doc, index) => {
                const status = getStatusConfig(doc.parse_status);
                const isDeleting = deletingId === doc.id;
                
                return (
                  <motion.div
                    key={doc.id}
                    {...(prefersReducedMotion ? {} : {
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 },
                      exit: { opacity: 0, x: -20 },
                      transition: { delay: index * 0.03 }
                    })}
                    className={`glass-card rounded-xl border border-border overflow-hidden transition-all ${
                      isDeleting ? 'opacity-50' : 'hover:border-primary/30 hover:shadow-md'
                    }`}
                  >
                    {/* Main content area - tappable */}
                    <div className="p-4">
                      {/* Top row: Icon + File name + Status */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-tight mb-1 break-words">
                            {doc.file_name}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${status.className}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Bottom row: Metadata + Delete button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {(doc.file_size / 1024).toFixed(0)} KB
                          </span>
                          <span className="uppercase font-medium">
                            {doc.file_type.split('/').pop()?.replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx')}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(doc.id, doc.file_name)}
                          disabled={isDeleting}
                          className="p-2.5 -mr-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all active:scale-95"
                          title="Delete document"
                        >
                          {isDeleting ? (
                            <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
