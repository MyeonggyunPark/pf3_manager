import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import api from "../api";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

export default function StudentList() {
    const [students, setStudents] = useState([]);

    useEffect(() => {
        api.get("/api/students/").then((res) => setStudents(res.data));
    }, []);

    return (
        <Card className="animate-in border-none shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
            <div className="relative">
                <LucideIcons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                className="flex h-10 w-72 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm pl-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="이름, 레벨 검색..."
                />
            </div>
            <select className="h-10 w-30 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option>전체</option>
                <option>Active</option>
            </select>
            </div>
        </div>
        <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b border-border">
            <tr className="border-b border-border transition-colors hover:bg-muted/20">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                학생 정보
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Level
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                시험 모드
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                상태 (DB)
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground"></th>
            </tr>
            </thead>
            <tbody>
            {students.length === 0 ? (
                <tr>
                <td colSpan="5" className="p-6 text-center text-muted-foreground">
                    데이터가 없습니다.
                </td>
                </tr>
            ) : (
                students.map((s) => (
                <tr
                    key={s.id}
                    className="border-b border-border transition-colors hover:bg-muted/20"
                >
                    <td className="p-4 align-middle">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-primary">
                        {s.name[0]}
                        </div>
                        <div>
                        <div className="font-bold text-slate-700">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                            {s.gender}, {s.age}세
                        </div>
                        </div>
                    </div>
                    </td>
                    <td className="p-4 align-middle">
                    <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="bg-white border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                        {s.current_level}
                        </span>
                        <LucideIcons.ChevronRight className="w-3 h-3 text-accent" />
                        <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">
                        {s.target_level}
                        </span>
                    </div>
                    </td>
                    <td className="p-4 align-middle">
                    <Badge
                        variant="outline"
                        className="font-normal text-muted-foreground bg-background"
                    >
                        {s.target_exam_mode}
                    </Badge>
                    </td>
                    <td className="p-4 align-middle">
                    <Badge variant="secondary">Active</Badge>
                    </td>
                    <td className="p-4 align-middle text-right">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                    >
                        <LucideIcons.MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </td>
                </tr>
                ))
            )}
            </tbody>
        </table>
        </Card>
    );
}
