// src/store/useAudioStore.ts
import { create } from "zustand";

interface AudioStore {
    audioContext: AudioContext | null;
    audioBuffer: AudioBuffer | null;
    isPlaying: boolean;
    trackUrl: string | null;
    trackTitle: string | null;
    sourceNode: AudioBufferSourceNode | null;
    duration: number | null;
    currentTime: number;
    playbackInterval: number | null;
    startOffset: number;
    startTime: number;
    spatialEnabled: boolean;
    speakerPosition: { x: number; y: number; z: number };
    spatialEffects: {
        reverbMix: number;
        delayMix: number;
        delayFeedback: number;
        compressorThreshold: number;
    };
    gainNode: GainNode | null;
    volume: number;
    audioCache: Map<string, AudioBuffer>;

    toggleSpatialEffect: () => void;
    setSpeakerPosition: (x: number, y: number, z: number) => void;
    setSpatialEffects: (effects: Partial<{
        reverbMix: number;
        delayMix: number;
        delayFeedback: number;
        compressorThreshold: number;
    }>) => void;
    resetSpatialSettings: () => void;
    preloadAudio: (trackUrl: string) => Promise<void>;
    setTrack: (trackUrl: string, trackTitle: string) => Promise<void>;
    play: () => void;
    resume: () => void;
    pause: () => void;
    stop: () => void;
    setVolume: (vol: number) => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
    audioContext: null,
    audioBuffer: null,
    isPlaying: false,
    trackUrl: null,
    trackTitle: null,
    sourceNode: null,
    duration: null,
    currentTime: 0,
    playbackInterval: null,
    startOffset: 0,
    startTime: 0,
    spatialEnabled: true,
    speakerPosition: { x: 0, y: 0, z: 0 },
    spatialEffects: {
        reverbMix: 0.8,
        delayMix: 0.7,
        delayFeedback: 0.6,
        compressorThreshold: -12,
    },
    gainNode: null,
    volume: 1,
    audioCache: new Map(),

    toggleSpatialEffect: () =>
        set((state) => ({ spatialEnabled: !state.spatialEnabled })),

    setSpatialEffects: (effects) => {
        set((state) => ({
            spatialEffects: { ...state.spatialEffects, ...effects }
        }));
        // 현재 재생 중인 오디오가 있다면 효과를 즉시 업데이트
        const { audioContext, sourceNode, spatialEnabled } = get();
        if (audioContext && sourceNode && spatialEnabled) {
            // 현재 재생 중인 오디오를 다시 시작하여 새로운 효과 적용
            const currentTime = get().currentTime;
            const { audioBuffer, volume, speakerPosition, spatialEffects } = get();

            if (audioBuffer) {
                // 기존 오디오 정리
                sourceNode.onended = null;
                try {
                    sourceNode.stop();
                } catch (e) {
                    // 이미 정지된 경우 무시
                }

                // 새로운 효과로 오디오 재생
                const newSource = audioContext.createBufferSource();
                newSource.buffer = audioBuffer;

                const gain = audioContext.createGain();
                gain.gain.value = volume;

                if (spatialEnabled) {
                    const panner = audioContext.createPanner();
                    panner.panningModel = "HRTF";
                    panner.distanceModel = "inverse";
                    panner.refDistance = 1;
                    panner.maxDistance = 10000;
                    panner.rolloffFactor = 1;
                    panner.coneInnerAngle = 360;
                    panner.coneOuterAngle = 0;
                    panner.coneOuterGain = 0;
                    panner.setPosition(speakerPosition.x, speakerPosition.y, speakerPosition.z);

                    newSource.connect(panner);
                    panner.connect(gain);

                    // Delay
                    const delayTime = 0.001;
                    const delayNode = audioContext.createDelay(delayTime);
                    const delayFeedbackNode = audioContext.createGain();
                    const delayDry = audioContext.createGain();
                    const delayWet = audioContext.createGain();
                    delayNode.connect(delayFeedbackNode);
                    delayFeedbackNode.connect(delayNode);
                    delayFeedbackNode.gain.value = spatialEffects.delayFeedback;
                    gain.connect(delayDry);
                    delayDry.connect(audioContext.destination);
                    delayDry.gain.value = 1 - spatialEffects.delayMix;
                    gain.connect(delayNode);
                    delayNode.connect(delayWet);
                    delayWet.connect(audioContext.destination);
                    delayWet.gain.value = spatialEffects.delayMix;

                    // Reverb
                    const reverbTime = 0.25;
                    const reverbDecay = 0.1;
                    const convolver = audioContext.createConvolver();
                    const sampleRate = audioContext.sampleRate;
                    const length = sampleRate * reverbTime;
                    const impulse = audioContext.createBuffer(2, length, sampleRate);
                    for (let i = 0; i < length; i++) {
                        const decay = Math.pow(1 - i / length, reverbDecay);
                        impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
                        impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
                    }
                    convolver.buffer = impulse;
                    const reverbDry = audioContext.createGain();
                    const reverbWet = audioContext.createGain();
                    delayWet.connect(reverbDry);
                    reverbDry.connect(audioContext.destination);
                    reverbDry.gain.value = 1 - spatialEffects.reverbMix;
                    delayWet.connect(convolver);
                    convolver.connect(reverbWet);
                    reverbWet.connect(audioContext.destination);
                    reverbWet.gain.value = spatialEffects.reverbMix;

                    // Compressor
                    const compressor = audioContext.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(spatialEffects.compressorThreshold, audioContext.currentTime);
                    compressor.knee.setValueAtTime(30, audioContext.currentTime);
                    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
                    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
                    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
                    gain.connect(compressor);
                    compressor.connect(audioContext.destination);
                } else {
                    newSource.connect(gain);
                    gain.connect(audioContext.destination);
                }

                const now = audioContext.currentTime;
                newSource.start(0, currentTime);
                set({
                    sourceNode: newSource,
                    startTime: now - currentTime,
                    gainNode: gain
                });
            }
        }
    },

    resetSpatialSettings: () => {
        // 기본값으로 초기화
        const defaultSettings = {
            spatialEnabled: true,
            speakerPosition: { x: 0, y: 0, z: 0 },
            spatialEffects: {
                reverbMix: 0.8,
                delayMix: 0.7,
                delayFeedback: 0.6,
                compressorThreshold: -12,
            }
        };

        set(defaultSettings);

        // 현재 재생 중인 오디오가 있다면 기본 설정으로 업데이트
        const { audioContext, sourceNode } = get();
        if (audioContext && sourceNode) {
            const currentTime = get().currentTime;
            const { audioBuffer, volume } = get();

            if (audioBuffer) {
                // 기존 오디오 정리
                sourceNode.onended = null;
                try {
                    sourceNode.stop();
                } catch (e) {
                    // 이미 정지된 경우 무시
                }

                // 기본 설정으로 오디오 재생
                const newSource = audioContext.createBufferSource();
                newSource.buffer = audioBuffer;

                const gain = audioContext.createGain();
                gain.gain.value = volume;

                if (defaultSettings.spatialEnabled) {
                    const panner = audioContext.createPanner();
                    panner.panningModel = "HRTF";
                    panner.distanceModel = "inverse";
                    panner.refDistance = 1;
                    panner.maxDistance = 10000;
                    panner.rolloffFactor = 1;
                    panner.coneInnerAngle = 360;
                    panner.coneOuterAngle = 0;
                    panner.coneOuterGain = 0;
                    panner.setPosition(defaultSettings.speakerPosition.x, defaultSettings.speakerPosition.y, defaultSettings.speakerPosition.z);

                    newSource.connect(panner);
                    panner.connect(gain);

                    // Delay
                    const delayTime = 0.001;
                    const delayNode = audioContext.createDelay(delayTime);
                    const delayFeedbackNode = audioContext.createGain();
                    const delayDry = audioContext.createGain();
                    const delayWet = audioContext.createGain();
                    delayNode.connect(delayFeedbackNode);
                    delayFeedbackNode.connect(delayNode);
                    delayFeedbackNode.gain.value = defaultSettings.spatialEffects.delayFeedback;
                    gain.connect(delayDry);
                    delayDry.connect(audioContext.destination);
                    delayDry.gain.value = 1 - defaultSettings.spatialEffects.delayMix;
                    gain.connect(delayNode);
                    delayNode.connect(delayWet);
                    delayWet.connect(audioContext.destination);
                    delayWet.gain.value = defaultSettings.spatialEffects.delayMix;

                    // Reverb
                    const reverbTime = 0.25;
                    const reverbDecay = 0.1;
                    const convolver = audioContext.createConvolver();
                    const sampleRate = audioContext.sampleRate;
                    const length = sampleRate * reverbTime;
                    const impulse = audioContext.createBuffer(2, length, sampleRate);
                    for (let i = 0; i < length; i++) {
                        const decay = Math.pow(1 - i / length, reverbDecay);
                        impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
                        impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
                    }
                    convolver.buffer = impulse;
                    const reverbDry = audioContext.createGain();
                    const reverbWet = audioContext.createGain();
                    delayWet.connect(reverbDry);
                    reverbDry.connect(audioContext.destination);
                    reverbDry.gain.value = 1 - defaultSettings.spatialEffects.reverbMix;
                    delayWet.connect(convolver);
                    convolver.connect(reverbWet);
                    reverbWet.connect(audioContext.destination);
                    reverbWet.gain.value = defaultSettings.spatialEffects.reverbMix;

                    // Compressor
                    const compressor = audioContext.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(defaultSettings.spatialEffects.compressorThreshold, audioContext.currentTime);
                    compressor.knee.setValueAtTime(30, audioContext.currentTime);
                    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
                    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
                    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
                    gain.connect(compressor);
                    compressor.connect(audioContext.destination);
                } else {
                    newSource.connect(gain);
                    gain.connect(audioContext.destination);
                }

                const now = audioContext.currentTime;
                newSource.start(0, currentTime);
                set({
                    sourceNode: newSource,
                    startTime: now - currentTime,
                    gainNode: gain
                });
            }
        }
    },

    setSpeakerPosition: (x: number, y: number, z: number) => {
        set({ speakerPosition: { x, y, z } });
        // 현재 재생 중인 오디오가 있다면 위치를 즉시 업데이트
        const { audioContext, sourceNode, spatialEnabled } = get();
        if (audioContext && sourceNode && spatialEnabled) {
            // 현재 재생 중인 오디오를 다시 시작하여 새로운 위치 적용
            const currentTime = get().currentTime;
            const { audioBuffer, volume, spatialEffects } = get();

            if (audioBuffer) {
                // 기존 오디오 정리
                sourceNode.onended = null;
                try {
                    sourceNode.stop();
                } catch (e) {
                    // 이미 정지된 경우 무시
                }

                // 새로운 위치로 오디오 재생
                const newSource = audioContext.createBufferSource();
                newSource.buffer = audioBuffer;

                const gain = audioContext.createGain();
                gain.gain.value = volume;

                if (spatialEnabled) {
                    const panner = audioContext.createPanner();
                    panner.panningModel = "HRTF";
                    panner.distanceModel = "inverse";
                    panner.refDistance = 1;
                    panner.maxDistance = 10000;
                    panner.rolloffFactor = 1;
                    panner.coneInnerAngle = 360;
                    panner.coneOuterAngle = 0;
                    panner.coneOuterGain = 0;
                    panner.setPosition(x, y, z);

                    newSource.connect(panner);
                    panner.connect(gain);

                    // Delay
                    const delayTime = 0.001;
                    const delayNode = audioContext.createDelay(delayTime);
                    const delayFeedbackNode = audioContext.createGain();
                    const delayDry = audioContext.createGain();
                    const delayWet = audioContext.createGain();
                    delayNode.connect(delayFeedbackNode);
                    delayFeedbackNode.connect(delayNode);
                    delayFeedbackNode.gain.value = spatialEffects.delayFeedback;
                    gain.connect(delayDry);
                    delayDry.connect(audioContext.destination);
                    delayDry.gain.value = 1 - spatialEffects.delayMix;
                    gain.connect(delayNode);
                    delayNode.connect(delayWet);
                    delayWet.connect(audioContext.destination);
                    delayWet.gain.value = spatialEffects.delayMix;

                    // Reverb
                    const reverbTime = 0.25;
                    const reverbDecay = 0.1;
                    const convolver = audioContext.createConvolver();
                    const sampleRate = audioContext.sampleRate;
                    const length = sampleRate * reverbTime;
                    const impulse = audioContext.createBuffer(2, length, sampleRate);
                    for (let i = 0; i < length; i++) {
                        const decay = Math.pow(1 - i / length, reverbDecay);
                        impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
                        impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
                    }
                    convolver.buffer = impulse;
                    const reverbDry = audioContext.createGain();
                    const reverbWet = audioContext.createGain();
                    delayWet.connect(reverbDry);
                    reverbDry.connect(audioContext.destination);
                    reverbDry.gain.value = 1 - spatialEffects.reverbMix;
                    delayWet.connect(convolver);
                    convolver.connect(reverbWet);
                    reverbWet.connect(audioContext.destination);
                    reverbWet.gain.value = spatialEffects.reverbMix;

                    // Compressor
                    const compressor = audioContext.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(spatialEffects.compressorThreshold, audioContext.currentTime);
                    compressor.knee.setValueAtTime(30, audioContext.currentTime);
                    compressor.ratio.setValueAtTime(12, audioContext.currentTime);
                    compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
                    compressor.release.setValueAtTime(0.25, audioContext.currentTime);
                    gain.connect(compressor);
                    compressor.connect(audioContext.destination);
                } else {
                    newSource.connect(gain);
                    gain.connect(audioContext.destination);
                }

                const now = audioContext.currentTime;
                newSource.start(0, currentTime);
                set({
                    sourceNode: newSource,
                    startTime: now - currentTime,
                    gainNode: gain
                });
            }
        }
    },

    preloadAudio: async (trackUrl) => {
        let audioContext = get().audioContext;
        if (!audioContext) {
            audioContext = new AudioContext();
            set({ audioContext });
        }

        // 이미 캐시에 있으면 스킵
        if (get().audioCache.has(trackUrl)) {
            return;
        }

        try {
            const resp = await fetch(trackUrl);
            const buf = await resp.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(buf);

            set((state) => ({
                audioCache: new Map(state.audioCache).set(trackUrl, decoded)
            }));
        } catch (err) {
            console.error("오디오 프리로드 실패:", trackUrl, err);
        }
    },

    setTrack: async (trackUrl, trackTitle) => {
        let audioContext = get().audioContext;
        if (!audioContext) {
            audioContext = new AudioContext();
            set({ audioContext });
        }

        try {
            // 캐시에서 먼저 확인
            const cached = get().audioCache.get(trackUrl);
            if (cached) {
                set({
                    trackUrl,
                    trackTitle,
                    audioBuffer: cached,
                    duration: cached.duration,
                    currentTime: 0,
                    startOffset: 0,
                    startTime: 0,
                });
                return;
            }

            // 캐시에 없으면 로드
            const resp = await fetch(trackUrl);
            const buf = await resp.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(buf);

            set({
                trackUrl,
                trackTitle,
                audioBuffer: decoded,
                duration: decoded.duration,
                currentTime: 0,
                startOffset: 0,
                startTime: 0,
            });

            // 캐시에 저장
            set((state) => ({
                audioCache: new Map(state.audioCache).set(trackUrl, decoded)
            }));
        } catch (err) {
            console.error("트랙 로딩 실패:", err);
        }
    },

    play: () => {
        const {
            audioContext,
            audioBuffer,
            isPlaying,
            startOffset,
            spatialEnabled,
            volume,
            speakerPosition,
            spatialEffects,
        } = get();
        if (!audioContext || !audioBuffer || isPlaying) return;

        // 기존 오디오 정리
        const cleanupAudio = () => {
            const { sourceNode, playbackInterval } = get();
            if (sourceNode) {
                sourceNode.onended = null;
                try {
                    sourceNode.stop();
                } catch (e) {
                    // 이미 정지된 경우 무시
                }
            }
            if (playbackInterval) {
                clearInterval(playbackInterval);
            }
            set({
                isPlaying: false,
                sourceNode: null,
                playbackInterval: null
            });
        };

        // 기존 오디오 정리
        cleanupAudio();

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // Gain 노드
        const gain = audioContext.createGain();
        gain.gain.value = volume;
        set({ gainNode: gain });

        // 체인 연결
        if (spatialEnabled) {
            // PannerNode
            const panner = audioContext.createPanner();
            panner.panningModel = "HRTF";
            panner.distanceModel = "inverse";
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;
            panner.setPosition(speakerPosition.x, speakerPosition.y, speakerPosition.z);
            source.connect(panner);
            panner.connect(gain);

            // Delay
            const delayTime = 0.001;
            const delayNode = audioContext.createDelay(delayTime);
            const delayFeedbackNode = audioContext.createGain();
            const delayDry = audioContext.createGain();
            const delayWet = audioContext.createGain();
            // 피드백
            delayNode.connect(delayFeedbackNode);
            delayFeedbackNode.connect(delayNode);
            delayFeedbackNode.gain.value = spatialEffects.delayFeedback;
            // 믹스
            gain.connect(delayDry);
            delayDry.connect(audioContext.destination);
            delayDry.gain.value = 1 - spatialEffects.delayMix;
            gain.connect(delayNode);
            delayNode.connect(delayWet);
            delayWet.connect(audioContext.destination);
            delayWet.gain.value = spatialEffects.delayMix;

            // Reverb
            const reverbTime = 0.25;
            const reverbDecay = 0.1;
            const convolver = audioContext.createConvolver();
            const sampleRate = audioContext.sampleRate;
            const length = sampleRate * reverbTime;
            const impulse = audioContext.createBuffer(2, length, sampleRate);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, reverbDecay);
                impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
                impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
            }
            convolver.buffer = impulse;
            const reverbDry = audioContext.createGain();
            const reverbWet = audioContext.createGain();
            delayWet.connect(reverbDry);
            reverbDry.connect(audioContext.destination);
            reverbDry.gain.value = 1 - spatialEffects.reverbMix;
            delayWet.connect(convolver);
            convolver.connect(reverbWet);
            reverbWet.connect(audioContext.destination);
            reverbWet.gain.value = spatialEffects.reverbMix;

            // Compressor
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(spatialEffects.compressorThreshold, audioContext.currentTime);
            compressor.knee.setValueAtTime(30, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            gain.connect(compressor);
            compressor.connect(audioContext.destination);
        } else {
            source.connect(gain);
            gain.connect(audioContext.destination);
        }

        const now = audioContext.currentTime;
        set({ startTime: now });
        source.start(0, startOffset);

        const id = window.setInterval(() => {
            const { startTime, startOffset, audioBuffer } = get();
            const elapsed = audioContext.currentTime - startTime + startOffset;
            set({ currentTime: elapsed });
            if (audioBuffer && elapsed >= audioBuffer.duration) {
                window.clearInterval(id);
                set({
                    isPlaying: false,
                    sourceNode: null,
                    playbackInterval: null,
                    startOffset: 0,
                    currentTime: 0,
                });
            }
        }, 100);

        source.onended = () => {
            window.clearInterval(id);
            set({
                isPlaying: false,
                sourceNode: null,
                playbackInterval: null,
                startOffset: 0,
                currentTime: 0,
            });
        };

        set({ isPlaying: true, sourceNode: source, playbackInterval: id });
    },

    resume: () => {
        const { audioContext, audioBuffer, isPlaying, startOffset, spatialEnabled, volume, speakerPosition, spatialEffects, duration } = get();
        if (!audioContext || !audioBuffer || isPlaying) return;

        // 방송이 이미 끝났으면 재생하지 않음
        if (startOffset >= (duration || 0)) {
            console.log('방송이 이미 끝났습니다. 재생하지 않습니다.');
            return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gain = audioContext.createGain();
        gain.gain.value = volume;
        set({ gainNode: gain });

        if (spatialEnabled) {
            const panner = audioContext.createPanner();
            panner.panningModel = "HRTF";
            panner.distanceModel = "inverse";
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;
            panner.setPosition(speakerPosition.x, speakerPosition.y, speakerPosition.z);
            source.connect(panner);
            panner.connect(gain);

            // Delay
            const delayTime = 0.001;
            const delayNode = audioContext.createDelay(delayTime);
            const delayFeedbackNode = audioContext.createGain();
            const delayDry = audioContext.createGain();
            const delayWet = audioContext.createGain();
            delayNode.connect(delayFeedbackNode);
            delayFeedbackNode.connect(delayNode);
            delayFeedbackNode.gain.value = spatialEffects.delayFeedback;
            gain.connect(delayDry);
            delayDry.connect(audioContext.destination);
            delayDry.gain.value = 1 - spatialEffects.delayMix;
            gain.connect(delayNode);
            delayNode.connect(delayWet);
            delayWet.connect(audioContext.destination);
            delayWet.gain.value = spatialEffects.delayMix;

            // Reverb
            const reverbTime = 0.25;
            const reverbDecay = 0.1;
            const convolver = audioContext.createConvolver();
            const sampleRate = audioContext.sampleRate;
            const length = sampleRate * reverbTime;
            const impulse = audioContext.createBuffer(2, length, sampleRate);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, reverbDecay);
                impulse.getChannelData(0)[i] = (Math.random() * 2 - 1) * decay;
                impulse.getChannelData(1)[i] = (Math.random() * 2 - 1) * decay;
            }
            convolver.buffer = impulse;
            const reverbDry = audioContext.createGain();
            const reverbWet = audioContext.createGain();
            delayWet.connect(reverbDry);
            reverbDry.connect(audioContext.destination);
            reverbDry.gain.value = 1 - spatialEffects.reverbMix;
            delayWet.connect(convolver);
            convolver.connect(reverbWet);
            reverbWet.connect(audioContext.destination);
            reverbWet.gain.value = spatialEffects.reverbMix;

            // Compressor
            const compressor = audioContext.createDynamicsCompressor();
            compressor.threshold.setValueAtTime(spatialEffects.compressorThreshold, audioContext.currentTime);
            compressor.knee.setValueAtTime(30, audioContext.currentTime);
            compressor.ratio.setValueAtTime(12, audioContext.currentTime);
            compressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressor.release.setValueAtTime(0.25, audioContext.currentTime);
            gain.connect(compressor);
            compressor.connect(audioContext.destination);
        } else {
            source.connect(gain);
            gain.connect(audioContext.destination);
        }

        const now = audioContext.currentTime;
        set({ startTime: now });
        source.start(0, startOffset);

        const id = window.setInterval(() => {
            const { startTime, startOffset, audioBuffer } = get();
            const elapsed = audioContext.currentTime - startTime + startOffset;
            set({ currentTime: elapsed });
            if (audioBuffer && elapsed >= audioBuffer.duration) {
                window.clearInterval(id);
                set({
                    isPlaying: false,
                    sourceNode: null,
                    playbackInterval: null,
                    startOffset: 0,
                });
            }
        }, 100);

        source.onended = () => {
            window.clearInterval(id);
            set({
                isPlaying: false,
                sourceNode: null,
                playbackInterval: null,
                startOffset: 0,
            });
        };

        set({ isPlaying: true, sourceNode: source, playbackInterval: id });
    },

    pause: () => {
        const { audioContext, sourceNode, playbackInterval, startTime, startOffset } = get();
        if (!audioContext || !sourceNode) return;

        const currentOffset = audioContext.currentTime - startTime + startOffset;

        // 오디오 정리
        if (sourceNode) {
            sourceNode.onended = null;
            try {
                sourceNode.stop();
            } catch (e) {
                // 이미 정지된 경우 무시
            }
        }
        if (playbackInterval != null) {
            window.clearInterval(playbackInterval);
        }

        set({
            isPlaying: false,
            sourceNode: null,
            playbackInterval: null,
            currentTime: currentOffset,
            startOffset: currentOffset,
        });
    },

    stop: () => {
        const { audioContext, sourceNode, playbackInterval } = get();
        if (!audioContext || !sourceNode) return;

        // 오디오 정리
        if (sourceNode) {
            sourceNode.onended = null;
            try {
                sourceNode.stop();
            } catch (e) {
                // 이미 정지된 경우 무시
            }
        }
        if (playbackInterval != null) {
            window.clearInterval(playbackInterval);
        }

        set({
            isPlaying: false,
            sourceNode: null,
            playbackInterval: null,
            currentTime: 0,
            startOffset: 0,
        });
    },

    setVolume: (vol) => {
        const { gainNode } = get();
        set({ volume: vol });
        if (gainNode) gainNode.gain.value = vol;
    },
}));