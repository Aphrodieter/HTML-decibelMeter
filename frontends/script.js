const textField = document.getElementById("textField");
const buzzerAudio = document.getElementById("buzzerAudio");
const thresholdInput = document.getElementById("thresholdInput");
const startButton = document.getElementById("startButton");
const volumeBar = document.getElementById("volumeBar");
const volumeBarContainer = document.getElementById("volumeBarContainer");
const thresholdBar = document.getElementById("thresholdBar");
const textFieldMaxValue = document.getElementById("textFieldMaxValue");
const resetMaxValueButton = document.getElementById("resetMaxValue");
const audioContext = new AudioContext();

let threshold = thresholdInput.value; // Schwellenwert für Lautstärke
thresholdBar.style.bottom = `${Math.min(threshold, 100)}%`;

thresholdInput.addEventListener("change", (event) => {
  threshold = parseFloat(event.target.value);
  thresholdBar.style.bottom = `${Math.min(threshold, 100)}%`;
});

let started = false;
startButton.addEventListener("click", () => {
  if (audioContext.state === "suspended") {
    console.log("audio context resume");
    audioContext.resume();
  }

  if (startButton.dataset.started === "false") {
    started = true;
    startButton.innerText = "STOP";
    startButton.classList.add("pressed");
    startButton.dataset.started = "true";
  } else if (startButton.dataset.started === "true") {
    started = false;
    startButton.innerText = "START";
    startButton.classList.remove("pressed");

    startButton.dataset.started = "false";
  }
});

let maxdBValue = 0;
resetMaxValueButton.addEventListener("click", () => {
  maxdBValue = 0;
});
getMicrophones();
let lastRMSUpdate = 0;
const rmsUpdateInterval = 200;
let activeStream = null;
let activeSource = null;
let activeAnalyser = null;
let monitorRequest = null;
async function startMonitoring(stream) {
  try {
    if (activeStream) activeStream.getTracks().forEach((track) => track.stop());
    if (activeSource && activeAnalyser) {
      activeSource.disconnect();
      activeAnalyser.disconnect();
    }
    activeStream = stream;
    // Zugriff auf das Mikrofon
    activeSource = audioContext.createMediaStreamSource(activeStream);

    // AnalyserNode für Pegelanalyse
    activeAnalyser = audioContext.createAnalyser();
    activeAnalyser.fftSize = 4096; // Kürzere FFT für schnellere Reaktion
    activeSource.connect(activeAnalyser);

    // Daten-Array erstellen
    const dataArray = new Float32Array(activeAnalyser.frequencyBinCount);
    if (monitorRequest) {
      cancelAnimationFrame(monitorRequest);
    }
    function monitor() {
      // Audiodaten abrufen
      activeAnalyser.getFloatTimeDomainData(dataArray);

      // Berechnung des RMS (Root Mean Square)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i]; //(dataArray[i] - 128) / 128; // Normalisieren
        sum += value * value;
      }
      const rms = Math.sqrt(sum / dataArray.length); // * 128;
      let calibrationOffset = 100;
      let db = rms >= 0.0000000001 ? 20 * Math.log10(rms) : -99999;
      db += calibrationOffset;

      let barFilled = 100 - Math.min(db, 100);
      volumeBar.style.clipPath = `inset(${barFilled}% 0px 0px 0px)`;
      let now = Date.now();
      if (now - lastRMSUpdate >= rmsUpdateInterval) {
        textField.innerText = `dB Value: ${db.toFixed(0)}`;
        lastRMSUpdate = now;
      }
      if (db > maxdBValue) {
        maxdBValue = db;
        textFieldMaxValue.innerText = `Max Value: ${maxdBValue.toFixed(0)}`;
      }

      // Schwellenwert überprüfen
      if (db > threshold && started) {
        buzzerAudio.play();
      }

      monitorRequest = requestAnimationFrame(monitor); // Wiederholen
    }

    monitor();
  } catch (err) {
    console.error("Fehler beim Zugriff auf das Mikrofon:", err);
  }
}

// Überwachung starten

const micSelect = document.getElementById("microphone-select");
const status = document.getElementById("status");
const audio = document.getElementById("audio");

async function getMicrophones() {
  try {
    // Request microphone permissions
    await navigator.mediaDevices.getUserMedia({ audio: true });

    // List available devices
    const devices = await navigator.mediaDevices.enumerateDevices();

    // Filter for audio input devices (microphones)
    const mics = devices.filter((device) => device.kind === "audioinput");

    // Populate the dropdown
    micSelect.innerHTML = mics
      .map(
        (mic) =>
          `<option value="${mic.deviceId}">${
            mic.label || "Unnamed Microphone"
          }</option>`
      )
      .join("");

    status.textContent = "Microphones loaded. Select one to use.";
    changeMicrophone(mics[0].deviceId);
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
}

async function changeMicrophone(deviceId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: deviceId ? { exact: deviceId } : undefined },
    });
    startMonitoring(stream);
  } catch (err) {
    console.log(err);
  }
}

// Load microphones on page load

// Change microphone on selection
micSelect.addEventListener("change", () => {
  const selectedDeviceId = micSelect.value;
  changeMicrophone(selectedDeviceId);
});
