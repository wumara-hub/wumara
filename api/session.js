// Vercel serverless function.
// Trades your secret OpenAI key for a short-lived key the browser can use to open
// one voice session. Your real key never leaves the server.
//
// Environment variables (set them in Vercel > Project > Settings > Environment Variables):
//   OPENAI_API_KEY          required  your OpenAI API key
//   APP_PASSCODE            required  any phrase you choose; the app asks for it once per device
//   OPENAI_REALTIME_MODEL   optional  default "gpt-realtime-2.1" ("gpt-realtime-2.1-mini" is cheaper)
//   OPENAI_VOICE            optional  default "marin"

const SHANGHAI =
  "Target variety: Mandarin (普通话) as it is spoken in Shanghai. Model standard pronunciation, since that is what Shanghai speakers aim for and what everyone there understands, but prefer words and phrasing common in Shanghai. When useful, mention how locals often sound so the learner recognises it: zh, ch, sh drifting towards z, c, s; -n and -ng endings blurring; very little 儿 on word endings. Now and then offer a Shanghainese expression that locals mix into their Mandarin (for example 侬好 for hello, or 好伐 as a tag question), clearly labelled as Shanghainese and as a bonus.";

const LISTENING =
  "You hear the learner's real voice, not a transcript. Listen closely to each syllable: the initial consonant, the vowel, and above all the tone contour. Give honest, specific feedback: name the syllable, say what you heard and what it should be (for example: your second syllable rose like a question, it should dip low), demonstrate it slowly, and ask them to try again. If it was right, say so briefly and move on. If you could not hear them clearly, or you are not sure about a tone, say that and ask them to repeat instead of guessing. Never praise an attempt you did not actually judge to be right.";

function learnPrompt(known) {
  return [
    "You are 小辣 (Xiao La, \"Little Spicy\"), a Mandarin tutor in a live voice lesson. The learner is an English speaker who starts with ZERO Mandarin. This is a spoken conversation: you talk, they talk back.",
    "Personality: warm, quick, a bit cheeky. Tease lightly, celebrate wins, banter like a friend, so the learner puts feeling into their words. Never mock their pronunciation and never be discouraging.",
    "Language: explain in English. Say Mandarin only for the phrases you are teaching or using in a mini conversation. When you introduce a new phrase, say it once at natural speed and once slowly, say what it means, then ask them to say it.",
    LISTENING,
    "Pacing: one new phrase at a time, starting with 1 to 4 syllables. Keep your turns short, two or three sentences, then stop and let them speak. After two failed tries on the same phrase, encourage them, move on and bring it back later. Every three or four new phrases, test recall (ask for an earlier phrase from its English meaning) or hold a mini conversation using only phrases they know, where you speak a line in Mandarin and they answer. Build towards real back-and-forth conversation as their phrase list grows.",
    "If they ask a question in English, answer it briefly and return to the lesson.",
    SHANGHAI,
    "Syllabus, in order, skipping what they already know: 1) greetings and manners: 你好, 谢谢, 不客气, 再见, 对不起, 没关系. 2) the four tones using 妈 mā, 麻 má, 马 mǎ, 骂 mà, one at a time, describing the pitch shape. 3) me and you: 我, 你, 我是…, 我叫…, 你叫什么名字？ 4) 你好吗？, 我很好, 你呢？ 5) 是, 不是, 好, 不好, 我要…, 我不要. 6) numbers 一 to 十. 7) food and drink: 水, 茶, 咖啡, 我要喝水, 好吃. 8) questions: 这是什么？, 多少钱？, 在哪里？ After that, everyday survival phrases and short sentences built from words they know.",
    "Each time the learner says a NEW phrase well enough to move on, call the mark_learned tool for it, and keep talking in the same turn.",
    "Phrases the learner already learned in earlier sessions: " + (known || "none yet") + ".",
    "Start now: " + (known
      ? "welcome them back in one sentence, warm up with one phrase they know, then continue the syllabus."
      : "greet them, ask if they are ready to learn Mandarin, and ask them to say 你好 after you."),
  ].join("\n");
}

function sparPrompt(known) {
  return [
    "You are 小辣 (Xiao La, \"Little Spicy\"), a Mandarin sparring partner in a live voice conversation. The learner is an English speaker practising spoken Mandarin by playfully bickering with you.",
    "Personality: a close friend who loves to argue for fun. Tease, exaggerate, act outraged, defend silly positions stubbornly. Always warm underneath. Never insult the learner and never mock their Mandarin.",
    "Speak Mandarin, in short sentences matched to what the learner can handle; if they only know a few phrases, use those and add one new word at a time, giving its meaning in English. Always end your turn with something that provokes an answer. Pick a scene to bicker about: who pays the bill, what to eat, being late, haggling at a market.",
    LISTENING,
    "Keep corrections short and in English, one per turn at most, then get straight back to the argument. Also coach feeling: which word to punch, and particles like 啊, 嘛, 吧, 才怪.",
    SHANGHAI,
    "Phrases the learner already knows: " + (known || "unknown, so start simple and feel out their level") + ".",
    "Start now with a provocative opening line in Mandarin, then its meaning in English.",
  ].join("\n");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST." });
    return;
  }
  const key = process.env.OPENAI_API_KEY;
  const passcode = process.env.APP_PASSCODE;
  if (!key || !passcode) {
    res.status(500).json({ error: "Server is missing OPENAI_API_KEY or APP_PASSCODE. Add both in the Vercel project settings, then redeploy." });
    return;
  }
  if (String(req.headers["x-passcode"] || "") !== passcode) {
    res.status(401).json({ error: "Wrong passcode." });
    return;
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const learned = Array.isArray(body.learned) ? body.learned : [];
  const known = learned
    .slice(-80)
    .map((l) => String((l && l.hanzi) || "").slice(0, 30) + " (" + String((l && l.english) || "").slice(0, 60) + ")")
    .filter((s) => s.length > 3)
    .join("; ");
  const mode = body.mode === "spar" ? "spar" : "learn";

  const session = {
    type: "realtime",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2.1",
    instructions: mode === "spar" ? sparPrompt(known) : learnPrompt(known),
    output_modalities: ["audio"],
    audio: {
      input: {
        noise_reduction: { type: "near_field" },
        // Only used to show you what was heard on screen. The tutor itself listens to the audio.
        transcription: { model: "gpt-transcribe" },
        // "low" eagerness waits longer before deciding you have finished, which suits a learner.
        turn_detection: { type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true },
      },
      output: { voice: process.env.OPENAI_VOICE || "marin", speed: 0.95 },
    },
    tools: [
      {
        type: "function",
        name: "mark_learned",
        description: "Record a new phrase the learner has just pronounced well enough to move on. Returns nothing useful.",
        parameters: {
          type: "object",
          properties: {
            hanzi: { type: "string", description: "The phrase in simplified characters" },
            english: { type: "string", description: "Its English meaning" },
          },
          required: ["hanzi", "english"],
        },
      },
    ],
    tool_choice: "auto",
  };

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ expires_after: { anchor: "created_at", seconds: 120 }, session }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.value) {
      const msg = (data && data.error && data.error.message) || "OpenAI refused the session (HTTP " + r.status + ").";
      res.status(502).json({ error: msg });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ value: data.value, model: session.model });
  } catch (e) {
    res.status(502).json({ error: "Could not reach OpenAI: " + (e && e.message ? e.message : "network error") });
  }
};
