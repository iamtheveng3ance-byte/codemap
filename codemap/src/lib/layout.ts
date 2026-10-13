import dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type { GraphEdge, GraphNode } from './buildGraph';

export type CodeNodeData = GraphNode & Record<string, unknown> & {
  dimmed?: boolean;
  searchMatch?: boolean;
};
export type CodeFlowNode = Node<CodeNodeData, 'codeFile'>;

const NODE_WIDTH = 252;
const NODE_HEIGHT = 82;

/** Places dependency graph nodes in a left-to-right flow using Dagre. */
export function layoutGraph(graph: { nodes: GraphNode[]; edges: GraphEdge[] }): {
  nodes: CodeFlowNode[];
  edges: Edge[];
} {
  const layout = new dagre.graphlib.Graph();
  layout.setDefaultEdgeLabel(() => ({}));
  layout.setGraph({ rankdir: 'LR', nodesep: 42, ranksep: 92, marginx: 48, marginy: 48 });

  for (const node of graph.nodes) {
    layout.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of graph.edges) {
    layout.setEdge(edge.source, edge.target);
  }
  dagre.layout(layout);

  const nodes: CodeFlowNode[] = graph.nodes.map((node) => {
    const positioned = layout.node(node.id);
    return {
      id: node.id,
      type: 'codeFile',
      position: {
        x: positioned.x - NODE_WIDTH / 2,
        y: positioned.y - NODE_HEIGHT / 2,
      },
      data: { ...node },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });

  const edges: Edge[] = graph.edges.map((edge) => ({
    ...edge,
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#65728d', strokeWidth: 1.6 },
    markerEnd: { type: 'arrowclosed', color: '#65728d', width: 14, height: 14 },
  }));

  return { nodes, edges };
}
