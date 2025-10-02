let libraryPromise = null;

export function loadCustomerSpriteLibrary() {
  if (libraryPromise) return libraryPromise;
  libraryPromise = fetchCustomerManifest().then(buildLibrary);
  return libraryPromise;
}

async function fetchCustomerManifest() {
  const url = new URL('../assets/customers/manifest.json', import.meta.url);
  const response = await fetch(url.href, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load customer manifest (${response.status})`);
  }
  return response.json();
}

async function buildLibrary(manifest) {
  const sheets = new Map();
  const frames = [];
  const manifestUrl = new URL('../assets/customers/manifest.json', import.meta.url);

  manifest?.files?.forEach((entry) => {
    const parsed = parseFrame(entry?.fileName);
    if (!parsed) return;
    const { sheet, mood, pose } = parsed;

    let sheetInfo = sheets.get(sheet);
    if (!sheetInfo) {
      sheetInfo = { name: sheet, moods: Object.create(null) };
      sheets.set(sheet, sheetInfo);
    }

    const moodInfo = sheetInfo.moods[mood] || { walking: null, idle: null, talking: null };
    const frame = createFrame(entry, manifestUrl, mood, pose);
    moodInfo[pose] = frame;
    sheetInfo.moods[mood] = moodInfo;
    frames.push(frame);
  });

  await Promise.all(frames.map(loadFrameImage));

  const sheetList = Array.from(sheets.values()).map((sheet) => ({
    ...sheet,
    moods: { ...sheet.moods },
  }));

  return {
    sheets,
    sheetList,
    get paradeEntries() {
      return buildParadeEntries(sheetList);
    },
    getFrame(sheetName, mood, pose) {
      const sheet = sheets.get(sheetName);
      if (!sheet) return null;
      return sheet.moods?.[mood]?.[pose] || null;
    },
  };
}

function parseFrame(fileName) {
  if (typeof fileName !== 'string') return null;
  const bare = fileName.replace(/\.png$/i, '');
  const parts = bare.split('_');
  if (parts.length < 3) return null;
  const pose = parts.pop();
  const mood = parts.pop();
  const sheet = parts.join('_');
  if (!sheet || !mood || !pose) return null;
  return { sheet, mood, pose };
}

function createFrame(entry, baseUrl, mood, pose) {
  const url = new URL(entry.fileName, baseUrl);
  const width = entry?.size?.width ?? 0;
  const height = entry?.size?.height ?? 0;
  return {
    fileName: entry.fileName,
    url: url.href,
    mood,
    pose,
    width,
    height,
    image: null,
  };
}

function loadFrameImage(frame) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = frame.url;
    frame.image = img;
    if (img.complete && img.naturalWidth > 0) {
      resolve(frame);
      return;
    }
    img.addEventListener('load', () => resolve(frame), { once: true });
    img.addEventListener('error', () => resolve(frame), { once: true });
  });
}

function buildParadeEntries(sheetList) {
  const desiredOrder = ['happy', 'neutral', 'angry'];
  const entries = [];

  sheetList.forEach((sheet) => {
    desiredOrder.forEach((mood) => {
      const moodFrames = sheet.moods?.[mood];
      if (!moodFrames?.walking || !moodFrames?.idle || !moodFrames?.talking) return;
      entries.push({
        sheet: sheet.name,
        mood,
        frames: moodFrames,
      });
    });
  });

  return entries;
}
