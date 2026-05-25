import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { BuilderNodeData } from './types';

// Dagre layout helper. Repositions every node in a top-down ranked
// layout: ranks (vertical levels) come from edge directionality, nodes
// within a rank spread horizontally. We feed dagre approximate node
// widths/heights so the spacing math accounts for the actual node
// chrome — otherwise dagre would pack things tightly assuming 0×0
// nodes, which is what was causing the squish after inserts.
//
// Used by:
//   - the "Auto-format" button in the bottom action bar
//   - automatically after `insertNodeOnEdge` so dropping a step
//     between two siblings rebalances the column instead of stacking
//     overlapping cards on top of each other

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 110;
// Slightly wider for condition nodes since the renderer widens them
// when there are 4+ branches; using the max keeps dagre conservative.
const CONDITION_NODE_WIDTH = 380;

export interface AutoLayoutOptions {
  /** Top-bottom (default) or left-right. */
  direction?: 'TB' | 'LR';
  /** Horizontal gap between sibling nodes in the same rank. */
  nodeSeparation?: number;
  /** Vertical gap between ranks. */
  rankSeparation?: number;
}

export function autoLayout(
  nodes: Node<BuilderNodeData>[],
  edges: Edge[],
  options: AutoLayoutOptions = {},
): Node<BuilderNodeData>[] {
  const {
    direction = 'TB',
    nodeSeparation = 60,
    rankSeparation = 90,
  } = options;

  // Empty graph → nothing to lay out (avoids dagre's noisy console
  // warnings when called on a fresh flow).
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSeparation,
    ranksep: rankSeparation,
  });

  for (const node of nodes) {
    const width =
      node.data.type === 'condition' ? CONDITION_NODE_WIDTH : DEFAULT_NODE_WIDTH;
    g.setNode(node.id, { width, height: DEFAULT_NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // Dagre returns the center point of each node; ReactFlow wants the
  // top-left. Subtract half the width/height to convert.
  return nodes.map((node) => {
    const layouted = g.node(node.id);
    if (!layouted) return node;
    const width =
      node.data.type === 'condition' ? CONDITION_NODE_WIDTH : DEFAULT_NODE_WIDTH;
    return {
      ...node,
      position: {
        x: layouted.x - width / 2,
        y: layouted.y - DEFAULT_NODE_HEIGHT / 2,
      },
    };
  });
}
