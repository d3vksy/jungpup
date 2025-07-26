// src/store/useSimulatorStore.ts
import { create } from 'zustand';

interface Event {
    time: string; // "HH:MM:SS"
    action: () => void;
    executed?: boolean; // 실행 여부 추적
}

interface SimulatorStore {
    currentTime: Date;
    currentStage: string;
    events: Event[];
    timerId: number | null;
    speed: number;
    isRunning: boolean;

    setCurrentStage: (stage: string) => void;
    registerEvent: (event: Event) => void;
    clearEvents: () => void;
    startSimulation: (startTime: Date) => void;
    pauseSimulation: () => void;
    resumeSimulation: () => void;
    setSpeed: (speed: number) => void;
}

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
    currentTime: new Date('2025-06-07T08:05:00'),
    currentStage: '대기중',
    events: [],
    timerId: null,
    speed: 1,
    isRunning: false,

    setCurrentStage: (stage) => set({ currentStage: stage }),

    registerEvent: (event) =>
        set((state) => ({
            events: [...state.events, event],
        })),

    clearEvents: () => set({ events: [] }),

    startSimulation: (startTime) => {
        const prev = get().timerId;
        if (prev != null) clearInterval(prev);

        set({ currentTime: startTime, isRunning: true });

        const tick = () => {
            set((state) => {
                const nowStr = state.currentTime.toTimeString().slice(0, 8);
                // 실행되지 않은 이벤트만 실행
                const toFire = state.events.filter((e) => e.time === nowStr && !e.executed);
                if (toFire.length > 0) {
                    console.log(`🔔 startSimulation 이벤트 실행: ${nowStr}, 개수: ${toFire.length}`);
                }
                toFire.forEach((e) => {
                    console.log(`🎵 이벤트 실행: ${e.time}`);
                    e.action();
                    e.executed = true; // 실행 표시
                });
                const remaining = state.events.filter((e) => e.time !== nowStr || !e.executed);
                // 시간 진행
                const nextTime = new Date(state.currentTime.getTime() + 1000 * state.speed);
                return {
                    currentTime: nextTime,
                    events: remaining,
                };
            });
        };

        // 즉시 실행하고
        tick();
        // 1초 간격으로 호출
        const id = window.setInterval(tick, 1000);
        set({ timerId: id });
    },

    pauseSimulation: () => {
        const id = get().timerId;
        if (id != null) {
            clearInterval(id);
            set({ timerId: null, isRunning: false });
        }
    },

    resumeSimulation: () => {
        if (get().timerId != null) return;

        // 즉시 실행하지 않고 타이머만 시작 (즉시 실행 제거)
        const id = window.setInterval(() => {
            set((state) => {
                const nowStr = state.currentTime.toTimeString().slice(0, 8);
                // 실행되지 않은 이벤트만 실행
                const toFire = state.events.filter((e) => e.time === nowStr && !e.executed);
                if (toFire.length > 0) {
                    console.log(`🔔 resumeSimulation 이벤트 실행: ${nowStr}, 개수: ${toFire.length}`);
                }
                toFire.forEach((e) => {
                    console.log(`🎵 이벤트 실행: ${e.time}`);
                    e.action();
                    e.executed = true; // 실행 표시
                });
                const remaining = state.events.filter((e) => e.time !== nowStr || !e.executed);
                const nextTime = new Date(state.currentTime.getTime() + 1000 * state.speed);
                return {
                    currentTime: nextTime,
                    events: remaining,
                };
            });
        }, 1000);
        set({ timerId: id, isRunning: true });
    },

    setSpeed: (speed) => {
        set({ speed });

        // 타이머가 실행 중이면 재시작하여 새로운 배속 적용
        if (get().timerId) {

            // 현재 타이머 정지
            const id = get().timerId;
            if (id != null) {
                clearInterval(id);
            }

            // 새로운 배속으로 타이머 재시작
            const tick = () => {
                set((state) => {
                    const nowStr = state.currentTime.toTimeString().slice(0, 8);
                    // 실행되지 않은 이벤트만 실행
                    const toFire = state.events.filter((e) => e.time === nowStr && !e.executed);
                    if (toFire.length > 0) {
                        console.log(`🔔 setSpeed 이벤트 실행: ${nowStr}, 개수: ${toFire.length}`);
                    }
                    toFire.forEach((e) => {
                        console.log(`🎵 이벤트 실행: ${e.time}`);
                        e.action();
                        e.executed = true; // 실행 표시
                    });
                    const remaining = state.events.filter((e) => e.time !== nowStr || !e.executed);
                    const nextTime = new Date(state.currentTime.getTime() + 1000 * state.speed);
                    return {
                        currentTime: nextTime,
                        events: remaining,
                    };
                });
            };

            const newId = window.setInterval(tick, 1000);
            set({ timerId: newId });
        }
    },
}));
