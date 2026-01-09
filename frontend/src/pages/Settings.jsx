import * as LucideIcons from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function Settings() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in">
        <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-primary ring-4 ring-background">
                K
            </div>
            <div>
                <CardTitle className="text-xl">김선생님 (Admin)</CardTitle>
                <p className="text-sm text-muted-foreground">kimm@mytutor.com</p>
            </div>
            <Button className="ml-auto" variant="primary">
                프로필 수정
            </Button>
            </CardHeader>
        </Card>
        <Card>
            <CardHeader>
            <CardTitle>시스템 설정</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                <div className="text-sm font-medium">이메일 알림</div>
                <div className="text-xs text-muted-foreground">
                    수업 1시간 전 알림
                </div>
                </div>
                <LucideIcons.ToggleRight className="h-6 w-6 text-primary cursor-pointer" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/20 transition-colors">
                <div className="space-y-0.5">
                <div className="text-sm font-medium">다크 모드</div>
                <div className="text-xs text-muted-foreground">
                    현재: Cloud Dancer
                </div>
                </div>
                <LucideIcons.ToggleLeft className="h-6 w-6 text-muted-foreground cursor-pointer" />
            </div>
            </CardContent>
        </Card>
        </div>
    );
}
