function depthFirstSearchIterative(graph, startNode) {
    const stack = [ startNode ]; // Use an array as a stack (LIFO)
    const visited = new Set();
    const result = [];

    visited.add(startNode);

    while (stack.length > 0) {
        const currentNode = stack.pop(); // Pop the top element
        result.push(currentNode);

        // Get adjacent nodes (neighbors)
        for (const neighbor of graph[currentNode]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                stack.push(neighbor); // Push unvisited neighbors onto the stack
            }
        }
    }

    return result;
}

/**
 * Performs a Breadth-First Search on a graph.
 * @param {object} graph The adjacency list representation of the graph.
 * @param {string} start The starting node.
 * @returns {Array} The nodes in the order they were visited.
 */
function bfs(graph, start) {
    const visited = new Set(); // To prevent revisiting nodes in a graph with cycles
    const queue = [ start ];     // The queue for FIFO traversal
    const result = [];         // To store the order of visited nodes

    visited.add(start); // Mark the start node as visited

    while (queue.length > 0) {
        const node = queue.shift(); // Dequeue the first node
        result.push(node);          // Process the node

        // Enqueue all unvisited neighbors
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return result;
}


// Example Usage:
const adjacencyListGraph = {
    'A': [ 'B', 'C' ],
    'B': [ 'A', 'D', 'E' ],
    'C': [ 'A', 'F' ],
    'D': [ 'B' ],
    'E': [ 'B', 'F' ],
    'F': [ 'C', 'E' ],
};

console.log('DFS Iterative Traversal:', depthFirstSearchIterative(adjacencyListGraph, 'A'));
// Output: DFS Iterative Traversal: [ 'A', 'C', 'F', 'E', 'B', 'D' ]
// (Note: order depends on the order of neighbors in the list)