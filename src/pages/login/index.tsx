import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ThemeProvider } from "@/components/theme-provider"
import { Label } from "@/components/ui/label"

const LoginPage = () => {
    return (
        <ThemeProvider>
            <div className="flex min-h-svh flex-col items-center justify-center">
                <Card className="w-full max-w-sm ">
                    <CardHeader>
                        <CardTitle>Login</CardTitle>
                        <CardDescription>
                            학생회에서 발급받은 아이디로만 로그인 가능합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form>
                            <div className="flex flex-col gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">학번</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="1101"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">패스워드</Label>
                                        <a
                                            href="#"
                                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                        >
                                            비밀번호 초기화
                                        </a>
                                    </div>
                                    <Input id="password" type="password" required />
                                </div>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="flex-col gap-2">
                        <Button type="submit" className="w-full">
                            로그인
                        </Button>
                        <Button variant="outline" className="w-full">
                            회원가입
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </ThemeProvider>

    )
}

export default LoginPage;