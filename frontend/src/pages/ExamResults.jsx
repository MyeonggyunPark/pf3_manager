import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import api from "../api";
import { getIcon } from "../lib/utils";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { TabsList, TabsTrigger } from "../components/ui/Tabs";

// StatCard Component for consistent UI
// UI 일관성을 위해 StatCard 컴포넌트 재정의
const StatCard = ({ title, value, trend, icon, color }) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
        </CardTitle>
        <div
            className={`p-2 rounded-lg ${
            color === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-accent/10 text-accent"
            }`}
        >
            {getIcon(icon, { className: "h-4 w-4" })}
        </div>
        </CardHeader>
        <CardContent>
        <div className="text-2xl font-extrabold text-slate-800">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{trend}</p>
        </CardContent>
    </Card>
    );

    export default function ExamResults() {
        const location = useLocation();
        const [exams, setExams] = useState([]);
        const [officialExams, setOfficialExams] = useState([]);
        const [examTab, setExamTab] = useState(location.state?.tab || "internal");
        
        useEffect(() => {
            Promise.all([
            api.get("/api/exam-records/"),
            api.get("/api/official-results/"),
            ]).then(([eRes, oRes]) => {
            setExams(eRes.data);
            setOfficialExams(oRes.data);
            });
        }, []);

    const displayData = examTab === "internal" ? exams : officialExams;

    return (
        <div className="space-y-6 animate-in">
        <div className="grid gap-6 md:grid-cols-3">
            <StatCard
            title="평균 합격률 (정규)"
            value="-"
            trend="데이터 집계 중"
            icon="Award"
            color="primary"
            />
            <StatCard
            title="총 응시 횟수"
            value={`${exams.length + officialExams.length}회`}
            trend="내부 + 정규"
            icon="Trophy"
            color="secondary"
            />
        </div>

        <div className="flex flex-col gap-4">
            <TabsList className="w-fit">
            <TabsTrigger
                value="internal"
                activeValue={examTab}
                onClick={setExamTab}
            >
                모의고사 (Mock)
            </TabsTrigger>
            <TabsTrigger
                value="official"
                activeValue={examTab}
                onClick={setExamTab}
            >
                정규 시험 (Official)
            </TabsTrigger>
            </TabsList>
            <Card>
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b border-border">
                    <tr className="border-b border-border transition-colors hover:bg-muted/20">
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                        학생명
                    </th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                        시험 이름
                    </th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                        응시일
                    </th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                        점수/상태
                    </th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">
                        등급
                    </th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                        Action
                    </th>
                    </tr>
                </thead>
                <tbody>
                    {displayData.length === 0 ? (
                    <tr>
                        <td
                        colSpan="6"
                        className="p-6 text-center text-muted-foreground"
                        >
                        데이터가 없습니다.
                        </td>
                    </tr>
                    ) : (
                    displayData.map((exam, i) => (
                        <tr
                        key={i}
                        className="border-b border-border transition-colors hover:bg-muted/20"
                        >
                        <td className="p-4 align-middle font-bold text-slate-700">
                            {exam.student_name}
                        </td>
                        <td className="p-4 align-middle text-primary font-medium">
                            {examTab === "internal"
                            ? exam.exam_name
                            : exam.exam_standard_name || exam.exam_name_manual}
                        </td>
                        <td className="p-4 align-middle font-mono text-xs text-muted-foreground">
                            {exam.exam_date}
                        </td>
                        <td className="p-4 align-middle font-bold text-slate-700">
                            {examTab === "internal" ? (
                            <>{exam.total_score}</>
                            ) : (
                            <Badge
                                variant={
                                exam.status === "PASSED"
                                    ? "success"
                                    : exam.status === "FAILED"
                                    ? "destructive"
                                    : "outline"
                                }
                            >
                                {exam.status}
                            </Badge>
                            )}
                        </td>
                        <td className="p-4 align-middle">
                            <Badge variant="outline" className="bg-white">
                            {exam.grade || "-"}
                            </Badge>
                        </td>
                        <td className="p-4 align-middle text-right">
                            <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            >
                            <LucideIcons.FileText className="h-4 w-4" />
                            </Button>
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
            </Card>
        </div>
        </div>
    );
}
