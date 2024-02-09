import { forceSimulation, forceManyBody, forceX, forceY, forceCollide } from 'd3-force';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';

export const plotSummaryCoords = (summaries, summaryCoords, svg) => {
    
    // Create a force simulation to prevent overlapping summaries
    const simulation = forceSimulation(summaryCoords)
        .force("charge", forceManyBody().strength(-10))
        .force("x", forceX(d => d.x).strength(0.5))
        .force("y", forceY(d => d.y).strength(0.5))
        .force("collide", forceCollide().radius(20).strength(0.5))
        .stop();

    // Manually run the simulation for a set number of ticks
    for (let i = 0; i < 10; i++) simulation.tick();

    // Transition duration in milliseconds
    const duration = 750;

    // Update pattern: Bind data to groups, handling entering (new) and updating (existing) elements
    let summariesGroup = svg.selectAll('g')
        .data(summaryCoords, (_, i) => i); // Assuming each data point has an identifier 'id'

    // Enter new elements
    const enterGroup = summariesGroup.enter()
        .append('g')
        .attr('transform', d => `translate(${d.left},${d.top})`); // Initial position

    enterGroup.append('rect')
        .attr('width', 100) // Initial width, adjust based on expected text width
        .attr('height', 40) // Fixed height
        .attr('rx', 20) // Rounded corners
        .attr('ry', 20)

    const padding = 10;

    enterGroup.append('text')
        .attr('x', padding)
        .attr('y', 20) // Center text vertically
        .attr('dominant-baseline', 'middle')
        .style('fill', 'black')
        .text((_, i) => summaries[i]);

    // Merge entering elements with updating ones to apply transitions
    summariesGroup = enterGroup.merge(summariesGroup);

    // Apply transitions to all groups (both new and updating)
    summariesGroup.transition().duration(duration)
        .attr('transform', d => `translate(${d.left},${d.top})`);

    summariesGroup.select('text')
        .each(function(d, i) {
            const textWidth = this.getComputedTextLength();
            const rectWidth = textWidth + 2 * padding;
            select(this.previousSibling) // Assuming the rectangle is immediately before the text in the DOM
                .transition().duration(duration)
                .attr('width', rectWidth);
        });
};