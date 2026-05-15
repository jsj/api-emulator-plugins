export const DEFAULT_VOICES = [
  {
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'Rachel',
    category: 'premade',
    description: 'Calm, natural narration voice for emulator tests.',
    preview_url: 'https://api.elevenlabs.io/v1/voices/JBFqnCBsd6RMkjVDRZzb/preview',
    available_for_tiers: ['free', 'creator', 'pro'],
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
    },
    labels: {
      accent: 'american',
      descriptive: 'calm',
      gender: 'female',
      use_case: 'narration',
    },
    high_quality_base_model_ids: ['eleven_multilingual_v2', 'eleven_turbo_v2_5'],
  },
  {
    voice_id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Adam',
    category: 'premade',
    description: 'Clear conversational voice for deterministic SDK smoke tests.',
    preview_url: 'https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM/preview',
    available_for_tiers: ['free', 'creator', 'pro'],
    settings: {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true,
    },
    labels: {
      accent: 'american',
      descriptive: 'clear',
      gender: 'male',
      use_case: 'conversational',
    },
    high_quality_base_model_ids: ['eleven_multilingual_v2', 'eleven_flash_v2_5'],
  },
];

export const DEFAULT_MODELS = [
  {
    model_id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    can_be_finetuned: true,
    can_do_text_to_speech: true,
    can_do_voice_conversion: true,
    can_use_style: true,
    can_use_speaker_boost: true,
    serves_pro_voices: true,
    token_cost_factor: 1,
    description: 'Deterministic high-quality multilingual TTS model.',
    languages: [
      { language_id: 'en', name: 'English' },
      { language_id: 'es', name: 'Spanish' },
    ],
  },
  {
    model_id: 'eleven_turbo_v2_5',
    name: 'Eleven Turbo v2.5',
    can_be_finetuned: false,
    can_do_text_to_speech: true,
    can_do_voice_conversion: false,
    can_use_style: true,
    can_use_speaker_boost: true,
    serves_pro_voices: false,
    token_cost_factor: 0.5,
    description: 'Low-latency deterministic emulator model.',
    languages: [{ language_id: 'en', name: 'English' }],
  },
];

export function state(store) {
  const existing = store.getData?.('elevenlabs:state');
  if (existing) return existing;
  const initial = {
    voices: DEFAULT_VOICES,
    models: DEFAULT_MODELS,
    history: [],
    user: {
      subscription: {
        tier: 'creator',
        character_count: 0,
        character_limit: 100000,
        can_extend_character_limit: true,
        allowed_to_extend_character_limit: true,
        next_character_count_reset_unix: 1780000000,
        voice_limit: 30,
        professional_voice_limit: 1,
        can_extend_voice_limit: false,
        can_use_instant_voice_cloning: true,
        can_use_professional_voice_cloning: true,
        max_credit_limit_extension: 500000,
        voice_slots_used: 2,
        professional_voice_slots_used: 0,
        voice_add_edit_counter: 0,
        current_overage: {
          amount: '0',
          amount_cents: 0,
          currency: 'usd',
        },
        currency: 'usd',
        status: 'active',
      },
      is_new_user: false,
      xi_api_key: 'elevenlabs-emulator-key',
      user_id: 'elevenlabs_user_emulator',
      can_use_delayed_payment_methods: false,
      is_onboarding_completed: true,
      is_onboarding_checklist_completed: true,
      created_at: Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000),
      seat_type: 'admin',
    },
  };
  store.setData?.('elevenlabs:state', initial);
  return initial;
}

export function saveState(store, value) {
  store.setData?.('elevenlabs:state', value);
}
