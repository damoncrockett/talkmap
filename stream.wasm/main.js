import { loadRemote, printTextarea } from './helpers';

function returnDomain() {
    const production = process.env.NODE_ENV === 'production';
    return production ? 'https://whisper.ggerganov.com/' : 'http://localhost:8888/'
  }

// web audio context
var context = null;

// audio data
var audio = null;
var audio0 = null;

// the stream instance
var instance = null;

// model name
var model_whisper = null;

var Module = {
    print: printTextarea,
    printErr: printTextarea,
    setStatus: function(text) {
        printTextarea('js: ' + text);
    },
    monitorRunDependencies: function(left) {
    },
    preRun: function() {
        printTextarea('js: Preparing ...');
    },
    postRun: function() {
        printTextarea('js: Initialized successfully!');
    }
};

console.log(Module);

//
// fetch models
//

function storeFS(fname, buf) {
    // write to WASM file using FS_createDataFile
    // if the file exists, delete it
    try {
        Module.FS_unlink(fname);
    } catch (e) {
        // ignore
    }

    Module.FS_createDataFile("/", fname, buf, true, true);

    printTextarea('storeFS: stored model: ' + fname + ' size: ' + buf.length);

    document.getElementById('model-whisper-status').innerHTML = 'loaded "' + model_whisper + '"!';

}

export function loadWhisper(model) {
  
    let url     = returnDomain() + 'ggml-model-whisper-tiny.en-q5_1.bin';
    let dst     = 'whisper.bin';
    let size_mb = 31;

    model_whisper = model;

    const cbProgress = function(p) {
        // let el = document.getElementById('fetch-whisper-progress');
        // el.innerHTML = Math.round(100*p) + '%';
    };

    loadRemote(url, dst, size_mb, cbProgress, storeFS, printTextarea);
}

//
// microphone
//

const kSampleRate = 16000;
const kRestartRecording_s = 120;
const kIntervalAudio_ms = 5000; // pass the recorded audio to the C++ instance at this rate

var mediaRecorder = null;
var doRecording = false;
var startTime = 0;

window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

function stopRecording() {
    Module.setStatus("paused");
    doRecording = false;
    audio0 = null;
    audio = null;
    context = null;
}

function startRecording() {
    if (!context) {
        context = new AudioContext({
            sampleRate: kSampleRate,
            channelCount: 1,
            echoCancellation: false,
            autoGainControl:  true,
            noiseSuppression: true,
        });
    }

    Module.setStatus("");

    // document.getElementById('start').disabled = true;
    // document.getElementById('stop').disabled = false;

    doRecording = true;
    startTime = Date.now();

    var chunks = [];
    var stream = null;

    navigator.mediaDevices.getUserMedia({audio: true, video: false})
        .then(function(s) {
            stream = s;
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = function(e) {
                chunks.push(e.data);

                var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
                var reader = new FileReader();

                reader.onload = function(event) {
                    var buf = new Uint8Array(reader.result);

                    if (!context) {
                        return;
                    }
                    context.decodeAudioData(buf.buffer, function(audioBuffer) {
                        var offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
                        var source = offlineContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(offlineContext.destination);
                        source.start(0);

                        offlineContext.startRendering().then(function(renderedBuffer) {
                            audio = renderedBuffer.getChannelData(0);

                            //printTextarea('js: audio recorded, size: ' + audio.length + ', old size: ' + (audio0 == null ? 0 : audio0.length));

                            var audioAll = new Float32Array(audio0 == null ? audio.length : audio0.length + audio.length);
                            if (audio0 != null) {
                                audioAll.set(audio0, 0);
                            }
                            audioAll.set(audio, audio0 == null ? 0 : audio0.length);

                            if (instance) {
                                Module.set_audio(instance, audioAll);
                            }
                        });
                    }, function(e) {
                        audio = null;
                    });
                }

                reader.readAsArrayBuffer(blob);
            };

            mediaRecorder.onstop = function(e) {
                if (doRecording) {
                    setTimeout(function() {
                        startRecording();
                    });
                }
            };

            mediaRecorder.start(kIntervalAudio_ms);
        })
        .catch(function(err) {
            printTextarea('js: error getting audio stream: ' + err);
        });

    var interval = setInterval(function() {
        if (!doRecording) {
            clearInterval(interval);
            mediaRecorder.stop();
            stream.getTracks().forEach(function(track) {
                track.stop();
            });

            // document.getElementById('start').disabled = false;
            // document.getElementById('stop').disabled  = true;

            mediaRecorder = null;
        }

        // if audio length is more than kRestartRecording_s seconds, restart recording
        if (audio != null && audio.length > kSampleRate*kRestartRecording_s) {
            if (doRecording) {
                //printTextarea('js: restarting recording');

                clearInterval(interval);
                audio0 = audio;
                audio = null;
                mediaRecorder.stop();
                stream.getTracks().forEach(function(track) {
                    track.stop();
                });
            }
        }
    }, 100);
}

//
// main
//

var nLines = 0;
var intervalUpdate = null;
var transcribedAll = '';

export function onStart() {
    if (!instance) {
        instance = Module.init('whisper.bin');

        if (instance) {
            printTextarea("js: whisper initialized, instance: " + instance);
        }
    }

    if (!instance) {
        printTextarea("js: failed to initialize whisper");
        return;
    }

    startRecording();

    intervalUpdate = setInterval(function() {
        var transcribed = Module.get_transcribed();

        if (transcribed != null && transcribed.length > 1) {
            transcribedAll += transcribed + '<br>';
            nLines++;

            // if more than 10 lines, remove the first line
            if (nLines > 10) {
                var i = transcribedAll.indexOf('<br>');
                if (i > 0) {
                    transcribedAll = transcribedAll.substring(i + 4);
                    nLines--;
                }
            }
        }

        // document.getElementById('state-status').innerHTML = Module.get_status();
        // document.getElementById('state-transcribed').innerHTML = transcribedAll;
    }, 100);
}

export function onStop() {
    stopRecording();
}