import React, { useState, useRef, useEffect } from 'react';
import { pipeline } from '@xenova/transformers';
import { PCA } from 'ml-pca';
import { normalizeCoordinates, toScreenCoordinates } from '../../utils/coords';
// import { chooseThreeMostImportantWords } from '../../utils/text';
import { select } from 'd3-selection';
import { plotSummaryCoords } from '../../utils/plot';
import basemap from '../../src/assets/json/basemap.json';

const embedder = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1');

async function getEmbeddings(basemap) {
    const basemapEmbeddings = await Promise.all(
        basemap.map(async passage => {
            const embedding = await embedder(passage, { pooling: 'mean', normalize: true });
            return embedding["data"];
        })
    );
    return basemapEmbeddings;
}

async function processBasemap(basemap, width, height) {

    basemapEmbeddings = await getEmbeddings(basemap);
    const basemapTwoDimArrays = basemapEmbeddings.map(d => Array.from(d));

    pca = new PCA(basemapTwoDimArrays);
    const basemapEmbeddingsPCA = pca.predict(basemapTwoDimArrays)["data"].map(d => Array.from(d.slice(0, 2)));

    const basemapNormalizedCoordinates = normalizeCoordinates(basemapEmbeddingsPCA);

    return toScreenCoordinates(basemapNormalizedCoordinates, width, height, 100);
}

let basemapEmbeddings;
let pca;

export default function App() {
    const [passage, setPassage] = useState('');
    const [summaries, setSummaries] = useState([]);
    const [embeddings, setEmbeddings] = useState([]);
    const [summaryCoords, setSummaryCoords] = useState([]);
    const [basemapExists, setBasemapExists] = useState(false);
    const [basemapLocked, setBasemapLocked] = useState(false);    
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

    const handleLockBasemap = () => {
        setBasemapLocked(!basemapLocked);
    }

    useEffect(() => {
        // This effect now includes basemap processing
        async function processBasemapOnMount() {
            if (basemap.length === 0 || basemapExists) return;

            // Ensure SVG dimensions are available
            const svgWidth = svgRef.current.clientWidth;
            const svgHeight = svgRef.current.clientHeight;

            // Process basemap using SVG dimensions
            const processedScreenCoords = await processBasemap(basemap, svgWidth, svgHeight);
            
            setSummaries(basemap); // Initialize summaries based on basemap
            setEmbeddings(basemapEmbeddings); // Assume basemapEmbeddings is obtained similarly
            setSummaryCoords(processedScreenCoords);
            setBasemapExists(true); // Set basemap as processed
        }

        processBasemapOnMount();
    }, []); // Empty dependency array to run only once on mount

    useEffect(() => {
        async function processInput() {
            if (!passage) return; // Exit early if there's no passage to process
           
            const embedding = await embedder(passage, { pooling: 'mean', normalize: true });
            const newEmbeddings = [...embeddings, embedding["data"]]; // Temporary variable to hold new state
    
            const twoDimArrays = newEmbeddings.map(d => Array.from(d));
            
            const fitPCA = basemapLocked ? pca : new PCA(twoDimArrays);
            const pcaEmbeddings = fitPCA.predict(twoDimArrays)["data"].map(d => Array.from(d.slice(0, 2)));
    
            const normalizedCoordinates = normalizeCoordinates(pcaEmbeddings);
            const screenCoords = toScreenCoordinates(normalizedCoordinates, svgRef.current.clientWidth, svgRef.current.clientHeight, 100);
    
            // setSummaries(prevSummaries => [...prevSummaries, chooseThreeMostImportantWords(passage)]);
            setSummaries(prevSummaries => [...prevSummaries, passage]);

            setEmbeddings(newEmbeddings); 
            setSummaryCoords(screenCoords); 
        }
    
        processInput();
    }, [passage]);

    useEffect(() => {
        if (summaryCoords.length === 0) return;
    
        const svg = select(svgRef.current);

        if ( basemapExists ) {
            plotSummaryCoords(summaries, summaryCoords, svg, { start: 0, end: 10 });
        } else {
            plotSummaryCoords(summaries, summaryCoords, svg);
        }

    }, [summaryCoords]);
    
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div style={{ marginBottom: '10px' }}> {/* Ensure this div doesn't grow and only takes necessary space */}
                <input ref={inputRef} onKeyDown={handleKeyDown} />
                <button onClick={handleButtonClick}>MAP</button>
                <button className={basemapLocked ? 'locked' : 'unlocked'} onClick={handleLockBasemap}>LOCK BASEMAP</button>
            </div>
            <svg ref={svgRef} style={{ flexGrow: 1 }} width="100%" height="100%"></svg>
        </div>
    );
    
}
