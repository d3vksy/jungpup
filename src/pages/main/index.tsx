import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import { ClockSimulator } from "./conpo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Github } from "lucide-react";


function getDDay(targetDateStr: string): string {
    const today: Date = new Date();
    const targetDate: Date = new Date(targetDateStr);
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime: number = targetDate.getTime() - today.getTime();
    const diffDays: number = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        return `D-${diffDays}`;
    } else if (diffDays === 0) {
        return 'D-Day';
    } else {
        return `D+${Math.abs(diffDays)}`;
    }
}

const MainPage = () => {
    return (
        <ThemeProvider defaultTheme="dark">
            <div style={{ margin: "10px", borderBottom: "1.7px solid #404040", padding: "5px" }} className="flex items-center">
                <div style={{ marginRight: "auto" }}>
                    <h1 style={{ fontSize: "1.2em", fontWeight: "600" }}>대학수학능력시험 시뮬레이터</h1>
                    <p style={{ color: "#52525b" }}>CSAT SIMULATOR 2025 <b>{getDDay("2025-11-13")}</b></p>
                </div>
                <div className="flex items-center space-x-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Info className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>제작자 정보</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold">개발자 : Kim suyun (aka. devksy)</h3>
                                        <a
                                            href="https://github.com/d3vksy"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Github className="h-4 w-4" />
                                        </a>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        이 프로젝트는 수험생들을 위한 수능 시험 환경 시뮬레이터입니다.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">기술 스택</h3>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>• React 19 + TypeScript</li>
                                        <li>• Vite + Tailwind CSS</li>
                                        <li>• Web Audio API</li>
                                        <li>• Zustand (상태 관리)</li>
                                        <li>• Tailwind CSS + Shadcn UI</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">주요 기능</h3>
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        <li>• 2025년 수능 시뮬레이션</li>
                                        <li>• 3D 입체음향 시스템</li>
                                        <li>• 실시간 오디오 방송 재생</li>
                                        <li>• 영어 듣기 방송 파일 업로드</li>
                                        <li>• 시간 제어 및 교시 바로가기</li>
                                    </ul>
                                </div>
                                <div className="pt-2 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        © 2025 CSAT Simulator. All rights reserved.
                                    </p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <ModeToggle />
                </div>
            </div>
            <div>
                <ClockSimulator />
            </div>

        </ThemeProvider>
    )
}

export default MainPage