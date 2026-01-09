import { useState } from "react";
import * as LucideIcons from "lucide-react";
import api from "../api";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
        const response = await api.post("/api/auth/login/", { email, password });
        const userInfo = {
            name: response.data.user?.name || email.split("@")[0],
            email: email,
        };
        localStorage.setItem("user_info", JSON.stringify(userInfo));
        localStorage.setItem("is_logged_in", "true");
        onLogin(userInfo);
        } catch (err) {
        console.error(err);
        setError("이메일 또는 비밀번호를 확인해주세요.");
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in">
        <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl">
            <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
                <span className="bg-accent text-white rounded-lg p-2 w-12 h-12 flex items-center justify-center text-2xl font-bold shadow-md">
                M
                </span>
            </div>
            <CardTitle className="text-2xl">MyTutor 로그인</CardTitle>
            <p className="text-sm text-muted-foreground">
                강사 계정으로 로그인해주세요.
            </p>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                <div className="p-3 text-sm text-warning bg-warning/10 rounded-md flex items-center gap-2">
                    <LucideIcons.AlertCircle className="w-4 h-4" />
                    {error}
                </div>
                )}
                <div className="space-y-2">
                <label className="text-sm font-medium">이메일</label>
                <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">비밀번호</label>
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                </div>
                <Button
                type="submit"
                className="w-full"
                variant="primary"
                isLoading={loading}
                >
                로그인
                </Button>
            </form>
            </CardContent>
        </Card>
        </div>
    );
};

export default LoginPage;
