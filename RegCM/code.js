document.addEventListener("DOMContentLoaded", function() {
    d3.json("data.json").then(function(data) {
        
        const useExtendedChildrenView = false;

        const fullNameToNode = getFuncDict(data);
        
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
            .attr('r', 5)
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
                `);

            function escape(obj) {    
                str = obj.toString();            
                return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }

            function enumDict(dict, callback) {
                return Object.entries(dict)
                    .filter(([key, value]) => !!value)
                    .filter(([key, value]) => key !== 'url')
                    .map(([key, value]) => callback(key, value)).join('');

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
        
    });
});
