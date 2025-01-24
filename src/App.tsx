import React, { useState, useRef, useEffect } from 'react';
    import { Volume2, Download, Trash2, Music, Play, Square } from 'lucide-react';

    // Define sound presets
    const SOUND_PRESETS = {
      piano: {
        name: 'Piano',
        baseFreq: 261.63, // C4
        waveform: 'sine',
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.3,
          release: 0.4
        }
      },
      bass: {
        name: 'Baixo',
        baseFreq: 82.41,  // E2
        waveform: 'square',
        envelope: {
          attack: 0.03,
          decay: 0.2,
          sustain: 0.2,
          release: 0.5
        }
      },
      cello: {
        name: 'Cello',
        baseFreq: 65.41, // C2
        waveform: 'triangle',
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.3,
          release: 0.6
        }
      },
      flute: {
        name: 'Flauta',
        baseFreq: 523.25, // C5
        waveform: 'sine',
        envelope: {
          attack: 0.05,
          decay: 0.1,
          sustain: 0.4,
          release: 0.3
        }
      },
      xylophone: {
        name: 'Xilofone',
        baseFreq: 392.00, // G4
        waveform: 'sine',
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0,
          release: 0.3
        }
      },
      marimba: {
        name: 'Marimba',
        baseFreq: 440.00, // A4
        waveform: 'sine',
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0,
          release: 0.4
        }
      },
      notification: {
        name: 'Notificação',
        baseFreq: 1046.50, // C6 - perfect for alerts
        waveform: 'sine',
        envelope: {
          attack: 0.01,
          decay: 0.05,
          sustain: 0.1,
          release: 0.2
        }
      }
    };

    function App() {
      const [text, setText] = useState('');
      const [selectedPreset, setSelectedPreset] = useState('piano');
      const [isPlaying, setIsPlaying] = useState(false);
      const audioContextRef = useRef<AudioContext | null>(null);
      const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

      useEffect(() => {
        const initAudioContext = () => {
          if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
          }
        };

        document.addEventListener('click', initAudioContext, { once: true });
        return () => {
          document.removeEventListener('click', initAudioContext);
          if (playbackTimeoutRef.current) {
            clearTimeout(playbackTimeoutRef.current);
          }
        };
      }, []);

      const playNote = (char: string, time = 0) => {
        if (!audioContextRef.current) return;

        const preset = SOUND_PRESETS[selectedPreset as keyof typeof SOUND_PRESETS];
        const freq = preset.baseFreq * (1 + (char.charCodeAt(0) % 12) / 12);
        const currentTime = audioContextRef.current.currentTime + time;

        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();

        oscillator.type = preset.waveform as OscillatorType;
        oscillator.frequency.setValueAtTime(freq, currentTime);

        // Apply ADSR envelope
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.7, currentTime + preset.envelope.attack);
        gainNode.gain.linearRampToValueAtTime(
          preset.envelope.sustain * 0.7,
          currentTime + preset.envelope.attack + preset.envelope.decay
        );
        gainNode.gain.linearRampToValueAtTime(
          0,
          currentTime + preset.envelope.attack + preset.envelope.decay + preset.envelope.release
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);

        oscillator.start(currentTime);
        oscillator.stop(
          currentTime +
            preset.envelope.attack +
            preset.envelope.decay +
            preset.envelope.release
        );
      };

      const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key.length === 1) {
          playNote(e.key);
        }
      };

      const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newChar = e.target.value.slice(-1);
        if (newChar) {
          playNote(newChar);
        }
        setText(e.target.value);
      };

      const clearText = () => {
        setText('');
        if (isPlaying) {
          stopPlayback();
        }
      };

      const playText = () => {
        if (!text || isPlaying) return;
        setIsPlaying(true);

        let time = 0;
        const interval = 0.2;

        text.split('').forEach((char, index) => {
          playbackTimeoutRef.current = setTimeout(() => {
            playNote(char);
            if (index === text.length - 1) {
              setIsPlaying(false);
            }
          }, time * 1000);
          time += interval;
        });
      };

      const stopPlayback = () => {
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
        }
        setIsPlaying(false);
      };

      const downloadAudio = async () => {
        if (!audioContextRef.current || !text) return;

        const filename = prompt('Digite o nome do arquivo:', 'soundtype-melody.wav');
        if (!filename) return;

        const offlineContext = new OfflineAudioContext({
          numberOfChannels: 2,
          length: 44100 * (text.length * 0.2 + 0.5),
          sampleRate: 44100,
        });

        let time = 0;
        const interval = 0.2;

        text.split('').forEach((char) => {
          const preset = SOUND_PRESETS[selectedPreset as keyof typeof SOUND_PRESETS];
          const freq = preset.baseFreq * (1 + (char.charCodeAt(0) % 12) / 12);

          const oscillator = offlineContext.createOscillator();
          const gainNode = offlineContext.createGain();

          oscillator.type = preset.waveform as OscillatorType;
          oscillator.frequency.setValueAtTime(freq, time);

          // Apply ADSR envelope for offline rendering
          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(0.7, time + preset.envelope.attack);
          gainNode.gain.linearRampToValueAtTime(
            preset.envelope.sustain * 0.7,
            time + preset.envelope.attack + preset.envelope.decay
          );
          gainNode.gain.linearRampToValueAtTime(
            0,
            time + preset.envelope.attack + preset.envelope.decay + preset.envelope.release
          );

          oscillator.connect(gainNode);
          gainNode.connect(offlineContext.destination);

          oscillator.start(time);
          oscillator.stop(
            time + preset.envelope.attack + preset.envelope.decay + preset.envelope.release
          );

          time += interval;
        });

        const audioBuffer = await offlineContext.startRendering();

        const numberOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;
        const wavBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(wavBuffer);

        const writeString = (view: DataView, offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length * 2, true);

        const channel = audioBuffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
          const sample = Math.max(-1, Math.min(1, channel[i]));
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
          offset += 2;
        }

        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
          <div className="max-w-4xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <Music className="w-8 h-8 text-purple-600" />
                SoundType
              </h1>
              <p className="text-gray-600">
                Crie sons de notificação e toques personalizados
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
              <div className="flex gap-4 mb-4">
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Object.entries(SOUND_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={isPlaying ? stopPlayback : playText}
                  disabled={!text}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    text ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300'
                  } text-white transition-colors`}
                >
                  {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Parar' : 'Reproduzir'}
                </button>

                <button
                  onClick={downloadAudio}
                  disabled={!text}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    text ? 'bg-purple-500 hover:bg-purple-600' : 'bg-gray-300'
                  } text-white transition-colors`}
                >
                  <Download className="w-4 h-4" />
                  Baixar WAV
                </button>

                <button
                  onClick={clearText}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </button>
              </div>

              <textarea
                value={text}
                onChange={handleTextChange}
                onKeyPress={handleKeyPress}
                placeholder="Digite algo para criar sons de notificação..."
                className="w-full h-48 p-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            <div className="bg-purple-50 rounded-xl p-6">
              <div className="flex items-center gap-3 text-purple-700 mb-4">
                <Volume2 className="w-5 h-5" />
                <h2 className="font-semibold">Como funciona:</h2>
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Escolha um tipo de som no menu suspenso</li>
                <li>Digite no campo de texto para criar seu som</li>
                <li>Use o botão de reprodução para ouvir o resultado</li>
                <li>Ao clicar em baixar, digite o nome do arquivo e baixe sua criação em formato WAV</li>
                <li>Experimente diferentes combinações para criar sons únicos!</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    export default App;
