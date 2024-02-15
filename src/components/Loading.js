import React, { useState, useEffect } from 'react';
import App from './App';
import { loadWhisper } from '../../stream.wasm/main';
import { pipeline } from '@xenova/transformers';

export const embedder = await pipeline('feature-extraction', 'nomic-ai/nomic-embed-text-v1');
const whisperModel = 'tiny-en-q5_1';

export default function Loading() {
    const [loading, setLoading] = useState(true);

    // Load whisper model
    useEffect(() => {
        loadWhisper(whisperModel);
        setLoading(false);
    }, []);

    if (loading) {
        return <div className='loader'></div>;
    } else {
        return <App />;
    }
}