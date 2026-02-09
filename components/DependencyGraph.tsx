
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string;
  target: string;
  relationship: string;
}

interface DependencyGraphProps {
  data: { source: string; target: string; relationship: string }[];
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const width = svgRef.current.parentElement?.clientWidth || 600;
    const height = 400;

    const nodesMap = new Map<string, Node>();
    data.forEach(d => {
      if (!nodesMap.has(d.source)) nodesMap.set(d.source, { id: d.source });
      if (!nodesMap.has(d.target)) nodesMap.set(d.target, { id: d.target });
    });

    const nodes = Array.from(nodesMap.values());
    const links: Link[] = data.map(d => ({ ...d }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2);

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 12)
      .attr("fill", "#3b82f6");

    node.append("text")
      .text(d => d.id)
      .attr("x", 16)
      .attr("y", 4)
      .attr("fill", "#cbd5e1")
      .style("font-size", "12px")
      .style("font-weight", "500");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [data]);

  return (
    <div className="w-full h-[400px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
      <svg ref={svgRef} className="w-full h-full" viewBox="0 0 600 400" />
    </div>
  );
};

export default DependencyGraph;
