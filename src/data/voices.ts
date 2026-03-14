export interface Voice {
  name: string;
  label: string;
  gender: "female" | "male";
  tone: string;
}

export const GEMINI_TTS_VOICES: Voice[] = [
  // Female voices
  { name: "Zephyr", label: "Zephyr", gender: "female", tone: "明るい・高め" },
  { name: "Kore", label: "Kore", gender: "female", tone: "しっかり・中音" },
  { name: "Leda", label: "Leda", gender: "female", tone: "若々しい・高め" },
  { name: "Aoede", label: "Aoede", gender: "female", tone: "爽やか・中音" },
  { name: "Callirrhoe", label: "Callirrhoe", gender: "female", tone: "落ち着き・中音" },
  { name: "Autonoe", label: "Autonoe", gender: "female", tone: "明るい・中音" },
  { name: "Despina", label: "Despina", gender: "female", tone: "なめらか・中音" },
  { name: "Erinome", label: "Erinome", gender: "female", tone: "クリア・中音" },
  { name: "Laomedeia", label: "Laomedeia", gender: "female", tone: "アップビート・高め" },
  { name: "Achernar", label: "Achernar", gender: "female", tone: "ソフト・高め" },
  { name: "Gacrux", label: "Gacrux", gender: "female", tone: "落ち着き・中音" },
  { name: "Pulcherrima", label: "Pulcherrima", gender: "female", tone: "表現豊か" },
  { name: "Achird", label: "Achird", gender: "female", tone: "親しみやすい" },
  { name: "Zubenelgenubi", label: "Zubenelgenubi", gender: "female", tone: "カジュアル" },
  { name: "Vindemiatrix", label: "Vindemiatrix", gender: "female", tone: "穏やか" },
  // Male voices
  { name: "Puck", label: "Puck", gender: "male", tone: "アップビート・中音" },
  { name: "Charon", label: "Charon", gender: "male", tone: "落ち着き・低め" },
  { name: "Fenrir", label: "Fenrir", gender: "male", tone: "活発・やや低め" },
  { name: "Orus", label: "Orus", gender: "male", tone: "しっかり・やや低め" },
  { name: "Enceladus", label: "Enceladus", gender: "male", tone: "ウィスパー・低め" },
  { name: "Iapetus", label: "Iapetus", gender: "male", tone: "クリア・やや低め" },
  { name: "Umbriel", label: "Umbriel", gender: "male", tone: "落ち着き・やや低め" },
  { name: "Algieba", label: "Algieba", gender: "male", tone: "なめらか・低め" },
  { name: "Algenib", label: "Algenib", gender: "male", tone: "ハスキー・低め" },
  { name: "Rasalgethi", label: "Rasalgethi", gender: "male", tone: "知的・中音" },
  { name: "Alnilam", label: "Alnilam", gender: "male", tone: "しっかり・やや低め" },
  { name: "Schedar", label: "Schedar", gender: "male", tone: "均一・やや低め" },
  { name: "Sadachbia", label: "Sadachbia", gender: "male", tone: "活発" },
  { name: "Sadaltager", label: "Sadaltager", gender: "male", tone: "知的" },
  { name: "Sulafat", label: "Sulafat", gender: "male", tone: "温かみ" },
];
