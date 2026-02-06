"use client";
import { Download, FileJson, FileText, Table, BookOpen } from "lucide-react";
import { useState } from "react";
import type { AnalysisResult } from "../lib/services/AnalysisPipeline";

interface ExportMenuProps {
  analysis: AnalysisResult;
  quality?: any;
}

export function ExportMenu({ analysis, quality }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'json' | 'markdown' | 'csv' | 'notion') => {
    setExporting(format);
    
    try {
      const { ExportService } = await import('../lib/export/ExportService');
      ExportService.exportAnalysis(analysis, format, quality);
      
      setTimeout(() => setExporting(null), 1000);
    } catch (error) {
      console.error('Export failed:', error);
      setExporting(null);
    }
  };

  const exportOptions = [
    {
      format: 'markdown' as const,
      label: 'Markdown Report',
      icon: FileText,
      description: 'Full formatted report',
      color: 'text-blue-600'
    },
    {
      format: 'json' as const,
      label: 'JSON Data',
      icon: FileJson,
      description: 'Complete data structure',
      color: 'text-purple-600'
    },
    {
      format: 'csv' as const,
      label: 'CSV (Targets)',
      icon: Table,
      description: 'Engagement targets spreadsheet',
      color: 'text-green-600'
    },
    {
      format: 'notion' as const,
      label: 'Notion Format',
      icon: BookOpen,
      description: 'Import into Notion',
      color: 'text-gray-600'
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface-elevated transition-colors"
      >
        <Download className="w-4 h-4" />
        <span className="font-medium">Export</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-up">
            <div className="p-3 border-b border-border bg-muted/20">
              <h3 className="font-semibold text-sm text-foreground">
                Export Analysis
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose your export format
              </p>
            </div>

            <div className="p-2">
              {exportOptions.map(({ format, label, icon: Icon, description, color }) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={exporting === format}
                  className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors disabled:opacity-50 text-left group"
                >
                  <div className={`p-2 rounded-lg bg-muted/50 ${color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {exporting === format ? 'Exporting...' : description}
                    </div>
                  </div>

                  {exporting === format && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                 Tip: Use Markdown for sharing, JSON for archiving, CSV for spreadsheets
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}