# Gemini
```
{
  "format_version": "2.0",
  "layers": [
    {
      "name": "Melody",
      "oscillatorType": "square",
      "volume": 75,
      "bpm": 120,
      "notes": [
        { "pitch": "C5", "duration": "4n" },
        { "pitch": "Eb5", "duration": "4n" },
        { "pitch": "G5", "duration": "4n" },
        { "pitch": "C6", "duration": "4n" },
        { "pitch": "Bb5", "duration": "4n" },
        { "pitch": "Ab5", "duration": "4n" },
        { "pitch": "G5", "duration": "2n" },
        { "pitch": "F5", "duration": "4n" },
        { "pitch": "G5", "duration": "4n" },
        { "pitch": "Ab5", "duration": "4n" },
        { "pitch": "Bb5", "duration": "4n" },
        { "pitch": "C6", "duration": "2n" },
        { "pitch": "fade", "duration": "2n" }
      ]
    },
    {
      "name": "Chord",
      "oscillatorType": "sine",
      "volume": 40,
      "bpm": 120,
      "notes": [
        { "pitch": ["C4", "Eb4", "G4"], "duration": "1n" },
        { "pitch": ["Ab3", "C4", "Eb4"], "duration": "1n" },
        { "pitch": ["Eb4", "G4", "Bb4"], "duration": "1n" },
        { "pitch": ["Bb3", "D4", "F4"], "duration": "2n" },
        { "pitch": "fade", "duration": "2n" }
      ]
    },
    {
      "name": "Bass",
      "oscillatorType": "triangle",
      "volume": 50,
      "bpm": 120,
      "notes": [
        { "pitch": "C2", "duration": "1n" },
        { "pitch": "Ab1", "duration": "1n" },
        { "pitch": "Eb2", "duration": "1n" },
        { "pitch": "Bb1", "duration": "2n" },
        { "pitch": "fade", "duration": "2n" }
      ]
    }
  ]
}
```

# Genspark
```
{
  "format_version": "2.0",
  "layers": [
    {
      "name": "Melody",
      "oscillatorType": "square",
      "volume": 76,
      "bpm": 110,
      "notes": [
        { "pitch": "E4", "duration": "8n", "velocity": 88 },
        { "pitch": "G4", "duration": "8n", "velocity": 92 },
        { "pitch": "A4", "duration": "4n", "velocity": 100 },
        { "pitch": "B4", "duration": "4n", "velocity": 104 },
        { "pitch": "C5", "duration": "4n", "velocity": 108 },

        { "pitch": "B4", "duration": "8n", "velocity": 96 },
        { "pitch": "A4", "duration": "8n", "velocity": 92 },
        { "pitch": "G4", "duration": "4n", "velocity": 88 },
        { "pitch": "E4", "duration": "4n", "velocity": 84 },
        { "pitch": "D4", "duration": "4n", "velocity": 82 },

        { "pitch": "G4", "duration": "8n", "velocity": 90 },
        { "pitch": "A4", "duration": "8n", "velocity": 94 },
        { "pitch": "B4", "duration": "4n", "velocity": 102 },
        { "pitch": "D5", "duration": "4n", "velocity": 110 },
        { "pitch": "C5", "duration": "4n", "velocity": 104 },

        { "pitch": "B4", "duration": "8n", "velocity": 96 },
        { "pitch": "A4", "duration": "8n", "velocity": 92 },
        { "pitch": "G4", "duration": "4n", "velocity": 88 },
        { "pitch": "E4", "duration": "2n", "velocity": 84 },

        { "pitch": "C5", "duration": "4n", "velocity": 104 },
        { "pitch": "D5", "duration": "4n", "velocity": 108 },
        { "pitch": "E5", "duration": "4n", "velocity": 114 },
        { "pitch": "G5", "duration": "4n", "velocity": 118 },

        { "pitch": "F5", "duration": "8n", "velocity": 110 },
        { "pitch": "E5", "duration": "8n", "velocity": 106 },
        { "pitch": "D5", "duration": "4n", "velocity": 102 },
        { "pitch": "C5", "duration": "4n", "velocity": 98 },
        { "pitch": "A4", "duration": "4n", "velocity": 92 },

        { "pitch": "B4", "duration": "8n", "velocity": 96 },
        { "pitch": "C5", "duration": "8n", "velocity": 100 },
        { "pitch": "D5", "duration": "4n", "velocity": 106 },
        { "pitch": "E5", "duration": "4n", "velocity": 112 },
        { "pitch": "D5", "duration": "4n", "velocity": 104 },

        { "pitch": "C5", "duration": "4n", "velocity": 100 },
        { "pitch": "B4", "duration": "4n", "velocity": 96 },
        { "pitch": "A4", "duration": "2n", "velocity": 110 },

        { "pitch": "fade", "duration": "2n" }
      ]
    },
    {
      "name": "Chord",
      "oscillatorType": "sine",
      "volume": 40,
      "bpm": 110,
      "notes": [
        { "pitch": ["A3", "C4", "E4"], "duration": "2n", "velocity": 70 },
        { "pitch": ["A3", "C4", "E4"], "duration": "2n", "velocity": 68 },

        { "pitch": ["G3", "B3", "D4"], "duration": "2n", "velocity": 68 },
        { "pitch": ["G3", "B3", "D4"], "duration": "2n", "velocity": 66 },

        { "pitch": ["E3", "G3", "B3"], "duration": "2n", "velocity": 66 },
        { "pitch": ["E3", "G3", "B3"], "duration": "2n", "velocity": 64 },

        { "pitch": ["E3", "G3", "B3"], "duration": "2n", "velocity": 64 },
        { "pitch": ["D3", "G3", "B3"], "duration": "2n", "velocity": 66 },

        { "pitch": ["C4", "E4", "G4"], "duration": "2n", "velocity": 72 },
        { "pitch": ["C4", "E4", "G4"], "duration": "2n", "velocity": 70 },

        { "pitch": ["F3", "A3", "C4"], "duration": "2n", "velocity": 74 },
        { "pitch": ["F3", "A3", "C4"], "duration": "2n", "velocity": 72 },

        { "pitch": ["G3", "B3", "D4"], "duration": "2n", "velocity": 76 },
        { "pitch": ["G3", "B3", "D4"], "duration": "2n", "velocity": 74 },

        { "pitch": ["A3", "C4", "E4"], "duration": "2n", "velocity": 80 },
        { "pitch": ["A3", "C4", "E4"], "duration": "2n", "velocity": 78 },

        { "pitch": "fade", "duration": "2n" }
      ]
    },
    {
      "name": "Bass",
      "oscillatorType": "triangle",
      "volume": 52,
      "bpm": 110,
      "notes": [
        { "pitch": "A2", "duration": "2n", "velocity": 82 },
        { "pitch": "E2", "duration": "2n", "velocity": 76 },

        { "pitch": "G2", "duration": "2n", "velocity": 80 },
        { "pitch": "D2", "duration": "2n", "velocity": 74 },

        { "pitch": "E2", "duration": "2n", "velocity": 78 },
        { "pitch": "B1", "duration": "2n", "velocity": 72 },

        { "pitch": "E2", "duration": "2n", "velocity": 78 },
        { "pitch": "D2", "duration": "2n", "velocity": 72 },

        { "pitch": "C2", "duration": "2n", "velocity": 80 },
        { "pitch": "G1", "duration": "2n", "velocity": 74 },

        { "pitch": "F2", "duration": "2n", "velocity": 82 },
        { "pitch": "C2", "duration": "2n", "velocity": 76 },

        { "pitch": "G2", "duration": "2n", "velocity": 84 },
        { "pitch": "D2", "duration": "2n", "velocity": 78 },

        { "pitch": "A2", "duration": "2n", "velocity": 88 },
        { "pitch": "E2", "duration": "2n", "velocity": 80 },

        { "pitch": "fade", "duration": "2n" }
      ]
    }
  ]
}
```