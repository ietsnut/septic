let context;
let activeOscillators = {};
let isRecording = false;
let recordedNotes = [{"type":"noteOn","midiNote":60,"time":0.84},{"type":"noteOn","midiNote":72,"time":1.2693333333333334},{"type":"noteOff","midiNote":72,"time":1.68},{"type":"noteOn","midiNote":71,"time":1.72},{"type":"noteOff","midiNote":71,"time":2.1493333333333333},{"type":"noteOn","midiNote":69,"time":2.1493333333333333},{"type":"noteOff","midiNote":60,"time":2.2906666666666666},{"type":"noteOff","midiNote":69,"time":2.6},{"type":"noteOn","midiNote":71,"time":2.6693333333333333},{"type":"noteOn","midiNote":64,"time":2.7093333333333334},{"type":"noteOff","midiNote":71,"time":3.5813333333333333},{"type":"noteOn","midiNote":69,"time":3.6},{"type":"noteOff","midiNote":64,"time":4.021333333333334},{"type":"noteOff","midiNote":69,"time":4.050666666666666},{"type":"noteOn","midiNote":62,"time":4.08},{"type":"noteOn","midiNote":67,"time":4.101333333333334},{"type":"noteOff","midiNote":67,"time":5.04},{"type":"noteOn","midiNote":69,"time":5.069333333333334},{"type":"noteOff","midiNote":69,"time":5.530666666666667},{"type":"noteOff","midiNote":62,"time":5.549333333333333},{"type":"noteOn","midiNote":67,"time":5.581333333333333},{"type":"noteOn","midiNote":64,"time":5.581333333333333},{"type":"noteOff","midiNote":67,"time":7.050666666666666},{"type":"noteOff","midiNote":64,"time":7.1706666666666665},{"type":"noteOn","midiNote":65,"time":7.301333333333333},{"type":"noteOn","midiNote":67,"time":7.789333333333333},{"type":"noteOff","midiNote":67,"time":8.250666666666667},{"type":"noteOn","midiNote":69,"time":8.250666666666667},{"type":"noteOff","midiNote":65,"time":8.530666666666667},{"type":"noteOff","midiNote":69,"time":8.589333333333334},{"type":"noteOn","midiNote":71,"time":8.76},{"type":"noteOff","midiNote":71,"time":9.730666666666666},{"type":"noteOn","midiNote":69,"time":9.730666666666666},{"type":"noteOff","midiNote":69,"time":9.941333333333333},{"type":"noteOn","midiNote":62,"time":10.181333333333333},{"type":"noteOn","midiNote":67,"time":10.210666666666667},{"type":"noteOff","midiNote":67,"time":11.101333333333333},{"type":"noteOn","midiNote":69,"time":11.170666666666667},{"type":"noteOff","midiNote":69,"time":11.469333333333333},{"type":"noteOff","midiNote":62,"time":11.501333333333333},{"type":"noteOn","midiNote":64,"time":11.64},{"type":"noteOn","midiNote":67,"time":11.650666666666666},{"type":"noteOff","midiNote":64,"time":13.141333333333334},{"type":"noteOff","midiNote":67,"time":13.181333333333333},{"type":"noteOn","midiNote":72,"time":13.229333333333333},{"type":"noteOff","midiNote":72,"time":13.621333333333334},{"type":"noteOn","midiNote":71,"time":13.68},{"type":"noteOn","midiNote":69,"time":14.101333333333333},{"type":"noteOff","midiNote":71,"time":14.109333333333334},{"type":"noteOff","midiNote":69,"time":14.549333333333333},{"type":"noteOn","midiNote":71,"time":14.581333333333333},{"type":"noteOn","midiNote":64,"time":14.610666666666667},{"type":"noteOff","midiNote":71,"time":15.48},{"type":"noteOn","midiNote":69,"time":15.48},{"type":"noteOff","midiNote":64,"time":15.541333333333334},{"type":"noteOff","midiNote":69,"time":15.941333333333333},{"type":"noteOn","midiNote":67,"time":15.970666666666666},{"type":"noteOn","midiNote":60,"time":15.989333333333333},{"type":"noteOn","midiNote":69,"time":16.890666666666668},{"type":"noteOff","midiNote":67,"time":16.901333333333334},{"type":"noteOff","midiNote":60,"time":17.301333333333332},{"type":"noteOff","midiNote":69,"time":17.309333333333335},{"type":"noteOn","midiNote":62,"time":17.349333333333334},{"type":"noteOn","midiNote":67,"time":17.381333333333334},{"type":"noteOff","midiNote":67,"time":18.301333333333332},{"type":"noteOn","midiNote":69,"time":18.301333333333332},{"type":"noteOff","midiNote":69,"time":18.78933333333333},{"type":"noteOff","midiNote":62,"time":18.8},{"type":"noteOn","midiNote":64,"time":18.82133333333333},{"type":"noteOn","midiNote":67,"time":18.82133333333333},{"type":"noteOn","midiNote":71,"time":20.229333333333333},{"type":"noteOff","midiNote":67,"time":20.229333333333333},{"type":"noteOn","midiNote":69,"time":21.149333333333335},{"type":"noteOff","midiNote":64,"time":21.170666666666666},{"type":"noteOff","midiNote":71,"time":21.189333333333334},{"type":"noteOn","midiNote":65,"time":21.2},{"type":"noteOff","midiNote":69,"time":21.629333333333335},{"type":"noteOn","midiNote":72,"time":21.650666666666666},{"type":"noteOff","midiNote":72,"time":22.610666666666667},{"type":"noteOn","midiNote":71,"time":22.610666666666667},{"type":"noteOff","midiNote":65,"time":23.08},{"type":"noteOn","midiNote":60,"time":23.090666666666667},{"type":"noteOn","midiNote":69,"time":23.101333333333333},{"type":"noteOff","midiNote":71,"time":23.12},{"type":"noteOff","midiNote":69,"time":23.530666666666665},{"type":"noteOn","midiNote":67,"time":23.56},{"type":"noteOn","midiNote":69,"time":23.981333333333332},{"type":"noteOff","midiNote":67,"time":23.989333333333335},{"type":"noteOff","midiNote":69,"time":24.389333333333333},{"type":"noteOff","midiNote":60,"time":24.410666666666668},{"type":"noteOn","midiNote":62,"time":24.429333333333332},{"type":"noteOn","midiNote":67,"time":24.461333333333332},{"type":"noteOff","midiNote":67,"time":25.461333333333332},{"type":"noteOff","midiNote":62,"time":25.461333333333332}];
let recordStartTime;

function getOrCreateContext() {
  if (!context) {
    context = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function noteOn(midiNote, time = context.currentTime) {
  getOrCreateContext();
  if (activeOscillators[midiNote]) {
    return; // Note is already playing
  }
  
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  
  const freq = Math.pow(2, (midiNote-69)/12)*440;
  oscillator.frequency.setValueAtTime(freq, time);
  
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  
  oscillator.start(time);
  gainNode.gain.setTargetAtTime(1, time, 0.01);
  
  activeOscillators[midiNote] = { oscillator, gainNode };

  if (isRecording) {
    recordedNotes.push({ type: 'noteOn', midiNote, time: time - recordStartTime });
  }
}

function noteOff(midiNote, time = context.currentTime) {
  if (activeOscillators[midiNote]) {
    const { oscillator, gainNode } = activeOscillators[midiNote];
    gainNode.gain.setTargetAtTime(0, time, 0.1);
    oscillator.stop(time + 0.5); // Stop after fade out
    delete activeOscillators[midiNote];

    if (isRecording) {
      recordedNotes.push({ type: 'noteOff', midiNote, time: time - recordStartTime });
    }
  }
}

const emulatedKeys = {
  q: 60, // C4
  w: 62, // D4
  e: 64, // E4
  r: 65, // F4
  t: 67, // G4
  y: 69, // A4
  u: 71, // B4
  i: 72, // C5
};

var started = false;

document.addEventListener('keydown', function(e) {
  if (!started) {
    getOrCreateContext();
    started = true;
  }
  if (emulatedKeys.hasOwnProperty(e.key)) {
    noteOn(emulatedKeys[e.key]);
  } else if (e.key === 'z') {
    startRecording();
  } else if (e.key === 'x') {
    stopRecording();
  } else if (e.key === 'c') {
    playRecording();
  }
});

document.addEventListener('keyup', function(e) {
  if (emulatedKeys.hasOwnProperty(e.key)) {
    noteOff(emulatedKeys[e.key]);
  }
});

function startRecording() {
  isRecording = true;
  recordedNotes = [];
  recordStartTime = context.currentTime;
  console.log("Recording started");
}

function stopRecording() {
  isRecording = false;
  console.log("Recording stopped");
  console.log(JSON.stringify(recordedNotes));
}

function playRecording() {
  const startTime = context.currentTime;
  recordedNotes.forEach(note => {
    if (note.type === 'noteOn') {
      noteOn(note.midiNote, startTime + note.time);
    } else if (note.type === 'noteOff') {
      noteOff(note.midiNote, startTime + note.time);
    }
  });
}

// Function to load a recording
function loadRecording(recordingData) {
  recordedNotes = JSON.parse(recordingData);
  console.log("Recording loaded");
}

