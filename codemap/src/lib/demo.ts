export const demoFiles: Record<string, string> = {
  'src/main.tsx': `import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);`,
  'src/App.tsx': `import { Navigation } from './components/Navigation';
import { ProjectCard } from './components/ProjectCard';
import { Button } from './components/Button';
import { useProjects } from './hooks/useProjects';
import { formatDate } from './lib/formatDate';
import type { Project } from './types';
import { Search, Sparkles } from 'lucide-react';

export function App() {
  const projects: Project[] = useProjects();
  return <main><Navigation /><h1>Good morning, Alex</h1><Search /><Sparkles />{projects.map(project => <ProjectCard key={project.id} project={project} />)}<Button>New project</Button><small>{formatDate(new Date())}</small></main>;
}`,
  'src/components/Navigation.tsx': `import { LayoutDashboard, Settings } from 'lucide-react';
import { Button } from './Button';

export function Navigation() {
  return <nav><LayoutDashboard /><a href="/">Overview</a><a href="/settings"><Settings /> Settings</a><Button>Invite team</Button></nav>;
}`,
  'src/components/ProjectCard.tsx': `import { ArrowUpRight, FolderKanban } from 'lucide-react';
import type { Project } from '../types';
import { formatDate } from '../lib/formatDate';

export function ProjectCard({ project }: { project: Project }) {
  return <article><FolderKanban /><h2>{project.name}</h2><p>Updated {formatDate(project.updatedAt)}</p><ArrowUpRight /></article>;
}`,
  'src/components/Button.tsx': `import { ArrowRight } from 'lucide-react';

export function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}<ArrowRight size={16} /></button>;
}`,
  'src/hooks/useProjects.ts': `import { useEffect, useState } from 'react';
import { fetchProjects } from '../lib/api';
import type { Project } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => { fetchProjects().then(setProjects); }, []);
  return projects;
}`,
  'src/lib/api.ts': `import type { Project } from '../types';

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects');
  return response.json();
}`,
  'src/lib/formatDate.ts': `import { formatDistanceToNow } from 'date-fns';

export function formatDate(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}`,
  'src/types.ts': `export interface Project {
  id: string;
  name: string;
  updatedAt: Date;
}`,
  'src/pages/Settings.tsx': `import { useState } from 'react';
import { Button } from '../components/Button';

export function Settings() {
  const [enabled, setEnabled] = useState(true);
  return <section><h1>Settings</h1><label><input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} /> Notifications</label><Button>Save changes</Button></section>;
}`,
  'src/experiments/unusedHelper.ts': `export function abandonedPrototype() {
  return 'Not connected to the application graph';
}`,
}
