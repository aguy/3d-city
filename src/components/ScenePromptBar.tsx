import React, { useEffect, useState } from 'react';
import {
  PROMPT_SUGGESTIONS,
  PromptSuggestion,
  SceneDescriptor,
} from '../types/scenePromptTypes';
import {
  checkChromeAIAvailable,
  generateSceneFromPrompt,
} from '../scene/promptSceneGenerator';

interface ScenePromptBarProps {
  onGenerate: (descriptor: SceneDescriptor) => void;
  isGenerating?: boolean;
}

export const ScenePromptBar: React.FC<ScenePromptBarProps> = ({
  onGenerate,
  isGenerating = false,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [hasChromeAI, setHasChromeAI] = useState<boolean>(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  useEffect(() => {
    checkChromeAIAvailable().then((avail) => setHasChromeAI(avail));
  }, []);

  const handleGenerate = async (textToUse?: string) => {
    const text = (textToUse !== undefined ? textToUse : prompt).trim();
    if (!text && textToUse === undefined) return;

    setLoading(true);
    try {
      const { descriptor } = await generateSceneFromPrompt(text || 'Dense street canyon');
      onGenerate(descriptor);
    } catch (err) {
      console.error('Failed to generate scene:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleSelectSuggestion = (s: PromptSuggestion) => {
    setSelectedSuggestionId(s.id);
    setPrompt(s.prompt);
    handleGenerate(s.prompt);
  };

  const handleRandomize = () => {
    const randomIdx = Math.floor(Math.random() * PROMPT_SUGGESTIONS.length);
    const chosen = PROMPT_SUGGESTIONS[randomIdx];
    handleSelectSuggestion(chosen);
  };

  const activeLoading = loading || isGenerating;

  return (
    <div className="scene-prompt-container" aria-label="Scene Prompt Generator">
      <div className="prompt-input-row">
        <div className="prompt-status-badge" title={hasChromeAI ? 'Running on-device Gemini Nano via Chrome Prompt API' : 'Running built-in procedural heuristic compiler'}>
          {hasChromeAI ? '⚡ GEMINI NANO' : '⚡ PROCEDURAL AI'}
        </div>

        <div className="prompt-field-wrapper">
          <input
            type="text"
            className="prompt-input"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setSelectedSuggestionId(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe an architectural wireframe scene (e.g. Cyberpunk canal, Haussmann boulevard)..."
            disabled={activeLoading}
          />
          {prompt && (
            <button
              type="button"
              className="prompt-clear-btn"
              onClick={() => setPrompt('')}
              title="Clear input"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          className="prompt-generate-btn"
          onClick={() => handleGenerate()}
          disabled={activeLoading}
          title="Synthesize 3D Scene"
        >
          {activeLoading ? 'PLOTTING...' : 'GENERATE ↵'}
        </button>

        <button
          type="button"
          className="prompt-random-btn"
          onClick={handleRandomize}
          disabled={activeLoading}
          title="Surprise me with a random architectural prompt"
        >
          🎲 SURPRISE ME
        </button>

        <button
          type="button"
          className="prompt-print-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('plotter:print'))}
          title="Print the current 3D plotter drawing"
        >
          🖨 PRINT
        </button>
      </div>

      <div className="prompt-suggestions-row" aria-label="Preset prompt suggestions">
        <span className="suggestions-label">SUGGESTIONS:</span>
        <div className="suggestions-scroll">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`suggestion-chip ${selectedSuggestionId === s.id ? 'active' : ''}`}
              onClick={() => handleSelectSuggestion(s)}
              disabled={activeLoading}
              title={s.prompt}
            >
              <span className="chip-emoji">{s.emoji}</span>
              <span className="chip-label">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
