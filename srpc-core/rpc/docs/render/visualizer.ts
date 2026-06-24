import type { ContractDocsStore } from "../../src/contract-docs.ts";
import { buildContractGraph } from "../contract-graph.ts";
import { page } from "../layout.ts";
import { DOCS_THEME } from "../theme.ts";
import { cls, icon, panelHeading, statCard } from "../ui.ts";

export function renderVisualizer(store: ContractDocsStore): string {
  const graph = buildContractGraph(store, { includeServices: true });
  const graphJson = JSON.stringify(graph).replace(/</g, "\\u003c");
  const themeJson = JSON.stringify(DOCS_THEME);

  return page(
    "Contract visualizer",
    `<article class="${cls.panel}">
      <h1 class="${cls.h1}">${icon("diagram-project", cls.h1Icon)} Contract visualizer</h1>
      <p class="${cls.lead}">
        Interactive map of your contract packages, services, and cross-package type dependencies.
        Drag nodes to reposition — they stay where you drop them. Arrows show which packages reference types from another package.
      </p>
      <div class="${cls.stats}">
        ${statCard("boxes-stacked", graph.stats.packages, "packages", "packages")}
        ${statCard("server", graph.stats.services, "services", "services")}
        ${statCard("share-nodes", graph.stats.packageLinks, "package links", "methods")}
        ${statCard("link", graph.stats.serviceLinks, "service nodes", "services")}
      </div>
    </article>
    <article class="${cls.panel}">
      ${panelHeading("sliders", "View options")}
      <div class="mb-4 flex flex-wrap items-center gap-4">
        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" id="viz-show-services" checked class="rounded border-zinc-300 text-brand focus:ring-brand/30" />
          Show services
        </label>
        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" id="viz-physics" checked class="rounded border-zinc-300 text-brand focus:ring-brand/30" />
          Physics layout
        </label>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-brand hover:text-brand" id="viz-fit">${icon("expand")} Fit view</button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-brand hover:text-brand" id="viz-fullscreen">${icon("maximize")} Full screen</button>
      </div>
      <p class="${cls.meta} mb-2" id="viz-selection">Click a node to see details and open its docs page.</p>
      <div class="viz-stage" id="viz-stage">
        <div id="contract-graph" class="contract-graph" role="img" aria-label="Contract dependency graph"></div>
        <button type="button" class="viz-fullscreen-exit inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:text-brand" id="viz-exit-fullscreen" hidden>
          ${icon("compress")} Exit full screen
        </button>
      </div>
      <div class="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
        <span class="inline-flex items-center gap-2"><i class="inline-block h-3 w-3 rounded-sm border-2 border-brand bg-white"></i> Package</span>
        <span class="inline-flex items-center gap-2"><i class="inline-block h-3 w-3 rounded-sm border border-zinc-300 bg-zinc-50"></i> Service</span>
        <span class="inline-flex items-center gap-2"><i class="inline-block w-5 border-t-2 border-zinc-400"></i> Type dependency</span>
        <span class="inline-flex items-center gap-2"><i class="inline-block w-5 border-t-2 border-dashed border-zinc-300"></i> Contains service</span>
      </div>
    </article>
    <script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
    <script>
      (function () {
        const initialGraph = ${graphJson};
        const container = document.getElementById("contract-graph");
        const stage = document.getElementById("viz-stage");
        const selection = document.getElementById("viz-selection");
        const showServicesInput = document.getElementById("viz-show-services");
        const physicsInput = document.getElementById("viz-physics");
        const fitButton = document.getElementById("viz-fit");
        const fullscreenButton = document.getElementById("viz-fullscreen");
        const exitFullscreenButton = document.getElementById("viz-exit-fullscreen");

        function startVisualizer() {
          if (!container || !stage) return;
          if (!window.vis) {
            window.requestAnimationFrame(startVisualizer);
            return;
          }

        const THEME = ${themeJson};

        function serviceNodeLabel(node) {
          const lines = [node.label];
          if (node.methodCount !== undefined) {
            lines.push(
              node.methodCount + " method" + (node.methodCount === 1 ? "" : "s")
            );
          }
          if (node.methodsSummary) {
            lines.push(node.methodsSummary);
          }
          return lines.join("\\n");
        }

        function buildNode(node) {
          const base = {
            id: node.id,
            label: node.group === "service" ? serviceNodeLabel(node) : node.label,
            group: node.group,
            title: node.title,
          };

          if (node.group === "package") {
            return Object.assign(base, {
              margin: { top: 14, right: 18, bottom: 14, left: 18 },
              widthConstraint: { minimum: 96, maximum: 220 },
            });
          }

          return Object.assign(base, {
            margin: { top: 10, right: 12, bottom: 10, left: 12 },
            widthConstraint: { minimum: 88, maximum: 176 },
          });
        }

        function networkOptions() {
          return {
            nodes: {
              shape: "box",
              shadow: false,
              shapeProperties: { borderRadius: 0 },
            },
            groups: {
              package: {
                borderWidth: 2,
                borderWidthSelected: 2,
                font: {
                  size: 14,
                  face: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: THEME.teal,
                  bold: true,
                },
                color: {
                  background: THEME.bg,
                  border: THEME.teal,
                  highlight: { background: THEME.bgActive, border: THEME.tealDark },
                  hover: { background: THEME.bgMuted, border: THEME.tealDark },
                },
              },
              service: {
                borderWidth: 1,
                borderWidthSelected: 2,
                font: {
                  multi: true,
                  size: 11,
                  face: "system-ui, -apple-system, sans-serif",
                  color: THEME.slate,
                  align: "center",
                },
                color: {
                  background: THEME.bgMuted,
                  border: THEME.border,
                  highlight: { background: THEME.bg, border: THEME.teal },
                  hover: { background: THEME.bg, border: THEME.teal },
                },
              },
            },
            physics: {
              enabled: true,
              stabilization: { iterations: 200, fit: true },
              barnesHut: {
                gravitationalConstant: -6000,
                centralGravity: 0.18,
                springLength: 180,
                springConstant: 0.04,
                damping: 0.12,
                avoidOverlap: 0.25,
              },
            },
            interaction: {
              hover: true,
              tooltipDelay: 60,
              hoverConnectedEdges: true,
              selectConnectedEdges: false,
              dragNodes: true,
            },
            layout: { improvedLayout: true },
          };
        }

        function buildEdge(edge, packageCount) {
          const hideLabel = !edge.dashes && packageCount > 5;
          return {
            id: edge.id,
            from: edge.from,
            to: edge.to,
            label: hideLabel ? undefined : edge.label,
            dashes: edge.dashes,
            title: edge.title,
            arrows: edge.dashes ? "" : { to: { enabled: true, scaleFactor: 0.55 } },
            color: edge.dashes
              ? { color: THEME.borderMuted, highlight: THEME.borderStrong, hover: THEME.borderStrong }
              : { color: THEME.borderStrong, highlight: THEME.teal, hover: THEME.teal },
            width: edge.dashes ? 1.25 : 2,
            smooth: {
              enabled: true,
              type: edge.dashes ? "cubicBezier" : "curvedCW",
              roundness: edge.dashes ? 0.28 : 0.2,
            },
            font: hideLabel
              ? undefined
              : {
                  size: 10,
                  align: "horizontal",
                  color: THEME.textMuted,
                  background: "rgba(255, 255, 255, 0.9)",
                  strokeWidth: 0,
                },
          };
        }

        function filterGraph(graph, showServices) {
          if (showServices) return graph;
          return {
            ...graph,
            nodes: graph.nodes.filter((node) => node.group === "package"),
            edges: graph.edges.filter((edge) => !edge.dashes),
          };
        }

        let network = null;
        let nodesData = null;

        function lockNode(nodeId) {
          if (!network || !nodesData) return;
          const positions = network.getPositions([nodeId]);
          const pos = positions[nodeId];
          if (!pos) return;
          nodesData.update({ id: nodeId, x: pos.x, y: pos.y, fixed: true });
        }

        function lockAllNodes() {
          if (!network || !nodesData) return;
          const ids = nodesData.getIds();
          if (ids.length === 0) return;
          const positions = network.getPositions(ids);
          const updates = [];
          for (let i = 0; i < ids.length; i++) {
            const nodeId = ids[i];
            const pos = positions[nodeId];
            if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
            updates.push({ id: nodeId, x: pos.x, y: pos.y, fixed: true });
          }
          if (updates.length === 0) return;
          nodesData.update(updates);
          network.setOptions({ physics: { enabled: false } });
        }

        function setPhysicsEnabled(enabled) {
          if (!network || !nodesData) return;
          if (enabled) {
            releaseNodes(nodesData.getIds());
            network.setOptions({ physics: { enabled: true } });
            network.stabilize(200);
            return;
          }
          lockAllNodes();
        }

        function releaseNodes(nodeIds) {
          if (!nodesData) return;
          nodeIds.forEach(function (nodeId) {
            nodesData.update({ id: nodeId, fixed: false });
          });
        }

        function attachNetworkHandlers(graph) {
          let stabilized = false;

          function onLayoutReady() {
            if (stabilized) return;
            stabilized = true;
            lockAllNodes();
            if (physicsInput) {
              physicsInput.checked = false;
            }
            fitGraph();
          }

          network.once("stabilizationIterationsDone", onLayoutReady);
          network.once("stabilized", onLayoutReady);
          window.setTimeout(function () {
            onLayoutReady();
          }, 2500);

          network.on("dragStart", function (params) {
            releaseNodes(params.nodes);
          });

          network.on("dragEnd", function (params) {
            params.nodes.forEach(function (nodeId) {
              lockNode(nodeId);
            });
            network.setOptions({ physics: { enabled: false } });
            if (physicsInput) {
              physicsInput.checked = false;
            }
          });

          network.on("selectNode", function (params) {
            const id = params.nodes[0];
            const node = graph.nodes.find((entry) => entry.id === id);
            if (!node || !selection) return;
            if (node.href) {
              if (node.group === "service") {
                const methods =
                  node.methodCount !== undefined
                    ? node.methodCount + " method" + (node.methodCount === 1 ? "" : "s")
                    : "";
                const summary = node.methodsSummary ? " · " + node.methodsSummary : "";
                selection.innerHTML =
                  "<strong>" + node.label + "</strong>" +
                  (methods ? " — " + methods : "") +
                  summary +
                  ' · <a href="' + node.href + '">Open docs</a>';
              } else {
                selection.innerHTML =
                  "<strong>" + node.label + "</strong> — " + node.title +
                  ' · <a href="' + node.href + '">Open docs</a>';
              }
            } else {
              selection.textContent = node.label + " — " + node.title;
            }
          });

          network.on("doubleClick", function (params) {
            const id = params.nodes[0];
            const node = graph.nodes.find((entry) => entry.id === id);
            if (node && node.href) {
              window.location.href = node.href;
            }
          });
        }

        function fitGraph() {
          if (network) {
            network.fit({ animation: { duration: 300, easingFunction: "easeInOutQuad" } });
          }
        }

        function isFullscreen() {
          return document.fullscreenElement === stage;
        }

        function updateFullscreenUi() {
          const active = isFullscreen();
          if (exitFullscreenButton) {
            exitFullscreenButton.hidden = !active;
          }
          if (fullscreenButton) {
            fullscreenButton.innerHTML = active
              ? '<i class="fa-solid fa-compress" aria-hidden="true"></i> Exit full screen'
              : '<i class="fa-solid fa-maximize" aria-hidden="true"></i> Full screen';
          }
          if (network) {
            setTimeout(function () {
              network.redraw();
              fitGraph();
            }, 50);
          }
        }

        async function enterFullscreen() {
          if (!stage.requestFullscreen) return;
          await stage.requestFullscreen();
        }

        async function exitFullscreen() {
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          }
        }

        function renderGraph(showServices) {
          const graph = filterGraph(initialGraph, showServices);
          const packageCount = graph.nodes.filter((node) => node.group === "package").length;
          const data = {
            nodes: new vis.DataSet(graph.nodes.map((node) => buildNode(node))),
            edges: new vis.DataSet(graph.edges.map((edge) => buildEdge(edge, packageCount))),
          };

          const options = networkOptions();

          if (network) {
            network.destroy();
          }
          nodesData = data.nodes;
          network = new vis.Network(container, data, options);
          attachNetworkHandlers(graph);
        }

        renderGraph(showServicesInput ? showServicesInput.checked : true);

        if (showServicesInput) {
          showServicesInput.addEventListener("change", function () {
            renderGraph(showServicesInput.checked);
          });
        }
        if (physicsInput) {
          physicsInput.addEventListener("change", function () {
            setPhysicsEnabled(physicsInput.checked);
          });
        }
        if (fitButton) {
          fitButton.addEventListener("click", fitGraph);
        }
        if (fullscreenButton) {
          fullscreenButton.addEventListener("click", function () {
            if (isFullscreen()) {
              exitFullscreen();
            } else {
              enterFullscreen();
            }
          });
        }
        if (exitFullscreenButton) {
          exitFullscreenButton.addEventListener("click", exitFullscreen);
        }
        document.addEventListener("fullscreenchange", updateFullscreenUi);
        stage.addEventListener("fullscreenchange", updateFullscreenUi);
        }

        startVisualizer();
      })();
    </script>`,
    { store, activeVisualizer: true }
  );
}
