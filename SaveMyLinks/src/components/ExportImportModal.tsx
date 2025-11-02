import React, { useState, useRef } from 'react';
import { X, Download, Upload, FileText, FileCode, Copy, Check, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportLinksAsText, exportLinksAsJson, parseImportedText } from '../utils/linkUtils';
import type { AppContextType } from '../context/AppContext'; // Import the type

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportImportModal({ isOpen, onClose }: ExportImportModalProps) {
  const { links, importLinks } = useApp() as AppContextType;
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'text' | 'json'>('text');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error' | 'partial'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importedFileName, setImportedFileName] = useState(''); // New state for file name

  if (!isOpen) return null;

  const handleExport = () => {
    const data = exportFormat === 'text' 
      ? exportLinksAsText(links)
      : exportLinksAsJson(links);
    
    const blob = new Blob([data], { 
      type: exportFormat === 'text' ? 'text/plain' : 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `savemylinks-export.${exportFormat === 'text' ? 'txt' : 'json'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    const data = exportFormat === 'text' 
      ? exportLinksAsText(links)
      : exportLinksAsJson(links);
    
    try {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImportedFileName(''); // Clear file name if no file selected
      return;
    }

    setImportedFileName(file.name); // Set file name
    setIsImporting(true);
    setImportStatus('idle');
    setImportMessage('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      let importedCount = 0;
      let totalParsed = 0;

      try {
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData)) {
            totalParsed = jsonData.length;
            const successfullyImported = await importLinks(jsonData);
            importedCount = successfullyImported.length;
          } else {
            throw new Error('Invalid JSON format: Expected an array of links.');
          }
        } else {
          const parsed = parseImportedText(content);
          totalParsed = parsed.length;
          const successfullyImported = await importLinks(parsed);
          importedCount = successfullyImported.length;
        }

        if (importedCount === totalParsed && totalParsed > 0) {
          setImportStatus('success');
          setImportMessage(`Successfully imported ${importedCount} links.`);
        } else if (importedCount > 0 && importedCount < totalParsed) {
          setImportStatus('partial');
          setImportMessage(`Imported ${importedCount} of ${totalParsed} links. Some duplicates or invalid links were skipped.`);
        } else if (totalParsed === 0) {
          setImportStatus('error');
          setImportMessage('No valid links found in the file.');
        } else {
          setImportStatus('error');
          setImportMessage('Failed to import links.');
        }
      } catch (error: any) {
        setImportStatus('error');
        setImportMessage(`Error importing file: ${error.message || 'Unknown error'}`);
      } finally {
        setIsImporting(false);
        // Keep file name displayed until modal is closed or file is cleared manually
        setImportText(''); // Clear textarea after file import
      }
    };
    reader.readAsText(file);
  };

  // New function to clear the selected file
  const clearSelectedFile = () => {
    setImportedFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input element
    }
  };

  const handleTextImport = async () => {
    if (!importText.trim()) return;

    setIsImporting(true);
    setImportStatus('idle');
    setImportMessage('');

    let importedCount = 0;
    let totalParsed = 0;

    try {
      // Try parsing as JSON first
      const jsonData = JSON.parse(importText);
      if (Array.isArray(jsonData)) {
        totalParsed = jsonData.length;
        const successfullyImported = await importLinks(jsonData);
        importedCount = successfullyImported.length; // Assuming importLinks returns successfully imported count
      } else {
        throw new Error('Invalid JSON format: Expected an array of links.');
      }
    } catch (e) {
      // If not JSON, parse as text
      const parsed = parseImportedText(importText);
      totalParsed = parsed.length;
      if (parsed.length > 0) {
        const successfullyImported = await importLinks(parsed);
        importedCount = successfullyImported.length; // Assuming importLinks returns successfully imported count
      } else {
        setImportStatus('error');
        setImportMessage('No valid links found in the text.');
        setIsImporting(false);
        return;
      }
    }

    if (importedCount === totalParsed && totalParsed > 0) {
      setImportStatus('success');
      setImportMessage(`Successfully imported ${importedCount} links.`);
    } else if (importedCount > 0 && importedCount < totalParsed) {
      setImportStatus('partial');
      setImportMessage(`Imported ${importedCount} of ${totalParsed} links. Some duplicates or invalid links were skipped.`);
    } else if (totalParsed === 0) {
      setImportStatus('error');
      setImportMessage('No valid links found.');
    } else {
      setImportStatus('error');
      setImportMessage('Failed to import links.');
    }

    setIsImporting(false);
  };

  // New handler for closing the modal after feedback
  const handleClose = () => {
    onClose();
    setImportStatus('idle'); // Reset status on close
    setImportMessage('');
    setImportText('');
    setImportedFileName(''); // Clear file name on modal close
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-md w-full p-8 shadow-xl border border-[#232946] rounded-2xl">
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#334155]">
          <h2 className="heading-3">Export / Import Links</h2>
          <button onClick={handleClose} className="p-2 rounded hover:bg-input transition-colors" aria-label="Close modal">
            <X className="w-6 h-6 text-muted" />
          </button>
        </div>

        <div className="p-8">
          {/* Tabs */}
          <div className="flex border-b border-[#334155] mb-8">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
                          ${activeTab === 'export'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-muted hover:text-blue-400'
                          }`}
            >
              Export Links
            </button>
            <button
              onClick={() => {
                setActiveTab('import');
                // Reset import state when switching to import tab
                setImportStatus('idle');
                setImportMessage('');
                setImportText('');
                setImportedFileName(''); // Clear file name on tab switch
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors 
                          ${activeTab === 'import'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-muted hover:text-blue-400'
                          }`}
            >
              Import Links
            </button>
          </div>

          {activeTab === 'export' ? (
            <div className="space-y-8">
              <div>
                <p className="text-base font-medium font-sans text-main mb-4">
                  Export your {links.length} saved links to back them up or share with others.
                </p>
                
                <div className="space-y-8">
                  <div>
                    <label className="block text-base font-bold font-sans text-main mb-2">
                      Export Format
                    </label>
                    <div className="flex gap-8">
                      <label className="flex items-center font-bold text-main">
                        <input
                          type="radio"
                          value="text"
                          checked={exportFormat === 'text'}
                          onChange={(e) => setExportFormat(e.target.value as 'text')}
                          className="mr-2 rounded border-gray-300 dark:border-gray-600 text-primary-700 dark:text-primary-400 focus:ring-primary"
                        />
                        <FileText className="w-4 h-4 mr-2 text-gray-500" />
                        Plain Text
                      </label>
                      <label className="flex items-center font-bold text-main">
                        <input
                          type="radio"
                          value="json"
                          checked={exportFormat === 'json'}
                          onChange={(e) => setExportFormat(e.target.value as 'json')}
                          className="mr-2 rounded border-gray-300 dark:border-gray-600 text-primary-700 dark:text-primary-400 focus:ring-primary"
                        />
                        <FileCode className="w-4 h-4 mr-2 text-gray-500" />
                        JSON
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-8">
                    <button
                      onClick={handleExport}
                      className="btn btn-primary flex items-center gap-4"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </button>
                    <button
                      onClick={handleCopyToClipboard}
                      className="btn btn-secondary flex items-center gap-4"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  {copied && (
                    <div className="mt-3 w-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-300 text-center font-medium">
                      Copied to clipboard!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-base font-medium font-sans text-main mb-4">
                  Import links from a file or paste them directly. Supports both text and JSON formats.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-bold font-sans text-main mb-2">
                      Import from File
                    </label>
                    <div className="flex items-center gap-2">
                      {/* Hidden native file input */}
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.json"
                        onChange={handleFileImport}
                        className="sr-only"
                        disabled={isImporting}
                      />
                      {/* Custom styled file input button */}
                      <label
                        htmlFor="file-upload"
                        className={`btn btn-secondary flex items-center gap-2 cursor-pointer ${
                          isImporting ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        Choose File
                      </label>
                      {/* Display selected file name or 'No file chosen' */}
                      {importedFileName ? (
                        <span className="text-main body-sm flex items-center gap-1">
                          {importedFileName}
                          <button onClick={clearSelectedFile} className="text-muted hover:text-main text-lg font-bold ml-1 leading-none p-1 rounded-full" aria-label="Clear selected file">
                            &times;
                          </button>
                        </span>
                      ) : (
                        <span className="text-muted body-sm">No file chosen</span>
                      )}
                    </div>
                  </div>

                  <div className="text-center text-main">
                    or
                  </div>

                  <div>
                    <label className="block text-base font-bold font-sans text-main mb-2">
                      Or Paste Links Directly
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 border border-input-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-main placeholder-muted text-base resize-none"
                      placeholder="Paste your exported links here (text or JSON format)..."
                      disabled={isImporting}
                    />
                  </div>

                  <button
                    onClick={handleTextImport}
                    disabled={!importText.trim() || isImporting}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import Links
                      </>
                    )}
                  </button>
                  {importStatus !== 'idle' && (
                    <div className={`mt-3 w-full rounded-lg p-3 text-center font-medium ${
                      importStatus === 'success' ? 'bg-green-900/30 text-green-300' :
                      importStatus === 'error' ? 'bg-red-900/30 text-red-300' :
                      importStatus === 'partial' ? 'bg-yellow-900/30 text-yellow-300' : ''
                    }`}>
                      {importMessage}
                    </div>
                  )}
                  {importStatus !== 'idle' && (
                    <div className="mt-4 flex justify-end">
                      <button onClick={handleClose} className="btn btn-secondary">
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}