midi sample
===
```
Create : 2023.08.219
Author : Yugeta.Koji
```

# Coin
```
T600O6BT100O7E~
```

# 1up
```
T450O7EGO8ECDG
```

# ドカン
```
T3000O7EO6ADO7EO6ADO5GCO4FO3B T800S T3000O7EO6ADO7EO6ADO5GCO4FO3B T800S T3000O7EO6ADO7EO6ADO5GCO4FO3B
```

# ドラクエの階段上り下り
```
T4000 [O5fO6fO7f][O2cO3cO4c][O4eO5eO6e][O3bO4bO5b] T300S T4000 [O5fO6fO7f][O2cO3cO4c][O4eO5eO6e][O3bO4bO5b] T300S T4000 [O5fO6fO7f][O2cO3cO4c][O4eO5eO6e][O3bO4bO5b] T300S T4000 [O5fO6fO7f][O2cO3cO4c][O4eO5eO6e][O3bO4bO5b] T300S
```


# AI作曲

## Chat GPT
- RPGオープニングテーマ
```
{
    "bpm": 110,
    "notes": [
        { "pitch": ["C4", "E4", "G4"], "duration": "2n", "velocity": 80 },
        { "pitch": ["F4", "A4", "C5"], "duration": "2n", "velocity": 85 },

        { "pitch": "E4", "duration": "8n" },
        { "pitch": "G4", "duration": "8n" },
        { "pitch": "A4", "duration": "4n" },
        { "pitch": "G4", "duration": "4n" },
        { "pitch": "E4", "duration": "2n" },

        { "pitch": ["G3", "B3", "D4"], "duration": "2n", "velocity": 75 },
        { "pitch": ["A3", "C4", "E4"], "duration": "2n", "velocity": 75 },

        { "pitch": "C5", "duration": "4n" },
        { "pitch": "B4", "duration": "8n" },
        { "pitch": "A4", "duration": "8n" },
        { "pitch": "G4", "duration": "4n" },
        { "pitch": "E4", "duration": "2n" },

        { "pitch": ["F4", "A4", "C5"], "duration": "2n", "velocity": 90 },
        { "pitch": ["G4", "B4", "D5"], "duration": "2n", "velocity": 95 },

        { "pitch": "A4", "duration": "4n." },
        { "pitch": "G4", "duration": "8n" },
        { "pitch": "F4", "duration": "4n" },
        { "pitch": "E4", "duration": "4n" },
        { "pitch": "D4", "duration": "2n" },

        { "pitch": ["C4", "E4", "G4", "C5"], "duration": "1n", "velocity": 110 },
        { "pitch": "fade", "duration": "2n" }

    ]
}
```

- ver2
```
{
    "bpm": 95,
    "notes": [
        { "pitch": "A3", "duration": "4n", "velocity": 70 },
        { "pitch": "C4", "duration": "4n", "velocity": 70 },
        { "pitch": "E4", "duration": "4n", "velocity": 70 },
        { "pitch": "A4", "duration": "4n", "velocity": 72 },

        { "pitch": ["A3", "E4"], "duration": "2n", "velocity": 70 },
        { "pitch": ["G3", "D4"], "duration": "2n", "velocity": 70 },

        { "pitch": "F4", "duration": "4n", "velocity": 72 },
        { "pitch": "E4", "duration": "4n", "velocity": 70 },
        { "pitch": "D4", "duration": "4n", "velocity": 70 },
        { "pitch": "C4", "duration": "4n", "velocity": 70 },

        { "pitch": ["F3", "C4"], "duration": "2n", "velocity": 70 },
        { "pitch": ["E3", "B3"], "duration": "2n", "velocity": 70 },

        { "pitch": "A3", "duration": "8n", "velocity": 70 },
        { "pitch": "C4", "duration": "8n", "velocity": 70 },
        { "pitch": "E4", "duration": "4n", "velocity": 72 },
        { "pitch": "G4", "duration": "4n", "velocity": 75 },
        { "pitch": "A4", "duration": "2n", "velocity": 75 },

        { "pitch": ["A3", "E4", "C5"], "duration": "2n", "velocity": 72 },
        { "pitch": ["D4", "F4", "A4"], "duration": "2n", "velocity": 72 },

        { "pitch": "B4", "duration": "4n.", "velocity": 74 },
        { "pitch": "A4", "duration": "8n", "velocity": 72 },
        { "pitch": "G4", "duration": "4n", "velocity": 72 },
        { "pitch": "E4", "duration": "4n", "velocity": 70 },
        { "pitch": "D4", "duration": "2n", "velocity": 70 },

        { "pitch": ["A3", "C4", "E4", "A4"], "duration": "1n", "velocity": 75 },
        { "pitch": "fade", "duration": "2n" }

    ]
}
```

## Microsoft Copilop
```
{
  "bpm": 108,
  "notes": [
    { "pitch": ["C4", "G4", "C5"], "duration": "2n", "velocity": 90 },
    { "pitch": "E4", "duration": "4n" },
    { "pitch": "G4", "duration": "4n" },

    { "pitch": ["F4", "A4", "C5"], "duration": "2n", "velocity": 90 },
    { "pitch": "A4", "duration": "4n" },
    { "pitch": "C5", "duration": "4n" },

    { "pitch": ["G4", "B4", "D5"], "duration": "2n", "velocity": 95 },
    { "pitch": "B4", "duration": "4n" },
    { "pitch": "D5", "duration": "4n" },

    { "pitch": ["C5", "E5", "G5"], "duration": "2n", "velocity": 100 },
    { "pitch": "E5", "duration": "4n" },
    { "pitch": "G5", "duration": "4n" },

    { "pitch": "rest", "duration": "8n" },

    { "pitch": ["A4", "C5", "E5"], "duration": "2n", "velocity": 90 },
    { "pitch": "C5", "duration": "4n" },
    { "pitch": "E5", "duration": "4n" },

    { "pitch": ["D5", "F#5", "A5"], "duration": "2n", "velocity": 95 },
    { "pitch": "F#5", "duration": "4n" },
    { "pitch": "A5", "duration": "4n" },

    { "pitch": ["G4", "B4", "D5"], "duration": "2n", "velocity": 100 },
    { "pitch": "B4", "duration": "4n" },
    { "pitch": "D5", "duration": "4n" },

    { "pitch": ["C5", "E5", "G5"], "duration": "1n", "velocity": 110 },
    { "pitch": "fade", "duration": "2n" }
  ]
}
```

## Gemini
```
{
  "bpm": 120,
  "notes": [
    { "pitch": ["C4", "E4", "G4"], "duration": "4n" },
    { "pitch": "rest", "duration": "8n" },
    { "pitch": ["C4", "E4", "G4"], "duration": "4n" },
    { "pitch": "rest", "duration": "8n" },
    { "pitch": ["F4", "A4", "C5"], "duration": "4n" },
    { "pitch": "rest", "duration": "8n" },
    { "pitch": ["G4", "B4", "D5"], "duration": "4n" },
    { "pitch": "rest", "duration": "8n" },
    { "pitch": "G4", "duration": "8n" },
    { "pitch": "C5", "duration": "8n" },
    { "pitch": "E5", "duration": "4n" },
    { "pitch": "D5", "duration": "4n" },
    { "pitch": "C5", "duration": "4n" },
    { "pitch": "B4", "duration": "8n" },
    { "pitch": "A4", "duration": "8n" },
    { "pitch": "G4", "duration": "2n" },
    { "pitch": ["C4", "E4", "G4", "C5"], "duration": "1n" }
  ]
}
```

## Claude
> bak

```
{
  "bpm": 92,
  "notes": [
    { "pitch": "G4", "duration": "8n", "velocity": 80 },
    { "pitch": "G4", "duration": "8n", "velocity": 70 },
    { "pitch": "G4", "duration": "8n", "velocity": 75 },
    { "pitch": "Eb4", "duration": "4n.", "velocity": 90 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 85 },

    { "pitch": "G4", "duration": "4n", "velocity": 90 },
    { "pitch": "Eb4", "duration": "4n.", "velocity": 80 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 85 },
    { "pitch": "G4", "duration": "2n", "velocity": 95 },

    { "pitch": "D5", "duration": "8n", "velocity": 80 },
    { "pitch": "D5", "duration": "8n", "velocity": 70 },
    { "pitch": "D5", "duration": "8n", "velocity": 75 },
    { "pitch": "Eb5", "duration": "4n.", "velocity": 90 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 80 },

    { "pitch": "F#4", "duration": "4n", "velocity": 85 },
    { "pitch": "Eb4", "duration": "4n.", "velocity": 80 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 80 },
    { "pitch": "G4", "duration": "2n", "velocity": 90 },

    { "pitch": "G5", "duration": "4n", "velocity": 95 },
    { "pitch": "G4", "duration": "8n", "velocity": 80 },
    { "pitch": "G4", "duration": "8n", "velocity": 75 },
    { "pitch": "G5", "duration": "4n", "velocity": 95 },
    { "pitch": "F#5", "duration": "4n", "velocity": 90 },

    { "pitch": "F5", "duration": "8n", "velocity": 85 },
    { "pitch": "E5", "duration": "8n", "velocity": 85 },
    { "pitch": "Eb5", "duration": "8n", "velocity": 85 },
    { "pitch": "E5", "duration": "4n", "velocity": 80 },
    { "pitch": "rest", "duration": "8n" },
    { "pitch": "Bb4", "duration": "8n", "velocity": 75 },
    { "pitch": "Eb5", "duration": "4n", "velocity": 85 },

    { "pitch": "D5", "duration": "4n", "velocity": 85 },
    { "pitch": "C5", "duration": "8n", "velocity": 80 },
    { "pitch": "B4", "duration": "8n", "velocity": 80 },
    { "pitch": "C5", "duration": "4n", "velocity": 85 },
    { "pitch": "rest", "duration": "8n" },
    { "pitch": "Eb4", "duration": "8n", "velocity": 75 },
    { "pitch": "F#4", "duration": "4n", "velocity": 80 },

    { "pitch": "G4", "duration": "4n", "velocity": 90 },
    { "pitch": "Eb4", "duration": "4n.", "velocity": 85 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 85 },
    { "pitch": "G4", "duration": "2n", "velocity": 95 },

    { "pitch": "G4", "duration": "4n.", "velocity": 85 },
    { "pitch": "F#4", "duration": "8n", "velocity": 80 },
    { "pitch": "G4", "duration": "4n", "velocity": 85 },
    { "pitch": "A4", "duration": "4n", "velocity": 80 },

    { "pitch": "Bb4", "duration": "4n.", "velocity": 90 },
    { "pitch": "A4", "duration": "8n", "velocity": 85 },
    { "pitch": "Bb4", "duration": "4n", "velocity": 90 },
    { "pitch": "C5", "duration": "4n", "velocity": 85 },

    { "pitch": "D5", "duration": "2n", "velocity": 95 },
    { "pitch": "D4", "duration": "4n", "velocity": 75 },
    { "pitch": "rest", "duration": "4n" },

    { "pitch": "D5", "duration": "4n.", "velocity": 90 },
    { "pitch": "C5", "duration": "8n", "velocity": 85 },
    { "pitch": "Bb4", "duration": "4n", "velocity": 85 },
    { "pitch": "G4", "duration": "4n", "velocity": 80 },

    { "pitch": "C5", "duration": "4n.", "velocity": 90 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 85 },
    { "pitch": "A4", "duration": "4n", "velocity": 85 },
    { "pitch": "F#4", "duration": "4n", "velocity": 80 },

    { "pitch": "G4", "duration": "4n", "velocity": 90 },
    { "pitch": "Eb4", "duration": "4n.", "velocity": 85 },
    { "pitch": "Bb4", "duration": "8n", "velocity": 85 },
    { "pitch": ["G3","G4"], "duration": "1n", "velocity": 100 },

    { "pitch": "fade", "duration": "2n" }
  ]
}
```

## Genspark
```
{
  "bpm": 132,
  "notes": [
    { "pitch": "D4", "duration": "8n", "velocity": 100 },
    { "pitch": "A4", "duration": "8n", "velocity": 100 },
    { "pitch": "D5", "duration": "4n", "velocity": 100 },
    { "pitch": "F#5", "duration": "4n", "velocity": 100 },
    { "pitch": "A5", "duration": "4n", "velocity": 100 },

    { "pitch": ["D4", "F#4", "A4"], "duration": "2n", "velocity": 100 },
    { "pitch": "E5", "duration": "8n", "velocity": 100 },
    { "pitch": "F#5", "duration": "8n", "velocity": 100 },
    { "pitch": "G5", "duration": "4n", "velocity": 100 },

    { "pitch": ["G3", "B3", "D4"], "duration": "2n", "velocity": 100 },
    { "pitch": "B4", "duration": "8n", "velocity": 100 },
    { "pitch": "A4", "duration": "8n", "velocity": 100 },
    { "pitch": "G4", "duration": "4n", "velocity": 100 },

    { "pitch": ["A3", "C#4", "E4"], "duration": "2n", "velocity": 100 },
    { "pitch": "C#5", "duration": "8n", "velocity": 100 },
    { "pitch": "D5", "duration": "8n", "velocity": 100 },
    { "pitch": "E5", "duration": "4n", "velocity": 100 },

    { "pitch": ["B3", "D4", "F#4"], "duration": "2n", "velocity": 100 },
    { "pitch": "F#5", "duration": "8n", "velocity": 100 },
    { "pitch": "E5", "duration": "8n", "velocity": 100 },
    { "pitch": "D5", "duration": "4n", "velocity": 100 },

    { "pitch": ["G3", "B3", "D4"], "duration": "4n", "velocity": 100 },
    { "pitch": "G4", "duration": "8n", "velocity": 100 },
    { "pitch": "A4", "duration": "8n", "velocity": 100 },
    { "pitch": "B4", "duration": "4n", "velocity": 100 },
    { "pitch": "D5", "duration": "4n", "velocity": 100 },

    { "pitch": ["E3", "G3", "B3"], "duration": "4n", "velocity": 100 },
    { "pitch": "E4", "duration": "8n", "velocity": 100 },
    { "pitch": "F#4", "duration": "8n", "velocity": 100 },
    { "pitch": "G4", "duration": "4n", "velocity": 100 },
    { "pitch": "B4", "duration": "4n", "velocity": 100 },

    { "pitch": ["A3", "C#4", "E4"], "duration": "2n", "velocity": 100 },
    { "pitch": "A4", "duration": "4n", "velocity": 100 },
    { "pitch": "C#5", "duration": "4n", "velocity": 100 },

    { "pitch": ["D4", "F#4", "A4"], "duration": "4n", "velocity": 100 },
    { "pitch": "D5", "duration": "8n", "velocity": 100 },
    { "pitch": "E5", "duration": "8n", "velocity": 100 },
    { "pitch": "F#5", "duration": "4n", "velocity": 100 },
    { "pitch": "A5", "duration": "4n", "velocity": 100 },

    { "pitch": ["G3", "B3", "D4"], "duration": "4n", "velocity": 100 },
    { "pitch": "G5", "duration": "8n", "velocity": 100 },
    { "pitch": "F#5", "duration": "8n", "velocity": 100 },
    { "pitch": "E5", "duration": "4n", "velocity": 100 },
    { "pitch": "D5", "duration": "4n", "velocity": 100 },

    { "pitch": ["A3", "C#4", "E4"], "duration": "4n", "velocity": 100 },
    { "pitch": "A4", "duration": "8n", "velocity": 100 },
    { "pitch": "B4", "duration": "8n", "velocity": 100 },
    { "pitch": "C#5", "duration": "4n", "velocity": 100 },
    { "pitch": "E5", "duration": "4n", "velocity": 100 },

    { "pitch": ["D4", "F#4", "A4"], "duration": "2n", "velocity": 100 },
    { "pitch": "rest", "duration": "4n" },
    { "pitch": "A4", "duration": "4n", "velocity": 100 },

    { "pitch": ["G3", "B3", "D4"], "duration": "4n", "velocity": 100 },
    { "pitch": "B4", "duration": "8n", "velocity": 100 },
    { "pitch": "D5", "duration": "8n", "velocity": 100 },
    { "pitch": "G5", "duration": "4n", "velocity": 100 },
    { "pitch": "F#5", "duration": "4n", "velocity": 100 },

    { "pitch": ["E3", "G3", "B3"], "duration": "4n", "velocity": 100 },
    { "pitch": "E5", "duration": "8n", "velocity": 100 },
    { "pitch": "D5", "duration": "8n", "velocity": 100 },
    { "pitch": "C#5", "duration": "4n", "velocity": 100 },
    { "pitch": "B4", "duration": "4n", "velocity": 100 },

    { "pitch": ["A3", "C#4", "E4"], "duration": "2n", "velocity": 100 },
    { "pitch": "E5", "duration": "8n", "velocity": 100 },
    { "pitch": "F#5", "duration": "8n", "velocity": 100 },
    { "pitch": "G5", "duration": "4n", "velocity": 100 },

    { "pitch": ["D4", "F#4", "A4", "D5"], "duration": "1n", "velocity": 100 },
    { "pitch": "fade", "duration": "2n" }
  ]
}
```