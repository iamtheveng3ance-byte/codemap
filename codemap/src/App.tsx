import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type NodeProps,
} from '@xyflow/react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Box,
  Check,
  ChevronRight,
  FileCode2,
  FolderOpen,
  GitBranch,
  LoaderCircle,
  Network,
  Package,
  Search,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react'
import { buildGraph, type GraphNode } from './lib/buildGraph'
import { demoFiles } from './lib/demo'
import { layoutGraph, type CodeFlowNode } from './lib/layout'
import { readFiles } from './lib/readFiles'
import '@xyflow/react/dist/style.css'

const nodeTypes = { codeFile: CodeFileNode }

function CodeFileNode({ data, selected }: NodeProps<CodeFlowNode>) {
  const fileName = data.id.split('/').at(-1) ?? data.id
  const directory = data.id.split('/').slice(0, -1).join('/') || '.'

  return (
    <article className={`file-node${selected ? ' is-selected' : ''}${data.dimmed ? ' is-dimmed' : ''}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <span className="file-node-icon"><FileCode2 size={17} /></span>
      <span className="file-node-copy">
        <strong title={data.id}>{fileName}</strong>
        <small title={directory}>{directory}</small>
      </span>
      <span className="node-count">{data.imports.length}<span> imports</span></span>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </article>
  )
}

function App() {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: ReturnType<typeof buildGraph>['edges'] }>({ nodes: [], edges: [] })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [connectedOnly, setConnectedOnly] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '')
    inputRef.current?.setAttribute('directory', '')
  }, [])

  const positioned = useMemo(
    () => (graph.nodes.length ? layoutGraph(graph) : { nodes: [], edges: [] }),
    [graph],
  )
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const matchedIds = useMemo(() => new Set(
    normalizedSearch
      ? graph.nodes.filter((node) => node.id.toLowerCase().includes(normalizedSearch)).map((node) => node.id)
      : [],
  ), [graph.nodes, normalizedSearch])
  const visibleIds = useMemo(() => new Set(
    graph.nodes
      .filter((node) => !connectedOnly || node.imports.length + node.importedBy.length > 0)
      .map((node) => node.id),
  ), [graph.nodes, connectedOnly])
  const selectedNode = graph.nodes.find((node) => node.id === selectedId) ?? null
  const connectedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    return new Set([selectedNode.id, ...selectedNode.imports, ...selectedNode.importedBy])
  }, [selectedNode])
  const flowNodes = useMemo(
    () => positioned.nodes.filter((node) => visibleIds.has(node.id)).map((node) => ({
      ...node,
      selected: node.id === selectedId,
      data: {
        ...node.data,
        dimmed: normalizedSearch ? !matchedIds.has(node.id) : selectedId !== null && !connectedIds.has(node.id),
        searchMatch: normalizedSearch.length > 0 && matchedIds.has(node.id),
      },
    })),
    [positioned.nodes, visibleIds, selectedId, connectedIds, normalizedSearch, matchedIds],
  )
  const flowEdges = useMemo(
    () => positioned.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)).map((edge) => {
      const highlighted = selectedId !== null && (edge.source === selectedId || edge.target === selectedId)
      const searchHighlighted = normalizedSearch.length > 0 && (matchedIds.has(edge.source) || matchedIds.has(edge.target))
      const active = highlighted || searchHighlighted
      return {
        ...edge,
        animated: active,
        style: {
          stroke: highlighted ? '#ffc857' : searchHighlighted ? '#60d99b' : selectedId || normalizedSearch ? '#364158' : '#65728d',
          strokeWidth: active ? 2.6 : 1.6,
          opacity: (selectedId || normalizedSearch) && !active ? 0.18 : 0.9,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: highlighted ? '#ffc857' : searchHighlighted ? '#60d99b' : selectedId || normalizedSearch ? '#364158' : '#65728d',
          width: 14,
          height: 14,
        },
      }
    }),
    [positioned.edges, visibleIds, selectedId, normalizedSearch, matchedIds],
  )
  const projectStats = useMemo(() => {
    const byImported = [...graph.nodes].sort((a, b) => b.importedBy.length - a.importedBy.length)
    const byImports = [...graph.nodes].sort((a, b) => b.imports.length - a.imports.length)
    const packageCounts = new Map<string, number>()
    for (const node of graph.nodes) {
      for (const dependency of node.externalDeps) {
        packageCounts.set(dependency, (packageCounts.get(dependency) ?? 0) + 1)
      }
    }
    return {
      mostImported: byImported.filter((node) => node.importedBy.length > 0).slice(0, 4),
      topImporters: byImports.filter((node) => node.imports.length > 0).slice(0, 4),
      topPackages: [...packageCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      isolated: graph.nodes.filter((node) => node.imports.length === 0 && node.importedBy.length === 0),
      connectedCount: graph.nodes.filter((node) => node.imports.length + node.importedBy.length > 0).length,
    }
  }, [graph.nodes])

  function loadDemo() {
    setGraph(buildGraph(demoFiles))
    setFolderName('Demo project')
    setSelectedId(null)
    setSearchTerm('')
    setConnectedOnly(false)
    setError('')
  }

  async function handleFolderChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const files = input.files
    if (!files?.length) return

    setIsReading(true)
    setError('')
    setSelectedId(null)
    setSearchTerm('')
    setConnectedOnly(false)
    try {
      const fileContents = await readFiles(files)
      const result = buildGraph(fileContents)
      if (!result.nodes.length) {
        setError('Is folder mein koi supported JavaScript ya TypeScript source file nahi mili.')
        setGraph({ nodes: [], edges: [] })
        setFolderName('')
      } else {
        setGraph(result)
        setFolderName(files[0].webkitRelativePath?.split('/')[0] || 'Selected folder')
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Folder parhne mein masla hua.')
    } finally {
      setIsReading(false)
      input.value = ''
    }
  }

  function selectFile(id: string) {
    if (graph.nodes.some((node) => node.id === id)) setSelectedId(id)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CodeMap home">
          <span className="brand-mark"><Network size={19} strokeWidth={2.3} /></span>
          <span>code<span className="brand-accent">map</span></span>
          <span className="brand-version">BETA</span>
        </a>
        <div className="topbar-right">
          <span className="privacy-badge"><ShieldCheck size={14} /> Local only</span>
          <button className="button button-quiet" onClick={loadDemo} type="button">
            <Sparkles size={15} /> Demo
          </button>
          {graph.nodes.length > 0 && (
            <button className="button button-quiet" onClick={() => inputRef.current?.click()} type="button">
              <RefreshCw size={15} /> Change folder
            </button>
          )}
          <input ref={inputRef} className="visually-hidden" type="file" multiple onChange={handleFolderChange} />
        </div>
      </header>

      <section className="workspace">
        <div className="graph-area">
          {graph.nodes.length === 0 ? (
            <div className="welcome-state">
              <div className="welcome-orbit orbit-one" />
              <div className="welcome-orbit orbit-two" />
              <div className="welcome-icon"><Network size={30} /></div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR CODEBASE, MAPPED</div>
              <h1>See how your code<br /><span>fits together.</span></h1>
              <p className="welcome-description">Choose a project folder to turn imports and dependencies into an interactive map.</p>
              <div className="welcome-actions">
                <button className="button button-primary choose-folder" onClick={() => inputRef.current?.click()} disabled={isReading} type="button">
                  {isReading ? <LoaderCircle className="spin" size={18} /> : <FolderOpen size={18} />}
                  {isReading ? 'Reading files…' : 'Choose a folder'}
                  {!isReading && <ChevronRight size={17} />}
                </button>
                <button className="button button-demo" onClick={loadDemo} type="button"><Sparkles size={16} /> Explore the demo</button>
              </div>
              <div className="privacy-note"><ShieldCheck size={15} /> Files are read locally and never leave your browser.</div>
              {error && <div className="error-message" role="alert">{error}</div>}
              <div className="welcome-footnote"><span><Check size={13} /> JavaScript</span><span><Check size={13} /> TypeScript</span><span><Check size={13} /> JSX / TSX</span></div>
            </div>
          ) : (
            <>
              <div className="canvas-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> PROJECT MAP</div>
                  <h1>{folderName || 'Codebase'}</h1>
                </div>
                <div className="graph-stats">
                  <span><FileCode2 size={15} /> <b>{graph.nodes.length}</b> files</span>
                  <span><GitBranch size={15} /> <b>{graph.edges.length}</b> connections</span>
                </div>
              </div>
              <div className="map-toolbar">
                <label className="search-input">
                  <Search size={16} />
                  <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search files…" aria-label="Search files" />
                  {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear search"><X size={14} /></button>}
                </label>
                <button className={`filter-button${connectedOnly ? ' is-active' : ''}`} type="button" aria-pressed={connectedOnly} onClick={() => setConnectedOnly((value) => !value)}>
                  <SlidersHorizontal size={14} /> Connected only <span>{projectStats.connectedCount}</span>
                </button>
                {normalizedSearch && <span className="search-count">{matchedIds.size} match{matchedIds.size === 1 ? '' : 'es'}</span>}
              </div>
              {error && <div className="error-toast" role="alert">{error}<button onClick={() => setError('')} type="button" aria-label="Dismiss"><X size={14} /></button></div>}
              <div className="flow-canvas">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  onNodeClick={(_event, node) => setSelectedId(node.id)}
                  onPaneClick={() => setSelectedId(null)}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  fitView
                  fitViewOptions={{ padding: 0.28, minZoom: 0.3, maxZoom: 1.2 }}
                  minZoom={0.15}
                  maxZoom={1.6}
                >
                  <Background color="#28344a" gap={24} size={1} />
                  <MiniMap className="flow-minimap" nodeColor="#7586a5" maskColor="rgba(10, 15, 25, 0.72)" />
                  <Controls className="flow-controls" showInteractive={false} />
                </ReactFlow>
                <div className="canvas-hint"><span className="hint-key">Click</span> a file to inspect <span className="hint-separator">·</span> <span className="hint-key">Scroll</span> to zoom</div>
              </div>
            </>
          )}
        </div>

        {graph.nodes.length > 0 && (selectedNode ? (
          <aside className="details-panel">
            <div className="panel-heading">
              <div className="panel-kicker">FILE DETAILS</div>
              <button className="icon-button" onClick={() => setSelectedId(null)} type="button" aria-label="Close details"><X size={17} /></button>
            </div>
            <div className="selected-file">
              <span className="selected-file-icon"><FileCode2 size={19} /></span>
              <div className="selected-file-copy"><strong>{selectedNode.id.split('/').at(-1)}</strong><small title={selectedNode.id}>{selectedNode.id}</small></div>
            </div>
            <div className="detail-divider" />
            <DetailSection title="Imports" count={selectedNode.imports.length} icon={<ArrowUpRight size={15} />}>
              {selectedNode.imports.length ? selectedNode.imports.map((path) => <FileLink key={path} path={path} onClick={() => selectFile(path)} />) : <EmptyDetail text="Does not import any project files" />}
            </DetailSection>
            <DetailSection title="Imported by" count={selectedNode.importedBy.length} icon={<ArrowDownLeft size={15} />}>
              {selectedNode.importedBy.length ? selectedNode.importedBy.map((path) => <FileLink key={path} path={path} onClick={() => selectFile(path)} />) : <EmptyDetail text="No files import this one" />}
            </DetailSection>
            <DetailSection title="npm packages" count={selectedNode.externalDeps.length} icon={<Package size={15} />}>
              {selectedNode.externalDeps.length ? (
                <div className="package-list">{selectedNode.externalDeps.map((name) => <span className="package-chip" key={name}><Box size={13} />{name}</span>)}</div>
              ) : <EmptyDetail text="No external packages detected" />}
            </DetailSection>
            <div className="panel-footer"><ShieldCheck size={14} /> Analyzed locally in your browser</div>
          </aside>
        ) : (
          <StatsPanel
            graph={graph}
            stats={projectStats}
            onSelect={selectFile}
          />
        ))}
      </section>
    </main>
  )
}

function DetailSection({ title, count, icon, children }: { title: string; count: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <div className="section-title"><span className="section-title-icon">{icon}</span><h2>{title}</h2><span className="section-count">{count}</span></div>
      <div className="section-content">{children}</div>
    </section>
  )
}

function FileLink({ path, onClick }: { path: string; onClick: () => void }) {
  return (
    <button className="file-link" onClick={onClick} type="button" title={`Go to ${path}`}>
      <FileCode2 size={14} /><span>{path.split('/').at(-1)}</span><ChevronRight size={14} />
    </button>
  )
}

function EmptyDetail({ text }: { text: string }) {
  return <p className="empty-detail">{text}</p>
}

function StatsPanel({
  graph,
  stats,
  onSelect,
}: {
  graph: { nodes: GraphNode[]; edges: ReturnType<typeof buildGraph>['edges'] }
  stats: {
    mostImported: GraphNode[]
    topImporters: GraphNode[]
    topPackages: { name: string; count: number }[]
    isolated: GraphNode[]
    connectedCount: number
  }
  onSelect: (id: string) => void
}) {
  return (
    <aside className="details-panel stats-panel">
      <div className="panel-heading">
        <div className="panel-kicker"><BarChart3 size={14} /> PROJECT INSIGHTS</div>
        <span className="insights-live"><span /> LIVE</span>
      </div>
      <div className="stats-overview">
        <div><strong>{graph.nodes.length}</strong><span>Source files</span></div>
        <div><strong>{graph.edges.length}</strong><span>Connections</span></div>
      </div>
      <div className="detail-divider" />
      <DetailSection title="Most imported" count={stats.mostImported.length} icon={<ArrowDownLeft size={15} />}>
        {stats.mostImported.length
          ? stats.mostImported.map((node) => <StatFileRow key={node.id} node={node} value={`${node.importedBy.length} imports`} onClick={() => onSelect(node.id)} />)
          : <EmptyDetail text="No project file imports found yet" />}
      </DetailSection>
      <DetailSection title="Imports the most" count={stats.topImporters.length} icon={<ArrowUpRight size={15} />}>
        {stats.topImporters.length
          ? stats.topImporters.map((node) => <StatFileRow key={node.id} node={node} value={`${node.imports.length} files`} onClick={() => onSelect(node.id)} />)
          : <EmptyDetail text="No file imports found yet" />}
      </DetailSection>
      <DetailSection title="Top packages" count={stats.topPackages.length} icon={<Package size={15} />}>
        {stats.topPackages.length
          ? <div className="package-list">{stats.topPackages.map(({ name, count }) => <span className="package-chip" key={name}><Box size={13} />{name}<b>{count}</b></span>)}</div>
          : <EmptyDetail text="No external packages detected" />}
      </DetailSection>
      <DetailSection title="Isolated files" count={stats.isolated.length} icon={<Box size={15} />}>
        {stats.isolated.length
          ? stats.isolated.slice(0, 5).map((node) => <StatFileRow key={node.id} node={node} value="unconnected" onClick={() => onSelect(node.id)} />)
          : <EmptyDetail text="Every file is connected to the graph" />}
        {stats.isolated.length > 5 && <p className="empty-detail">And {stats.isolated.length - 5} more files</p>}
      </DetailSection>
      <div className="panel-footer"><ShieldCheck size={14} /> Analyzed locally in your browser</div>
    </aside>
  )
}

function StatFileRow({ node, value, onClick }: { node: GraphNode; value: string; onClick: () => void }) {
  return (
    <button className="stat-file-row" type="button" title={`Inspect ${node.id}`} onClick={onClick}>
      <FileCode2 size={14} />
      <span className="stat-file-name">{node.id.split('/').at(-1)}</span>
      <span className="stat-file-value">{value}</span>
      <ChevronRight size={13} />
    </button>
  )
}

export default App
