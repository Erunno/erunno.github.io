document.addEventListener("DOMContentLoaded", function() {
    d3.json("data.json").then(function(data) {
        
        const useExtendedChildrenView = false;

        const fullNameToNode = getFuncDict(data);

        computeRecursiveLineCount(data);
        computeRecursiveTouchedVars(data);

        if (useExtendedChildrenView) {
            data = extendChildren(data, fullNameToNode);
        }

        const svg = d3.select("#canvas")
            .call(d3.zoom().on("zoom", function (event) {
                svg.attr("transform", event.transform);
            }))
            .append("g");

        const root = d3.hierarchy(data);

        const treeLayout = d3.tree().nodeSize([15, 80]);
        treeLayout(root);

        // Links
        svg.selectAll('path.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x)
            );

        if (!useExtendedChildrenView) {
            createLinksToOtherCalls();
        }

        // Nodes
        const node = svg.selectAll('g.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`)
            .on('click', function (event, d) {
                displayInfo(event, d);
            });

        node.append('circle')
            .attr('r', d => d.data.metadata.line_count > 100 ? 6 : 2)
            .attr('status', d => d.data.metadata.error ? 'error' : 'ok')
            .attr('is-external-function', d => d.data.metadata.is_external_function)
            .attr('is-std-function', d => d.data.metadata.is_std_function)

        node.append('text')
            .attr('dy', 3)
            .attr('x', d => d.children ? -8 : 8)
            .style('text-anchor', d => d.children ? 'end' : 'start')
            .text(d => d.data.name);

        
        function displayInfo(event, d) {
            const calledBy = Object.entries(fullNameToNode)
                .filter(([key, node]) => node.children.some(ch => ch.full_name === d.data.full_name) || node.other_calls.includes(d.data.full_name))
                .map(([key, node]) => node);

            const called = [
                ...d.data.children.map(ch => ch.name),
                ...d.data.other_calls.map(call => fullNameToNode[call].name)
            ]

            touchedVars = sortVars(d.data.metadata.touched_global_vars);
            recursivelyTouchedVars = sortVars(d.data.metadata.recursive_touched_global_vars);

            d3.select('#info')
                .html(`
                    <h2>${d.data.name}</h2>
                    <p>${d.data.full_name}</p>
                    <a href="${d.data.metadata.url}" target="_blank">GitHub</a>
                    ${called ? `<h3>Called functions</h3>
                        <ul>
                            ${called.map(func => `<li>${func}</li>`).join('')}
                        </ul>` : ''}
                    ${calledBy.length ? `<h3>Called by</h3>
                        <ul>
                        ${calledBy.map(node => `<li>${node.name}</li>`).join('')}
                        </ul>` : ''}
                    <h3>Metadata</h3>
                        ${enumDict(d.data.metadata, (key, val) => `<p><b>${key}</b> ${escape(val)}</p>`)}
                    <h3>Touched global variables (${touchedVars.length})</h3>
                        <ul>
                        ${touchedVars.map(printVar).join('')}
                        </ul>
                    <h3>Recursively touched vars (${recursivelyTouchedVars.length})</h3>
                        <ul>
                        ${recursivelyTouchedVars.map(printVar).join('')}
                        </ul>
                `);

            function escape(obj) {    
                str = obj.toString();            
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            function enumDict(dict, callback) {
                return Object.entries(dict)
                    .filter(([key, value]) => !!value)
                    .filter(([key, value]) => key !== 'url')
                    .filter(([key, value]) => key !== 'touched_global_vars')
                    .filter(([key, value]) => key !== 'recursive_touched_global_vars')
                    .map(([key, value]) => callback(key, value)).join('');

            }

            function printVar(varStr) {
                const varName = varStr.split('::')[0];
                const varModule = varStr.split('::')[1].split(': ')[0];
                const varType = escape(varStr.split(': ')[1]);

                return `<li>
                    <span class="var-name">${varName}</span>::<span class="var-module">${varModule}</span>: 
                    <span class="var-type">${varType}</span>
                </li>`;
            }
            
            function sortVars(vars){
                vars = vars.sort((a, b) => {
                    const aName = a.split('::')[0];
                    const bName = b.split('::')[0];

                    priority_a = a.includes('[') ? 1 : 0;
                    priority_b = b.includes('[') ? 1 : 0;

                    return priority_a != priority_b ? priority_b - priority_a : aName.localeCompare(bName);
                });
                return vars;
            }
        }

        function extendChildren(data, fullNameToNode) {
            function extendNode(node) {
                node.children = [
                    ...node.children.map(child => extendNode(child)),
                    ...node.other_calls.map(call => fullNameToNode[call])
                ];
                
                return node;
            }
            return extendNode(data);
        }

        function getFuncDict(data) {
            return collectChildren(data);

            function collectChildren(node) {
                let dict = {};
                dict[node.full_name] = node;

                node.children.forEach(child => {
                    dict = {
                        ...dict,
                        ...collectChildren(child)
                    }
                });

                return dict;
            }
        }

        function createLinksToOtherCalls() {
            root.descendants().forEach(d => {
                if (d.data.other_calls) {
                    d.data.other_calls.forEach(call => {
                        const target = root.descendants().find(node => node.data.full_name === call);
                        if (target) {
                            svg.append('path')
                                .attr('class', 'other-link')
                                .attr('d', d3.linkHorizontal()({
                                    source: [d.y, d.x],
                                    target: [target.y, target.x]
                                }));
                        }
                    });
                }
            });
        }

        function computeRecursiveLineCount(data) {
            function computeNode(node) {
                node.metadata.recursive_line_count = node.metadata.line_count;
                
                node.children.forEach(child => {
                    computeNode(child);
                    node.metadata.recursive_line_count += child.metadata.recursive_line_count;
                });
            }
            computeNode(data);
        }

        function computeRecursiveTouchedVars(data) {
            function computeNode(node) {
                if (node.metadata.recursive_touched_global_vars) 
                    return; 

                node.metadata.recursive_touched_global_vars = [...node.metadata.touched_global_vars];
                
                calledChildren = [
                    ...node.children,
                    ...node.other_calls.map(call => fullNameToNode[call])
                ];
                calledChildren.forEach(child => {
                    computeNode(child);
                    node.metadata.recursive_touched_global_vars = [
                        ...node.metadata.recursive_touched_global_vars,
                        ...child.metadata.recursive_touched_global_vars
                    ];
                });

                node.metadata.recursive_touched_global_vars = [...new Set(node.metadata.recursive_touched_global_vars)];
            }
            computeNode(data);
        }
        

    });
});
