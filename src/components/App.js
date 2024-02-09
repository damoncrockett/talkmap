import React, { useState, useRef, useEffect } from 'react';
import { pipeline } from '@xenova/transformers';
import { PCA } from 'ml-pca';
import { normalizeCoordinates, toScreenCoordinates } from '../../utils/coords';
import { chooseThreeMostImportantWords } from '../../utils/text';
import { select } from 'd3-selection';
import { plotSummaryCoords } from '../../utils/plot';

const embedder = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1');

export default function App() {
    const [passage, setPassage] = useState('');
    const [summaries, setSummaries] = useState([]);
    const [embeddings, setEmbeddings] = useState([]);
    const [summaryCoords, setSummaryCoords] = useState([]);
    const inputRef = useRef();
    const svgRef = useRef();

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            handleButtonClick(); // Call the function to handle submission
        }
    }

    const handleButtonClick = () => {
        setPassage(inputRef.current.value);
        inputRef.current.value = ''; // Clear the input field
    };

    useEffect(() => {
        async function processInput() {
            if (!passage) return; // Exit early if there's no passage to process
           
            const embedding = await embedder(passage, { pooling: 'mean', normalize: true });
            const newEmbeddings = [...embeddings, embedding["data"]]; // Temporary variable to hold new state
    
            const twoDimArrays = newEmbeddings.map(d => Array.from(d));
            const fitPCA = new PCA(twoDimArrays);
            const pcaEmbeddings = fitPCA.predict(twoDimArrays)["data"].map(d => Array.from(d.slice(0, 2)));
    
            const normalizedCoordinates = normalizeCoordinates(pcaEmbeddings);
            const screenCoords = toScreenCoordinates(normalizedCoordinates, svgRef.current.clientWidth, svgRef.current.clientHeight, 100);
    
            // Update states together to ensure they are synchronized
            setSummaries(prevSummaries => [...prevSummaries, chooseThreeMostImportantWords(passage)]);
            setEmbeddings(newEmbeddings); 
            setSummaryCoords(screenCoords); 
        }
    
        processInput();
    }, [passage]);

    useEffect(() => {
        if (summaryCoords.length === 0) return;
    
        const svg = select(svgRef.current);

        plotSummaryCoords(summaries, summaryCoords, svg);
    
    }, [summaryCoords]); // Depend on summaries as well since they're used in rendering
    
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div style={{ marginBottom: '10px' }}> {/* Ensure this div doesn't grow and only takes necessary space */}
                <input ref={inputRef} onKeyDown={handleKeyDown} />
                <button onClick={handleButtonClick}>SUMMARIZE</button>
            </div>
            <svg ref={svgRef} style={{ flexGrow: 1 }} width="100%" height="100%"></svg>
        </div>
    );
    
}
