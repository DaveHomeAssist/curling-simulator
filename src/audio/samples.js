const SAMPLE_FILES = [
  'crowd-ambient.mp3',
  'crowd-cheer.mp3',
  'crowd-groan.mp3',
  'skip-hard.mp3',
  'skip-whoa.mp3',
];

function sampleKey(fileName) {
  return fileName.replace(/\.[^.]+$/, '');
}

async function decodeAudioData(audioCtx, arrayBuffer) {
  if (typeof audioCtx.decodeAudioData !== 'function') {
    return arrayBuffer;
  }
  if (audioCtx.decodeAudioData.length >= 2) {
    return new Promise((resolve, reject) => {
      audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }
  return audioCtx.decodeAudioData(arrayBuffer);
}

function normalizeBasePath(basePath) {
  if (!basePath) {
    return '';
  }
  return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

export async function loadSamples(audioCtx, basePath = '') {
  const loaded = new Map();
  const prefix = normalizeBasePath(basePath);

  for (const fileName of SAMPLE_FILES) {
    try {
      const response = await fetch(`${prefix}${fileName}`);
      if (!response?.ok) {
        console.warn(`Failed to load audio sample: ${fileName}`);
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await decodeAudioData(audioCtx, arrayBuffer);
      loaded.set(sampleKey(fileName), decoded);
    } catch (error) {
      console.warn(`Failed to load audio sample: ${fileName}`, error);
    }
  }

  return loaded;
}

export function playSample(audioCtx, buffer, volume = 1) {
  if (!buffer || typeof audioCtx.createBufferSource !== 'function') {
    return null;
  }

  const source = audioCtx.createBufferSource();
  const gain = typeof audioCtx.createGain === 'function' ? audioCtx.createGain() : null;
  source.buffer = buffer;

  if (gain) {
    gain.gain.value = volume;
    source.connect(gain);
    if (audioCtx.destination) {
      gain.connect(audioCtx.destination);
    }
  } else if (audioCtx.destination) {
    source.connect(audioCtx.destination);
  }

  if (typeof source.start === 'function') {
    source.start(0);
  }

  return source;
}
