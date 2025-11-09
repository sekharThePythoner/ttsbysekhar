import React, { useEffect, useState, useRef } from 'react';

// Single-file React component for a Text → Voice web tool.
// - TailwindCSS classes are used for styling (no Tailwind import here).
// - Uses the Web Speech API (speechSynthesis) for in-browser TTS playback.
// - Includes voice selection, rate, pitch, volume, and basic presets.
// - Attempts to prefer Indian voices (en-IN / hi-IN / names containing "India" or "Hindi").
// - Provides a placeholder "Export (server)" flow for creating downloadable audio via an external TTS API.
// - Credit added: Sekhar Yadav

export default function TextToVoiceTool() {
  const [text, setText] = useState('Hello — type something and press Speak! Try: "Namaste, mera naam Sekhar Yadav hai."');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const utteranceRef = useRef(null);

  // Load voices — browsers may populate them asynchronously
  useEffect(() => {
    const synth = window.speechSynthesis;
    function load() {
      const list = synth.getVoices();
      setVoices(list);
      if (list.length > 0) {
        // try to auto-select a voice that sounds Indian
        const indianMatch = list.find((v) => {
          const name = (v.name || '').toLowerCase();
          const lang = (v.lang || '').toLowerCase();
          return /en-in|hi-in|hi|india|indian|hindi/.test(lang) || /india|indian|hindi/.test(name);
        });
        if (indianMatch) {
          setSelectedVoice(indianMatch.name);
        } else {
          setSelectedVoice(list[0].name);
        }
        setLoadingVoices(false);
      }
    }

    load();
    // Some browsers emit 'voiceschanged' when ready
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, []);

  // create a SpeechSynthesisUtterance with current settings
  function makeUtterance() {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = pitch;
    u.volume = volume;
    const voice = voices.find((v) => v.name === selectedVoice);
    if (voice) u.voice = voice;
    return u;
  }

  function handleSpeak() {
    if (!text.trim()) return;
    // stop any existing speech
    window.speechSynthesis.cancel();
    const u = makeUtterance();
    utteranceRef.current = u;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(u);
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  // Presets for quick testing
  const presets = [
    { name: 'Short & Clear', rate: 1.05, pitch: 1 },
    { name: 'Slow & Calm', rate: 0.8, pitch: 0.9 },
    { name: 'Energetic', rate: 1.3, pitch: 1.2 },
  ];

  // Example server export flow — frontend part only.
  // Many TTS services return audio (mp3/wav) for given text — here we POST to /api/tts
  // The server must handle the TTS provider and return a binary audio blob.
  async function handleExportServer() {
    if (!text.trim()) return;
    try {
      // Example payload — adapt to your backend TTS API
      const payload = {
        text,
        voice: selectedVoice,
        rate,
        pitch,
        volume,
        credit: 'Sekhar Yadav',
      };
      // Show a native file download once server returns audio
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tts-output.wav';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed — implement /api/tts or check server logs. ' + err.message);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white/5 rounded-2xl shadow-lg">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Text → Voice (Web)</h1>
        <div className="text-xs opacity-90 mt-1">Created by <strong>Sekhar Yadav</strong></div>
        <p className="text-sm opacity-80 mt-2">In-browser playback using the Web Speech API. The app will try to auto-select an Indian voice (if your browser/OS provides one). Use "Export (server)" to produce downloadable audio via your backend — the export payload includes a credit field with your name.</p>
      </header>

      <label className="block mb-2 text-sm">Enter text</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full p-3 rounded-md border bg-transparent resize-vertical"
        placeholder="Type or paste text here..."
      />

      <div className="flex gap-4 mt-4 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm mb-1">Voice</label>
          <select
            value={selectedVoice || ''}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full p-2 rounded-md"
          >
            {loadingVoices && <option>Loading voices…</option>}
            {!loadingVoices && voices.length === 0 && <option>No voices available</option>}
            {voices.map((v) => (
              <option key={v.name + v.lang} value={v.name}>
                {v.name} — {v.lang}{v.default ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-sm mb-1">Rate</label>
          <input type="range" min="0.5" max="2" step="0.05" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          <div className="text-xs mt-1">{rate.toFixed(2)}x</div>
        </div>

        <div className="w-36">
          <label className="block text-sm mb-1">Pitch</label>
          <input type="range" min="0.5" max="2" step="0.05" value={pitch} onChange={(e) => setPitch(Number(e.target.value))} />
          <div className="text-xs mt-1">{pitch.toFixed(2)}</div>
        </div>

        <div className="w-36">
          <label className="block text-sm mb-1">Volume</label>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
          <div className="text-xs mt-1">{Math.round(volume * 100)}%</div>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={handleSpeak}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium disabled:opacity-60"
          disabled={isSpeaking}
        >
          Speak
        </button>

        <button
          onClick={handleStop}
          className="px-4 py-2 rounded-md border bg-transparent text-sm"
          disabled={!isSpeaking}
        >
          Stop
        </button>

        <div className="ml-auto flex gap-2">
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setRate(p.rate);
                setPitch(p.pitch);
              }}
              className="px-3 py-1 rounded-md border text-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t pt-4 flex items-center gap-3">
        <button onClick={handleExportServer} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Export (server)</button>
        <div className="text-sm opacity-80">
          To enable downloads, implement <code className="bg-black/10 px-1 rounded">POST /api/tts</code> that returns audio (wav/mp3). This keeps the frontend simple and lets you pick any TTS provider on the server. The exported payload includes a <code>credit</code> field set to "Sekhar Yadav".
        </div>
      </div>

      <footer className="mt-6 text-xs opacity-80">
        <div>Notes:</div>
        <ul className="list-disc pl-5 mt-1">
          <li>Browser TTS playback uses the device's available voices (varies by OS/browser). The component tries to auto-select Indian-style voices when available.</li>
          <li>Directly recording SpeechSynthesis output in the browser is not standardized; server-side TTS is the reliable way to get downloadable audio.</li>
          <li>For better, natural Indian voices, integrate a cloud TTS (Amazon Polly, Google Cloud TTS, Azure, OpenAI, etc.) on the server side and include <code>credit: 'Sekhar Yadav'</code> in the metadata if you want the audio to carry that credit.</li>
        </ul>
        <div className="mt-3 text-right text-sm opacity-90">Made with ❤️ by <strong>Sekhar Yadav</strong></div>
      </footer>
    </div>
  );
}
