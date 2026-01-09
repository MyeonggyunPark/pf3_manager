import { useEffect, useState } from "react";
import * as LucideIcons from "lucide-react";
import api from "../api";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "../components/ui/Card";
import Badge from "../components/ui/Badge";

export default function CourseList() {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        Promise.all([api.get("/api/courses/"), api.get("/api/students/")]).then(
        ([cRes, sRes]) => {
            setCourses(cRes.data);
            setStudents(sRes.data);
        },
        );
    }, []);

    const getStudentName = (id) => {
        if (typeof id === "object" && id.name) return id.name;
        if (typeof id === "string") return id;
        const student = students.find((s) => s.id === id);
        return student ? student.name : `Student #${id}`;
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in">
        {courses.length === 0 ? (
            <div className="col-span-3 text-center p-8 text-muted-foreground">
            수강 데이터가 없습니다.
            </div>
        ) : (
            courses.map((c) => (
            <Card
                key={c.id}
                className="hover:border-accent transition-all hover:shadow-md cursor-default"
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-slate-700">
                    {getStudentName(c.student)}
                </CardTitle>
                <Badge
                    variant={
                    c.status === "ACTIVE"
                        ? "success"
                        : c.status === "PAUSED"
                        ? "secondary"
                        : "destructive"
                    }
                >
                    {c.status}
                </Badge>
                </CardHeader>
                <CardContent>
                <div className="text-xs text-muted-foreground font-mono mb-4 bg-background p-2 rounded border border-border flex items-center justify-between">
                    <span>
                    {c.start_date} ~ {c.end_date}
                    </span>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">
                        Total Hours
                    </p>
                    <p className="text-lg font-bold text-slate-700">
                        {c.total_hours}h{" "}
                        <span className="text-xs text-muted-foreground font-normal">
                        (@ €{c.hourly_rate})
                        </span>
                    </p>
                    </div>
                    <div className="text-right">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold">
                        Total Fee
                    </p>
                    <p className="text-xl font-extrabold text-primary">
                        €{c.total_fee}
                    </p>
                    </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border flex justify-end">
                    {c.is_paid ? (
                    <span className="text-xs font-bold text-success flex items-center gap-1">
                        <LucideIcons.Check className="w-3 h-3" /> 결제완료
                    </span>
                    ) : (
                    <span className="text-xs font-bold text-destructive flex items-center gap-1">
                        <LucideIcons.X className="w-3 h-3" /> 미납
                    </span>
                    )}
                </div>
                </CardContent>
            </Card>
            ))
        )}
        </div>
    );
}
