import React, { useState, useRef } from 'react';
import { X, Download, Upload, FileText, FileCode, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportLinksAsText, exportLinksAsJson, parseImportedText } from '../utils/linkUtils';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportImportModal({ isOpen, onClose }: ExportImportModalProps) {
  const { links, importLinks } = useApp();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'text' | 'json'>('text');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        try {
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData)) {
            importLinks(jsonData);
            onClose();
          }
        } catch (error) {
          alert('Invalid JSON file format');
        }
      } else {
        const parsed = parseImportedText(content);
        if (parsed.length > 0) {
          importLinks(parsed);
          onClose();
        } else {
          alert('No valid links found in the file');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleTextImport = () => {
    if (!importText.trim()) return;
    
    try {
      // Try parsing as JSON first
      const jsonData = JSON.parse(importText);
      if (Array.isArray(jsonData)) {
        importLinks(jsonData);
        onClose();
        return;
      }
    } catch {
      // If not JSON, parse as text
      const parsed = parseImportedText(importText);
      if (parsed.length > 0) {
        importLinks(parsed);
        onClose();
      } else {
        alert('No valid links found in the text');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold font-sans text-gray-900 dark:text-white mb-4">
            Export & Import Links
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Export Links
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Import Links
            </button>
          </div>

          {activeTab === 'export' ? (
            <div className="space-y-6">
              <div>
                <p className="text-base font-medium font-sans text-gray-600 dark:text-gray-400 mb-4">
                  Export your {links.length} saved links to back them up or share with others.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium font-sans text-gray-700 dark:text-gray-300 mb-2">
                      Export Format
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="text"
                          checked={exportFormat === 'text'}
                          onChange={(e) => setExportFormat(e.target.value as 'text')}
                          className="mr-2"
                        />
                        <FileText className="w-4 h-4 mr-2 text-gray-500" />
                        Plain Text
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="json"
                          checked={exportFormat === 'json'}
                          onChange={(e) => setExportFormat(e.target.value as 'json')}
                          className="mr-2"
                        />
                        <FileCode className="w-4 h-4 mr-2 text-gray-500" />
                        JSON
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download File
                    </button>
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-gray-700 dark:text-gray-300"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy to Clipboard
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
                <p className="text-base font-medium font-sans text-gray-600 dark:text-gray-400 mb-4">
                  Import links from a file or paste them directly. Supports both text and JSON formats.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-base font-medium font-sans text-gray-700 dark:text-gray-300 mb-2">
                      Import from File
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.json"
                      onChange={handleFileImport}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-medium
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        dark:file:bg-blue-900/30 dark:file:text-blue-300
                        dark:hover:file:bg-blue-900/50"
                    />
                  </div>

                  <div className="text-center text-gray-500 dark:text-gray-400">
                    or
                  </div>

                  <div>
                    <label className="block text-base font-medium font-sans text-gray-700 dark:text-gray-300 mb-2">
                      Paste Links Here
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                      placeholder="Paste your exported links here (text or JSON format)..."
                    />
                  </div>

                  <button
                    onClick={handleTextImport}
                    disabled={!importText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Import Links
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExportImportModal;