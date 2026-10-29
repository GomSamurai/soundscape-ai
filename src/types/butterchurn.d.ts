declare module 'butterchurn' {
  const butterchurn: {
    createVisualizer: (
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options?: {
        width?: number;
        height?: number;
        pixelRatio?: number;
        textureRatio?: number;
        meshWidth?: number;
        meshHeight?: number;
      }
    ) => {
      connectAudio: (audioNode: AudioNode) => void;
      disconnectAudio: (audioNode?: AudioNode) => void;
      loadPreset: (preset: any, blendTime?: number) => void;
      render: () => void;
      setRendererSize: (width: number, height: number) => void;
    };
  };
  export default butterchurn;
}

declare module 'butterchurn-presets' {
  const presets: {
    getPresets: () => Record<string, any>;
  };
  export default presets;
}
