import React, { useState, useEffect } from 'react';
import { onStart, onStop } from '../../stream.wasm/main';
import { clearCache } from '../../stream.wasm/helpers';

export default function Whisper() {
    return (
        <div id="input">
            <button id="start"  onClick={onStart} disabled>Start</button>
            <button id="stop"   onClick={onStop} disabled>Stop</button>
            <button id="clear"  onClick={clearCache}>Clear Cache</button>
        </div>
    );
}
