// src/components/ClockSimulator.tsx
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useSimulatorStore } from './useSimulatorStore';
import { useAudioStore } from './useAudioStore';
import clsx from 'clsx';

export const ClockSimulator = () => {
    const {
        currentTime,
        startSimulation,
        pauseSimulation,
        resumeSimulation,
        currentStage,
        registerEvent,
        clearEvents,
        setCurrentStage,
        setSpeed,
        speed,
        isRunning,
    } = useSimulatorStore();

    const {
        setTrack,
        play,
        pause,
        stop,
        setVolume,
        preloadAudio,
        trackTitle,
        audioContext,
        volume,
        spatialEnabled,
        toggleSpatialEffect,
        speakerPosition,
        setSpeakerPosition,
        spatialEffects,
        setSpatialEffects,
        resetSpatialSettings
    } = useAudioStore();

    const [progress, setProgress] = useState(0);
    const [stageRemainingTime, setStageRemainingTime] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [listeningAudio, setListeningAudio] = useState<File | null>(null);
    const [listeningAudioUrl, setListeningAudioUrl] = useState<string | null>(null);
    const [showListeningWarning, setShowListeningWarning] = useState(false);

    // src/components/ClockSimulator.tsx — 전체 일정 정의

    const schedule = [
        { subject: '감독관 입실', startTime: '08:05:00', endTime: '08:07:00', startsound: '시험감독관집합' },
        { subject: '입실완료', startTime: '08:10:00', endTime: '08:40:00', startsound: '수험생유의사항' },
        {
            subject: '국어',
            startTime: '08:40:00',
            endTime: '10:00:00',
            startsound: '1교시본령',
            endsound: '1교시종료령',
            preSound: '1교시예비령',
            readySound: '1교시준비령',
            end10Sound: '1교시종료10분전'
        },
        {
            subject: '수학',
            startTime: '10:30:00',
            endTime: '12:10:00',
            startsound: '2교시본령',
            endsound: '2교시본령',
            teacherEntrySound: '2교시감독입실',
            preSound: '2교시예비령',
            readySound: '2교시준비령',
            end10Sound: '2교시종료10분전'
        },
        {
            subject: '영어',
            startTime: '13:10:00',
            endTime: '14:20:00',
            listeningStartTime: '13:07:00',  // 듣기 방송 시작 시간 (3분 일찍 시작)
            endsound: '3교시종료령',
            teacherEntrySound: '3교시감독입실',
            preSound: '3교시예비령',
            readySound: '3교시준비령',
            end10Sound: '3교시종료10분전'
        },
        {
            subject: '한국사',
            startTime: '14:50:00',
            endTime: '15:20:00',
            startsound: '한국사본령',
            endsound: '한국사종료령',
            teacherEntrySound: '4교시감독입실',
            preSound: '4교시(한국사)예비령',
            readySound: '한국사준비령',
            end10Sound: '한국사종료5분전'
        },
        {
            subject: '탐구1',
            startTime: '15:35:00',
            endTime: '16:05:00',
            startsound: '4교시본령',
            endsound: '4교시제1선택종료령',
            preSound: '탐구영역준비령',
            end10Sound: '4교시제1선택종료5분전'
        },
        {
            subject: '탐구2',
            startTime: '16:07:00',
            endTime: '16:37:00',
            startsound: '4교시제2선택본령',
            endsound: '4교시제2선택종료령',
            end10Sound: '4교시제2선택종료5분전'
        }
    ];

    // 파일 업로드 처리 함수
    const handleListeningFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // 기존 URL 정리
            if (listeningAudioUrl) {
                URL.revokeObjectURL(listeningAudioUrl);
            }

            setListeningAudio(file);
            const url = URL.createObjectURL(file);
            setListeningAudioUrl(url);
            setShowListeningWarning(false);

            // 이벤트 다시 등록
            clearEvents();
            registerAllEvents();

            toast.success('영어 듣기 방송 파일이 설정되었습니다.');
        }
    };

    // 파일 제거 함수
    const removeListeningFile = () => {
        if (listeningAudioUrl) {
            URL.revokeObjectURL(listeningAudioUrl);
        }
        setListeningAudio(null);
        setListeningAudioUrl(null);
        setShowListeningWarning(true);

        // 이벤트 다시 등록
        clearEvents();
        registerAllEvents();

        toast.info('영어 듣기 방송 파일이 제거되었습니다.');
    };

    // 모든 오디오 파일을 미리 로드하는 함수
    const preloadAllAudio = async () => {
        const audioFiles = [
            '시험감독관집합',
            '수험생유의사항',
            '1교시본령',
            '1교시종료령',
            '1교시예비령',
            '1교시준비령',
            '1교시종료10분전',
            '2교시본령',
            '2교시감독입실',
            '2교시예비령',
            '2교시준비령',
            '2교시종료10분전',
            '3교시종료령',
            '3교시감독입실',
            '3교시예비령',
            '3교시준비령',
            '3교시종료10분전',
            '한국사본령',
            '한국사종료령',
            '4교시감독입실',
            '4교시(한국사)예비령',
            '한국사준비령',
            '한국사종료5분전',
            '4교시본령',
            '4교시제1선택종료령',
            '탐구영역준비령',
            '4교시제1선택종료5분전',
            '4교시제2선택본령',
            '4교시제2선택종료령',
            '4교시제2선택종료5분전'
        ];

        console.log('오디오 파일 프리로드 시작...');

        // 병렬로 모든 오디오 파일 로드
        const loadPromises = audioFiles.map(async (fileName) => {
            try {
                await preloadAudio(`/sounds/${fileName}.mp3`);
                console.log(`✅ ${fileName}.mp3 로드 완료`);
            } catch (error) {
                console.error(`❌ ${fileName}.mp3 로드 실패:`, error);
            }
        });

        try {
            await Promise.all(loadPromises);
            console.log('🎵 모든 오디오 파일 프리로드 완료!');
        } catch (error) {
            console.error('오디오 프리로드 중 오류 발생:', error);
        }
    };

    // 컴포넌트 마운트 시 오디오 프리로드
    useEffect(() => {
        preloadAllAudio();
        setShowListeningWarning(true); // 초기 경고 표시
    }, []);

    // 이벤트 등록 함수 - useCallback으로 메모이제이션
    const registerAllEvents = useCallback(() => {
        const subtractTime = (time: string, minutes: number): string => {
            const [h, m, s] = time.split(':').map(Number);
            let totalMinutes = h * 60 + m - minutes;
            let newHours = Math.floor(totalMinutes / 60);
            let newMinutes = totalMinutes % 60;

            // 음수 처리
            if (newMinutes < 0) {
                newHours -= 1;
                newMinutes += 60;
            }
            if (newHours < 0) {
                newHours += 24;
            }

            const result = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            console.log(`시간 계산: ${time} - ${minutes}분 = ${result}`);
            return result;
        };

        schedule.forEach(({
            subject,
            startTime,
            endTime,
            startsound,
            endsound,
            teacherEntrySound,
            preSound,
            readySound,
            end10Sound,
            listeningStartTime,
        }) => {
            if (startsound) {
                registerEvent({
                    time: startTime,
                    action: async () => {
                        try {
                            toast(`🔔 ${subject} 본령`);
                            await setTrack(`/sounds/${startsound}.mp3`, `${subject} 본령`);
                            play();
                        } catch (error) {
                            console.error(`오디오 재생 실패: ${subject} 본령`, error);
                            toast.error(`오디오 재생 실패: ${subject} 본령`);
                        }
                    },
                });
            } else {
                // 본령이 없는 교시(영어)의 경우 시험 시작만 알림
                registerEvent({
                    time: startTime,
                    action: async () => {
                        toast(`📝 ${subject} 시험 시작`);
                    },
                });
            }
            if (endsound) {
                registerEvent({
                    time: endTime,
                    action: async () => {
                        try {
                            toast(`✅ ${subject} 종료`);
                            await setTrack(`/sounds/${endsound}.mp3`, `${subject} 종료`);
                            play();
                        } catch (error) {
                            console.error(`오디오 재생 실패: ${subject} 종료`, error);
                            toast.error(`오디오 재생 실패: ${subject} 종료`);
                        }
                    },
                });
            }
            if (teacherEntrySound) {
                const teacherEntryTime = subtractTime(startTime, 15);
                registerEvent({
                    time: teacherEntryTime,
                    action: async () => {
                        try {
                            console.log(`🔔 ${subject} 교사 입장 안내방송 실행: ${teacherEntryTime}`);
                            toast(`🔔 ${subject} 교사 입장 안내방송`);
                            await setTrack(`/sounds/${teacherEntrySound}.mp3`, `${subject} 교사 입장 안내`);
                            play();
                        } catch (error) {
                            console.error(`오디오 재생 실패: ${subject} 교사 입장 안내`, error);
                            toast.error(`오디오 재생 실패: ${subject} 교사 입장 안내`);
                        }
                    },
                });
                console.log(`${subject} 감독 입실 이벤트 등록: ${teacherEntryTime} (${teacherEntrySound})`);
            }
            if (preSound) {
                registerEvent({
                    time: subtractTime(startTime, 10),
                    action: async () => {
                        try {
                            toast(`🔔 ${subject} 예비령`);
                            await setTrack(`/sounds/${preSound}.mp3`, `${subject} 예비령`);
                            play();
                        } catch (error) {
                            console.error(`오디오 재생 실패: ${subject} 예비령`, error);
                            toast.error(`오디오 재생 실패: ${subject} 예비령`);
                        }
                    },
                });
            }
            if (readySound) {
                registerEvent({
                    time: subtractTime(startTime, 5),
                    action: async () => {
                        try {
                            toast(`🔔 ${subject} 준비령`);
                            await setTrack(`/sounds/${readySound}.mp3`, `${subject} 준비령`);
                            play();
                        } catch (error) {
                            console.error(`오디오 재생 실패: ${subject} 준비령`, error);
                            toast.error(`오디오 재생 실패: ${subject} 준비령`);
                        }
                    },
                });
            }
            if (end10Sound) {
                registerEvent({
                    time: subtractTime(endTime, 10),
                    action: async () => {
                        try {
                            toast(`🔔 ${subject} 종료 10분 전`);
                            await setTrack(`/sounds/${end10Sound}.mp3`, `${subject} 종료 10분 전`);
                            play();
                        } catch (error) {
                            console.error(`오디오 재생 실패: ${subject} 종료 10분 전`, error);
                            toast.error(`오디오 재생 실패: ${subject} 종료 10분 전`);
                        }
                    },
                });
            }

            // 영어 듣기 방송 이벤트 등록
            if (subject === '영어' && listeningStartTime) {
                if (listeningAudioUrl) {
                    registerEvent({
                        time: listeningStartTime,
                        action: async () => {
                            try {
                                console.log(`🎧 ${subject} 듣기 방송 실행: ${listeningStartTime}`);
                                toast(`🎧 ${subject} 듣기 방송 시작`);
                                await setTrack(listeningAudioUrl, `${subject} 듣기 방송`);
                                play();
                            } catch (error) {
                                console.error(`듣기 방송 재생 실패: ${subject}`, error);
                                toast.error(`듣기 방송 재생 실패: ${subject}`);
                            }
                        },
                    });
                    console.log(`듣기 방송 이벤트 등록: ${listeningStartTime} - ${listeningAudioUrl}`);
                } else {
                    console.log('듣기 방송 파일이 설정되지 않음');
                }
            }
        });
    }, [registerEvent, setTrack, play, listeningAudioUrl]); // useCallback 의존성 배열 추가

    // 이벤트 등록을 위한 useEffect
    useEffect(() => {
        registerAllEvents();
    }, [registerAllEvents]); // registerAllEvents만 의존성으로 설정

    const formattedTime = currentTime.toTimeString().slice(0, 8);

    useEffect(() => {
        const toSec = (t: string) => {
            const [h, m, s] = t.split(':').map(Number);
            return h * 3600 + m * 60 + s;
        };
        const now =
            currentTime.getHours() * 3600 +
            currentTime.getMinutes() * 60 +
            currentTime.getSeconds();
        const start = toSec('08:05:00');
        const end = toSec('17:45:00');
        setProgress(Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100)));

        const current = schedule.find(
            ({ startTime, endTime }) => now >= toSec(startTime) && now < toSec(endTime)
        );
        if (current) {
            const remaining = toSec(current.endTime) - now;
            setStageRemainingTime(`${Math.floor(remaining / 60)}분 ${remaining % 60}초 남음`);
        } else {
            setStageRemainingTime(null);
        }
    }, [currentTime]);

    const initialHHMM = currentTime.toTimeString().slice(0, 5);
    const [jumpTime, setJumpTime] = useState(initialHHMM);
    const handleJump = () => {
        try {
            const [h, m] = jumpTime.split(':').map(Number);
            const newTime = new Date(currentTime);
            newTime.setHours(h, m, 0, 0);

            // 기존 오디오 완전 정리
            stop();

            // 이벤트 초기화 및 다시 등록
            clearEvents();
            registerAllEvents();

            // 시뮬레이션을 새로운 시간으로 바로 시작 (일시정지 없이)
            startSimulation(newTime);
            setHasStarted(true);
        } catch (error) {
            console.error('시간 이동 실패:', error);
            toast.error('시간 이동에 실패했습니다.');
        }
    };



    // 통합된 시뮬레이션 제어 함수
    const handleSimulationControl = async () => {
        try {
            if (!hasStarted) {
                // 처음 시작하는 경우
                if (!audioContext) {
                    const ctx = new AudioContext();
                    await ctx.resume();
                    useAudioStore.setState({ audioContext: ctx });
                } else if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                startSimulation(new Date('2025-06-07T08:05:00'));
                setHasStarted(true);
            } else if (!isRunning) {
                // 일시정지된 상태 - 재개
                resumeSimulation();
                // resume() 호출 제거 - 오디오는 시뮬레이션과 독립적으로 관리
            } else {
                // 실행 중인 상태 - 일시정지
                pauseSimulation();
                pause(); // 오디오를 일시정지 (위치 저장)
            }
        } catch (error) {
            console.error('시뮬레이션 제어 실패:', error);
            toast.error('시뮬레이션 제어에 실패했습니다.');
        }
    };

    // 버튼 텍스트와 스타일 결정
    const getButtonConfig = () => {
        if (!hasStarted) {
            return {
                text: '시작',
                variant: 'default' as const,
                className: 'w-full'
            };
        } else if (!isRunning) {
            return {
                text: '재개',
                variant: 'default' as const,
                className: 'w-full'
            };
        } else {
            return {
                text: '일시정지',
                variant: 'secondary' as const,
                className: 'w-full'
            };
        }
    };

    const buttonConfig = getButtonConfig();

    // 스피커 위치 설정 함수들
    const setSpeakerPositionTopLeft = () => setSpeakerPosition(-1, 1, 0);
    const setSpeakerPositionTopCenter = () => setSpeakerPosition(0, 1, 0);
    const setSpeakerPositionTopRight = () => setSpeakerPosition(1, 1, 0);
    const setSpeakerPositionMiddleLeft = () => setSpeakerPosition(-1, 0, 0);
    const setSpeakerPositionCenter = () => setSpeakerPosition(0, 0, 0);
    const setSpeakerPositionMiddleRight = () => setSpeakerPosition(1, 0, 0);
    const setSpeakerPositionBottomLeft = () => setSpeakerPosition(-1, -1, 0);
    const setSpeakerPositionBottomCenter = () => setSpeakerPosition(0, -1, 0);
    const setSpeakerPositionBottomRight = () => setSpeakerPosition(1, -1, 0);

    const handleStageJump = async (value: string) => {
        try {
            const target = schedule.find((s) => s.subject === value);
            if (target) {
                // 기존 오디오 완전 정리
                stop();

                const [sh, sm, ss] = target.startTime.split(':').map(Number);
                const newTime = new Date(currentTime);
                newTime.setHours(sh, sm, ss, 0);
                setCurrentStage(`${value} 시작`);

                // 이벤트 초기화 및 다시 등록
                clearEvents();
                registerAllEvents();

                startSimulation(newTime);
                setHasStarted(true);

                // 본령이 있는 경우에만 재생
                if (target.startsound) {
                    await setTrack(`/sounds/${target.startsound}.mp3`, `${value} 본령`);
                    play();
                } else {
                    toast(`📝 ${value} 시험 시작`);
                }
            }
        } catch (error) {
            console.error('교시 이동 실패:', error);
            toast.error('교시 이동에 실패했습니다.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center bg-background text-foreground p-6 space-y-4">
            <Card className="w-full max-w-2xl shadow-lg border rounded-2xl">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-5xl font-extrabold tracking-widest">{formattedTime}</CardTitle>
                    <div className="text-lg font-medium">{currentStage || '대기중'}</div>
                    {stageRemainingTime && (
                        <div className="text-base text-primary font-semibold animate-pulse">{stageRemainingTime}</div>
                    )}
                    <Progress value={progress} className="h-2 bg-muted-foreground/20" />
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-3">
                    <div className="text-sm text-muted-foreground">
                        현재 방송: <span className="font-semibold">{trackTitle || '없음'}</span>
                    </div>
                    <div className="w-full space-y-2">
                        <div className="text-sm font-semibold mb-2 text-muted-foreground">시험 일정</div>
                        {schedule.map((s, idx) => {
                            const nowSec =
                                currentTime.getHours() * 3600 +
                                currentTime.getMinutes() * 60 +
                                currentTime.getSeconds();
                            const [sh, sm, ss] = s.startTime.split(':').map(Number);
                            const [eh, em, es] = s.endTime.split(':').map(Number);
                            const sSec = sh * 3600 + sm * 60 + ss;
                            const eSec = eh * 3600 + em * 60 + es;
                            const isCurrent = nowSec >= sSec && nowSec < eSec;

                            return (
                                <div
                                    key={idx}
                                    className={clsx(
                                        'flex justify-between text-sm px-3 py-2 rounded-md transition-all duration-300',
                                        isCurrent
                                            ? 'bg-primary text-primary-foreground font-bold animate-pulse'
                                            : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    <span>{s.subject}</span>
                                    <span>
                                        {s.startTime} ~ {s.endTime}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="mt-2">
                        시뮬레이션 제어
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <Tabs defaultValue="control" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="control">제어</TabsTrigger>
                            <TabsTrigger value="audio">오디오</TabsTrigger>
                            <TabsTrigger value="spatial">입체음향</TabsTrigger>
                        </TabsList>

                        <TabsContent value="control" className="space-y-4">
                            <div className="space-y-2">
                                <div className="text-sm font-semibold">시각 이동</div>
                                <div className="flex space-x-2">
                                    <input
                                        type="time"
                                        step={60}
                                        className="flex-1 border rounded-md px-2 py-1"
                                        value={jumpTime}
                                        onChange={(e) => setJumpTime(e.target.value)}
                                    />
                                    <Button className="flex-none" onClick={handleJump}>
                                        이동
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Button
                                    className={buttonConfig.className}
                                    variant={buttonConfig.variant}
                                    onClick={handleSimulationControl}
                                >
                                    {buttonConfig.text}
                                </Button>

                                <Select onValueChange={handleStageJump}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="교시 바로가기" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {schedule.map((s, idx) => (
                                            <SelectItem key={idx} value={s.subject}>
                                                {s.subject}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="audio" className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold mb-1">영어 듣기 방송 설정</p>
                                {showListeningWarning && (
                                    <div className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded mb-2">
                                        ⚠️ 영어 듣기 방송 파일이 설정되지 않았습니다.<br />
                                        3교시 영어 영역은 타종 없이 진행됩니다.
                                    </div>
                                )}
                                <div className="flex space-x-2">
                                    <input
                                        type="file"
                                        accept=".mp3"
                                        onChange={handleListeningFileUpload}
                                        className="flex-1 text-xs"
                                    />
                                    {listeningAudio && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={removeListeningFile}
                                        >
                                            제거
                                        </Button>
                                    )}
                                </div>
                                {listeningAudio && (
                                    <p className="text-xs text-green-600 mt-1">
                                        ✅ {listeningAudio.name}
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-semibold mb-1">음량 조절</p>
                                <Slider
                                    defaultValue={[volume]}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    onValueChange={(value) => setVolume(value[0])}
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold mb-1">배속 조절 (현재 {speed}배속)</p>
                                <Slider
                                    defaultValue={[speed]}
                                    min={1}
                                    max={10}
                                    step={1}
                                    onValueChange={(value) => setSpeed(value[0])}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="spatial" className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold">3D 사운드</p>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={resetSpatialSettings}
                                        >
                                            초기화
                                        </Button>
                                        <Button
                                            variant={spatialEnabled ? "default" : "outline"}
                                            size="sm"
                                            onClick={toggleSpatialEffect}
                                        >
                                            {spatialEnabled ? "켜짐" : "꺼짐"}
                                        </Button>
                                    </div>
                                </div>
                                {spatialEnabled && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground">소리 방향</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button
                                                variant={speakerPosition.x === -1 && speakerPosition.y === 1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionTopLeft}
                                                className="h-12 text-xs"
                                            >
                                                왼쪽 위
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === 0 && speakerPosition.y === 1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionTopCenter}
                                                className="h-12 text-xs"
                                            >
                                                앞쪽
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === 1 && speakerPosition.y === 1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionTopRight}
                                                className="h-12 text-xs"
                                            >
                                                오른쪽 위
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === -1 && speakerPosition.y === 0 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionMiddleLeft}
                                                className="h-12 text-xs"
                                            >
                                                왼쪽
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === 0 && speakerPosition.y === 0 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionCenter}
                                                className="h-12 text-xs"
                                            >
                                                정중앙
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === 1 && speakerPosition.y === 0 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionMiddleRight}
                                                className="h-12 text-xs"
                                            >
                                                오른쪽
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === -1 && speakerPosition.y === -1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionBottomLeft}
                                                className="h-12 text-xs"
                                            >
                                                왼쪽 아래
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === 0 && speakerPosition.y === -1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionBottomCenter}
                                                className="h-12 text-xs"
                                            >
                                                뒤쪽
                                            </Button>
                                            <Button
                                                variant={speakerPosition.x === 1 && speakerPosition.y === -1 ? "default" : "outline"}
                                                size="sm"
                                                onClick={setSpeakerPositionBottomRight}
                                                className="h-12 text-xs"
                                            >
                                                오른쪽 아래
                                            </Button>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2">
                                            현재 위치: {
                                                speakerPosition.x === 0 && speakerPosition.y === 0 ? "정중앙" :
                                                    speakerPosition.x === -1 && speakerPosition.y === 1 ? "왼쪽 앞" :
                                                        speakerPosition.x === 0 && speakerPosition.y === 1 ? "앞쪽" :
                                                            speakerPosition.x === 1 && speakerPosition.y === 1 ? "오른쪽 앞" :
                                                                speakerPosition.x === -1 && speakerPosition.y === 0 ? "왼쪽" :
                                                                    speakerPosition.x === 1 && speakerPosition.y === 0 ? "오른쪽" :
                                                                        speakerPosition.x === -1 && speakerPosition.y === -1 ? "왼쪽 뒤" :
                                                                            speakerPosition.x === 0 && speakerPosition.y === -1 ? "뒤쪽" :
                                                                                speakerPosition.x === 1 && speakerPosition.y === -1 ? "오른쪽 뒤" :
                                                                                    "정중앙"
                                            }
                                        </div>

                                        <div className="space-y-4 mt-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-semibold">공간감 (울림)</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {spatialEffects.reverbMix === 0 ? "없음" :
                                                            spatialEffects.reverbMix < 0.3 ? "약함" :
                                                                spatialEffects.reverbMix < 0.7 ? "보통" : "강함"}
                                                    </span>
                                                </div>
                                                <Slider
                                                    defaultValue={[spatialEffects.reverbMix]}
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    onValueChange={(value) => setSpatialEffects({ reverbMix: value[0] })}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {spatialEffects.reverbMix === 0 ? "울림 없음" :
                                                        spatialEffects.reverbMix < 0.3 ? "작은 공간" :
                                                            spatialEffects.reverbMix < 0.7 ? "보통 공간" : "큰 공간"}
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-semibold">메아리</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {spatialEffects.delayMix === 0 ? "없음" :
                                                            spatialEffects.delayMix < 0.3 ? "약함" :
                                                                spatialEffects.delayMix < 0.7 ? "보통" : "강함"}
                                                    </span>
                                                </div>
                                                <Slider
                                                    defaultValue={[spatialEffects.delayMix]}
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    onValueChange={(value) => setSpatialEffects({ delayMix: value[0] })}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {spatialEffects.delayMix === 0 ? "메아리 없음" :
                                                        spatialEffects.delayMix < 0.3 ? "약한 메아리" :
                                                            spatialEffects.delayMix < 0.7 ? "보통 메아리" : "강한 메아리"}
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-semibold">메아리 지속시간</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {spatialEffects.delayFeedback === 0 ? "짧음" :
                                                            spatialEffects.delayFeedback < 0.3 ? "보통" :
                                                                spatialEffects.delayFeedback < 0.7 ? "길음" : "매우 길음"}
                                                    </span>
                                                </div>
                                                <Slider
                                                    defaultValue={[spatialEffects.delayFeedback]}
                                                    min={0}
                                                    max={1}
                                                    step={0.01}
                                                    onValueChange={(value) => setSpatialEffects({ delayFeedback: value[0] })}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {spatialEffects.delayFeedback === 0 ? "빠른 소멸" :
                                                        spatialEffects.delayFeedback < 0.3 ? "보통 지속" :
                                                            spatialEffects.delayFeedback < 0.7 ? "오래 지속" : "매우 오래 지속"}
                                                </p>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-semibold">음량 안정화</p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {spatialEffects.compressorThreshold > -10 ? "약함" :
                                                            spatialEffects.compressorThreshold > -30 ? "보통" : "강함"}
                                                    </span>
                                                </div>
                                                <Slider
                                                    defaultValue={[spatialEffects.compressorThreshold]}
                                                    min={-60}
                                                    max={0}
                                                    step={1}
                                                    onValueChange={(value) => setSpatialEffects({ compressorThreshold: value[0] })}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {spatialEffects.compressorThreshold > -10 ? "자연스러운 음량" :
                                                        spatialEffects.compressorThreshold > -30 ? "균등한 음량" : "매우 균등한 음량"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </PopoverContent>
            </Popover>
        </div>
    );
};
