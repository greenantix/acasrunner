"use client";

import { useState } from "react";
import { ChatSession, ExportFormat, MarkdownExportOptions, HTMLExportOptions } from "@/types/chat";
import { exportService, ExportService } from "@/services/export-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Download, 
  FileText, 
  Code, 
  Globe, 
  FileImage,
  File,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExportDialogProps {
  session: ChatSession;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ session, isOpen, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState({
    includeMetadata: true,
    includeTimestamps: true,
    codeBlockLanguage: 'auto',
    headerLevel: 1,
    includeCSS: true,
    darkMode: false
  });

  const formatOptions = [
    {
      value: 'markdown' as ExportFormat,
      label: 'Markdown',
      description: 'Clean, readable format for documentation',
      icon: <FileText className="h-4 w-4" />,
      extension: '.md',
      available: true
    },
    {
      value: 'json' as ExportFormat,
      label: 'JSON',
      description: 'Complete data structure with metadata',
      icon: <Code className="h-4 w-4" />,
      extension: '.json',
      available: true
    },
    {
      value: 'html' as ExportFormat,
      label: 'HTML',
      description: 'Rich format with styling',
      icon: <Globe className="h-4 w-4" />,
      extension: '.html',
      available: true
    },
    {
      value: 'plaintext' as ExportFormat,
      label: 'Plain Text',
      description: 'Simple text format',
      icon: <File className="h-4 w-4" />,
      extension: '.txt',
      available: true
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF',
      description: 'Professional document format',
      icon: <FileImage className="h-4 w-4" />,
      extension: '.pdf',
      available: false // Not yet implemented
    },
    {
      value: 'docx' as ExportFormat,
      label: 'Word Document',
      description: 'Business-ready format',
      icon: <FileImage className="h-4 w-4" />,
      extension: '.docx',
      available: false // Not yet implemented
    }
  ];

  const selectedFormatOption = formatOptions.find(f => f.value === format);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let result: string | Buffer;
      let filename = `${session.name.replace(/[^a-z0-9]/gi, '_')}${selectedFormatOption?.extension}`;
      let mimeType: string;

      switch (format) {
        case 'markdown':
          result = await exportService.exportToMarkdown(session.id, {
            includeMetadata: options.includeMetadata,
            includeTimestamps: options.includeTimestamps,
            codeBlockLanguage: options.codeBlockLanguage,
            headerLevel: options.headerLevel
          });
          mimeType = 'text/markdown';
          break;
          
        case 'json':
          result = await exportService.exportToJSON(session.id, options.includeMetadata);
          mimeType = 'application/json';
          break;
          
        case 'html':
          result = await exportService.exportToHTML(session.id, {
            includeCSS: options.includeCSS,
            darkMode: options.darkMode,
            includeMetadata: options.includeMetadata
          });
          mimeType = 'text/html';
          break;
          
        case 'plaintext':
          result = await exportService.exportToPlaintext(session.id);
          mimeType = 'text/plain';
          break;
          
        default:
          throw new Error(`Export format ${format} not yet implemented`);
      }

      // Trigger download
      ExportService.downloadFile(result, filename, mimeType);
      
      toast({
        title: "Export Successful",
        description: `Session exported as ${filename}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = (key: string, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Conversation
          </DialogTitle>
          <DialogDescription>
            Export "{session.name}" to your preferred format
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {formatOptions.map((formatOption) => (
                <div
                  key={formatOption.value}
                  className={`relative rounded-lg border p-3 cursor-pointer transition-colors ${
                    format === formatOption.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  } ${!formatOption.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => formatOption.available && setFormat(formatOption.value)}
                >
                  <div className="flex items-center space-x-3">
                    {formatOption.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{formatOption.label}</p>
                        {!formatOption.available && (
                          <Badge variant="secondary" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatOption.description}
                      </p>
                    </div>
                    {format === formatOption.value && formatOption.available && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                    {!formatOption.available && (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Format-specific Options */}
          <div>
            <Label className="text-base font-medium">Export Options</Label>
            <div className="space-y-4 mt-3">
              {/* Common Options */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => updateOption('includeMetadata', checked)}
                />
                <Label htmlFor="includeMetadata" className="text-sm">
                  Include metadata (creation date, provider, model, etc.)
                </Label>
              </div>

              {(format === 'markdown' || format === 'html') && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTimestamps"
                    checked={options.includeTimestamps}
                    onCheckedChange={(checked) => updateOption('includeTimestamps', checked)}
                  />
                  <Label htmlFor="includeTimestamps" className="text-sm">
                    Include message timestamps
                  </Label>
                </div>
              )}

              {/* Markdown-specific options */}
              {format === 'markdown' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="headerLevel" className="text-sm min-w-fit">
                      Header level:
                    </Label>
                    <Select
                      value={options.headerLevel.toString()}
                      onValueChange={(value) => updateOption('headerLevel', parseInt(value))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">H1</SelectItem>
                        <SelectItem value="2">H2</SelectItem>
                        <SelectItem value="3">H3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="codeLanguage" className="text-sm min-w-fit">
                      Code language:
                    </Label>
                    <Input
                      id="codeLanguage"
                      value={options.codeBlockLanguage}
                      onChange={(e) => updateOption('codeBlockLanguage', e.target.value)}
                      placeholder="auto"
                      className="w-32"
                    />
                  </div>
                </div>
              )}

              {/* HTML-specific options */}
              {format === 'html' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCSS"
                      checked={options.includeCSS}
                      onCheckedChange={(checked) => updateOption('includeCSS', checked)}
                    />
                    <Label htmlFor="includeCSS" className="text-sm">
                      Include CSS styling
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="darkMode"
                      checked={options.darkMode}
                      onCheckedChange={(checked) => updateOption('darkMode', checked)}
                    />
                    <Label htmlFor="darkMode" className="text-sm">
                      Use dark theme
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Export Preview</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Session: {session.name}</p>
              <p>Messages: {session.metadata.messageCount}</p>
              <p>Provider: {session.provider} ({session.model})</p>
              <p>Format: {selectedFormatOption?.label} ({selectedFormatOption?.extension})</p>
              {session.metadata.totalTokens && (
                <p>Tokens: {session.metadata.totalTokens}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || !selectedFormatOption?.available}
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedFormatOption?.label}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}