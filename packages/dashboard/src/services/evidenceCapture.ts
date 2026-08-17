/**
 * Evidence capture for the mobile node.
 *
 * On every detection the phone grabs a short audio clip (live mic recording
 * when the mic is armed, otherwise a synthesized signature) and a camera
 * frame, uploads both out-of-band to the backend, and the returned URLs ride
 * inside the LoRa alert packet so the dashboard can play the evidence back.
 */

type ScenarioKind = 'gunshot' | 'chainsaw' | 'fire';

let cameraStream: MediaStream | null = null;

// ---------------------------------------------------------------------------
// Audio — record the live mic, or synthesize a signature clip offline
// ---------------------------------------------------------------------------

/** Record ~3.5 s from the armed mic stream; falls back to synthesis. */
export async function captureAudioClip(
  micStream: MediaStream | null,
  kind: ScenarioKind
): Promise<{ dataUrl: string; mime: string } | null> {
  if (micStream && typeof MediaRecorder !== 'undefined') {
    try {
      const blob = await recordStream(micStream, 3500);
      if (blob.size > 1000) {
        const mime = blob.type || 'audio/webm';
        return { dataUrl: await blobToDataURL(blob), mime };
      }
    } catch {
      // fall through to synthesis
    }
  }
  return synthesizeClip(kind);
}

function recordStream(stream: MediaStream, ms: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const recorder = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
    recorder.onerror = () => reject(new Error('MediaRecorder error'));
    recorder.start();
    setTimeout(() => recorder.stop(), ms);
  });
}

/** Offline-render a recognizable signature so evidence exists even without mic access. */
async function synthesizeClip(kind: ScenarioKind): Promise<{ dataUrl: string; mime: string } | null> {
  try {
    const rate = 16000;
    const seconds = kind === 'gunshot' ? 1.4 : 3;
    const ctx = new OfflineAudioContext(1, rate * seconds, rate);

    if (kind === 'gunshot') {
      // Sharp broadband impulse with a fast exponential decay + one echo
      const buffer = ctx.createBuffer(1, rate * seconds, rate);
      const data = buffer.getChannelData(0);
      const impulse = (start: number, gain: number) => {
        for (let i = 0; i < rate * 0.25; i++) {
          const t = i / rate;
          data[start + i] += (Math.random() * 2 - 1) * gain * Math.exp(-t * 28);
        }
      };
      impulse(Math.floor(rate * 0.1), 0.9);
      impulse(Math.floor(rate * 0.65), 0.25); // echo
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
    } else if (kind === 'chainsaw') {
      // Sustained low-band harmonic buzz with throttle wobble
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 110;
      const wobble = ctx.createOscillator();
      wobble.frequency.value = 7;
      const wobbleGain = ctx.createGain();
      wobbleGain.gain.value = 18;
      wobble.connect(wobbleGain).connect(osc.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0.35;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      wobble.start();
    } else {
      // Fire — filtered broadband crackle noise
      const buffer = ctx.createBuffer(1, rate * seconds, rate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const crackle = Math.random() < 0.002 ? Math.random() * 0.8 : 0;
        data[i] = (Math.random() * 2 - 1) * 0.12 + crackle;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3800;
      src.connect(lowpass).connect(ctx.destination);
      src.start();
    }

    const rendered = await ctx.startRendering();
    return { dataUrl: audioBufferToWavDataURL(rendered), mime: 'audio/wav' };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Photo — one frame from the device camera
// ---------------------------------------------------------------------------

/** Grab a single camera frame. Returns null if the camera is unavailable. */
export async function capturePhoto(): Promise<string | null> {
  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 } },
        audio: false,
      });
      // Let auto-exposure settle before grabbing the frame
      await new Promise((r) => setTimeout(r, 900));
    }
    const video = document.createElement('video');
    video.srcObject = cameraStream;
    video.muted = true;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    video.pause();
    return canvas.toDataURL('image/jpeg', 0.75);
  } catch {
    return null; // camera denied/unavailable — evidence is best-effort
  }
}

// ---------------------------------------------------------------------------
// Upload + encoding helpers
// ---------------------------------------------------------------------------

/** Upload evidence to the backend; returns the public URL (or null). */
export async function uploadEvidence(
  nodeId: string,
  kind: 'audio' | 'image',
  dataUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(`/api/node-ingest/${nodeId}/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, data: dataUrl }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { url: string };
    return body.url;
  } catch {
    return null;
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/** Encode an AudioBuffer as a 16-bit PCM WAV dataURL. */
function audioBufferToWavDataURL(buffer: AudioBuffer): string {
  const samples = buffer.getChannelData(0);
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const bytes = new Uint8Array(arrayBuffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}
