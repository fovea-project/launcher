import * as React from "react";
import JSZip from "jszip";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Folder, Folder2Open, FileEarmarkText, FileEarmarkCode, ArrowRepeat } from "react-bootstrap-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DownloadBundle } from "@/types/api";
import { decryptBundle } from "@/lib/crypto";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  content?: string;
  size?: number;
  children?: FileNode[];
}

export function ProjectViewer({
  bundle,
  open,
  onOpenChange,
}: {
  bundle: DownloadBundle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [files, setFiles] = React.useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = React.useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!open || !bundle) return;
    
    let isMounted = true;
    const loadZip = async () => {
      try {
        setLoading(true);
        setError(null);
        setFiles([]);
        setSelectedFile(null);

        // Decrypt the bundle using WebCrypto API
        const rawBytes = await decryptBundle(bundle);

        // Load the bytes into JSZip
        const zip = new JSZip();
        await zip.loadAsync(rawBytes);

        // Build a hierarchical file tree
        const root: FileNode[] = [];
        const dirMap = new Map<string, FileNode[]>();
        dirMap.set("", root);

        const paths = Object.keys(zip.files).sort();

        for (const path of paths) {
          const zipEntry = zip.files[path];
          // JSZip paths use forward slashes.
          const parts = path.split("/").filter(Boolean);
          const name = parts[parts.length - 1];
          const isDir = zipEntry.dir;
          
          let currentLevel = root;
          let currentPath = "";

          for (let i = 0; i < parts.length - 1; i++) {
            currentPath += (currentPath ? "/" : "") + parts[i];
            if (!dirMap.has(currentPath)) {
              const newDir: FileNode = { name: parts[i], path: currentPath, isDir: true, children: [] };
              currentLevel.push(newDir);
              dirMap.set(currentPath, newDir.children!);
            }
            currentLevel = dirMap.get(currentPath)!;
          }

          if (isDir) {
            const dirPath = currentPath ? currentPath + "/" + name : name;
            if (!dirMap.has(dirPath)) {
              const newDir: FileNode = { name, path: dirPath, isDir: true, children: [] };
              currentLevel.push(newDir);
              dirMap.set(dirPath, newDir.children!);
            }
          } else {
            // Read content if it's text (limit size to avoid freezing on huge binaries)
            const ext = name.split(".").pop()?.toLowerCase() || "";
            const isBinary = ["png", "jpg", "jpeg", "gif", "ico", "exe", "dll", "bin", "wasm"].includes(ext);
            
            // Only extract text for files under 2MB
            if (!isBinary) {
               // We defer reading actual text content until clicked to save memory and time
            }

            currentLevel.push({
              name,
              path,
              isDir: false,
            });
          }
        }

        if (isMounted) {
          setFiles(root);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to read project archive.");
          setLoading(false);
        }
      }
    };

    loadZip();
    return () => { isMounted = false; };
  }, [bundle, open]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleSelectFile = async (node: FileNode) => {
    if (node.isDir) {
      toggleFolder(node.path);
      return;
    }

    if (node.content !== undefined) {
      setSelectedFile(node);
      return;
    }

    // Load content on demand
    try {
      const zip = new JSZip();
      const rawBytes = await decryptBundle(bundle!);
      await zip.loadAsync(rawBytes);
      const zipEntry = zip.file(node.path);
      
      if (zipEntry) {
        const ext = node.name.split(".").pop()?.toLowerCase() || "";
        const isBinary = ["png", "jpg", "jpeg", "gif", "ico", "exe", "dll", "bin", "wasm"].includes(ext);
        
        if (isBinary) {
           node.content = `/* Binary file: ${node.name} */`;
        } else {
           node.content = await zipEntry.async("string");
        }
      } else {
        node.content = "/* File not found in archive */";
      }
      setSelectedFile({ ...node });
    } catch (e) {
      console.error(e);
      node.content = "/* Failed to load file content */";
      setSelectedFile({ ...node });
    }
  };

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return (
      <div className="space-y-0.5">
        {nodes.map((node) => {
          const isExpanded = expandedFolders.has(node.path);
          const isSelected = selectedFile?.path === node.path;
          
          return (
            <div key={node.path}>
              <div
                onClick={() => handleSelectFile(node)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-foreground/80",
                  node.isDir && "font-medium"
                )}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                {node.isDir ? (
                  isExpanded ? <Folder2Open className="size-4 shrink-0 text-blue-400" /> : <Folder className="size-4 shrink-0 text-blue-400" />
                ) : (
                  <FileEarmarkCode className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{node.name}</span>
              </div>
              {node.isDir && isExpanded && node.children && (
                <div>{renderTree(node.children, depth + 1)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts": case "tsx": return "typescript";
      case "js": case "jsx": return "javascript";
      case "rs": return "rust";
      case "py": return "python";
      case "go": return "go";
      case "html": return "html";
      case "css": return "css";
      case "json": return "json";
      case "md": return "markdown";
      case "sh": return "bash";
      case "cpp": case "cxx": case "h": case "hpp": return "cpp";
      case "c": return "c";
      default: return "text";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden flex flex-col bg-background/95 backdrop-blur border-border/50">
        <DialogHeader className="px-4 py-3 border-b bg-muted/20 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Folder2Open className="size-5 text-primary" />
            {bundle?.filename || "Project Viewer"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {loading ? (
            <div className="flex w-full items-center justify-center text-muted-foreground flex-col gap-3">
              <ArrowRepeat className="size-8 animate-spin text-primary" />
              <p>Decrypting and parsing archive...</p>
            </div>
          ) : error ? (
            <div className="flex w-full items-center justify-center text-destructive">
              {error}
            </div>
          ) : (
            <>
              {/* File Tree Sidebar */}
              <div className="w-64 shrink-0 overflow-y-auto border-r border-border bg-card/30 p-2">
                {renderTree(files)}
              </div>

              {/* Code Editor Area */}
              <div className="flex-1 overflow-hidden flex flex-col bg-[#1e1e1e]">
                {selectedFile ? (
                  <>
                    <div className="flex items-center border-b border-white/10 bg-[#2d2d2d] px-4 py-2 text-sm text-white/80 shrink-0">
                      <FileEarmarkCode className="mr-2 size-4" />
                      {selectedFile.path}
                    </div>
                    <div className="flex-1 overflow-auto">
                      <SyntaxHighlighter
                        language={getLanguage(selectedFile.name)}
                        style={vscDarkPlus}
                        showLineNumbers
                        customStyle={{ margin: 0, background: "transparent", fontSize: "0.875rem" }}
                      >
                        {selectedFile.content || "Loading content..."}
                      </SyntaxHighlighter>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-white/40 flex-col gap-3">
                    <FileEarmarkText className="size-16 opacity-20" />
                    <p>Select a file to view its code</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
