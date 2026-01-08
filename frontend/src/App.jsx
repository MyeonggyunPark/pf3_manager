import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import api from "./api"; 

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS (MOCK DATA - Fallback for Missing Backend Models) ---
// 일정/수업(Lesson) 모델은 아직 백엔드에 없으므로 Mock 데이터 유지
const MOCK_TODAY_LESSONS = [
  {
    id: 1,
    time: "14:00",
    student: "김철수",
    content: "A2 문법 - 관계대명사 심화",
    type: "Grammatik",
    status: "pending",
  },
  {
    id: 2,
    time: "16:30",
    student: "이영희",
    content: "C1 작문 - 그래프 묘사하기",
    type: "Schreiben",
    status: "completed",
  },
];

const MOCK_WEEKLY_SCHEDULE = [
  { day: "Mon", date: "15", lessons: [] },
  {
    day: "Tue",
    date: "16",
    lessons: [{ time: "10:00", student: "박민수", type: "Hören" }],
  },
  {
    day: "Wed",
    date: "17",
    isToday: true,
    lessons: [
      { time: "14:00", student: "김철수", type: "Grammatik" },
      { time: "16:30", student: "이영희", type: "Schreiben" },
    ],
  },
  {
    day: "Thu",
    date: "18",
    lessons: [{ time: "19:00", student: "김철수", type: "Sprechen" }],
  },
  { day: "Fri", date: "19", lessons: [] },
  {
    day: "Sat",
    date: "20",
    lessons: [
      { time: "11:00", student: "이영희", type: "Lesen" },
      { time: "13:00", student: "박민수", type: "Test" },
    ],
  },
  { day: "Sun", date: "21", lessons: [] },
];

// --- UI Components ---
const Card = ({ className, children }) => (
  <div
    className={cn(
      "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
      className,
    )}
  >
    {children}
  </div>
);
const CardHeader = ({ className, children }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>
    {children}
  </div>
);
const CardTitle = ({ className, children }) => (
  <h3
    className={cn(
      "text-lg font-bold leading-none tracking-tight text-primary",
      className,
    )}
  >
    {children}
  </h3>
);
const CardContent = ({ className, children }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

const Button = ({
  variant = "default",
  size = "default",
  className,
  children,
  isLoading,
  ...props
}) => {
  const variants = {
    default: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md",
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
    outline:
      "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
    ghost: "hover:bg-secondary/50 hover:text-primary",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    secondary:
      "bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    icon: "h-10 w-10",
  };
  return (
    <button
      disabled={isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <LucideIcons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </button>
  );
};

const Badge = ({ variant = "default", className, children }) => {
  const variants = {
    default:
      "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "text-muted-foreground border-border",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground",
    success: "border-transparent bg-success/20 text-[#5f6e63]",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};

const Input = ({ className, ...props }) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

const TabsList = ({ className, children }) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className,
    )}
  >
    {children}
  </div>
);

const TabsTrigger = ({ value, activeValue, onClick, children }) => (
  <button
    onClick={() => onClick(value)}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      activeValue === value
        ? "bg-card text-primary shadow-sm"
        : "hover:bg-background/50 hover:text-primary",
    )}
  >
    {children}
  </button>
);

const getIcon = (name, props) => {
  if (!name) return null;
  const pascalName = name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const IconComponent = LucideIcons[pascalName] || LucideIcons.HelpCircle;
  return <IconComponent {...props} />;
};

// --- Pages & Views ---

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
      // 1. 로그인 요청 (성공 시 HttpOnly 쿠키가 브라우저에 저장됨)
      const response = await api.post("/api/auth/login/", { email, password });
      
      // 2. dj-rest-auth 기본 응답에서 user 객체가 없을 수도 있음 (설정에 따라 다름)
      // 따라서 user 정보를 위해 별도 조회가 필요할 수 있으나, 여기서는 응답이나 이메일로 처리
      const userInfo = {
        name: response.data.user?.name || email.split("@")[0],
        email: email,
      };

      // 3. UI 유지를 위해 로컬 스토리지 사용 (토큰은 쿠키에 있으므로 저장 안 함)
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
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-center gap-2">
                <LucideIcons.AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">이메일</label>
              <Input
                type="email"
                placeholder="admin@mytutor.com"
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

const DashboardView = ({ students, courses }) => {
  // 실제 데이터로 통계 계산
  const unpaidCount = courses.filter((c) => !c.is_paid).length;
  const totalStudents = students.length;
  const TODAY_LESSONS = MOCK_TODAY_LESSONS; // Mock

  return (
    <div className="space-y-6 animate-in">
      {unpaidCount > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-destructive bg-destructive/10 p-4 text-destructive-foreground shadow-sm">
          <div className="bg-destructive p-2 rounded-lg text-white">
            <LucideIcons.AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm font-medium">
            총 <span className="font-bold underline">{unpaidCount}명</span>의
            학생이 수강료 미납 상태입니다.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-destructive/30 hover:bg-destructive/10 text-destructive-foreground"
          >
            확인하기
          </Button>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 lg:col-span-5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <LucideIcons.Calendar className="w-5 h-5 text-accent" /> 오늘의
              수업
            </CardTitle>
            <Badge variant="secondary" className="text-primary font-bold">
              12월 17일
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-4">
            {TODAY_LESSONS.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-4 hover:border-accent hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 flex-col items-center justify-center rounded-lg border text-sm font-bold",
                      lesson.status === "completed"
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-white border-border text-muted-foreground",
                    )}
                  >
                    <span>{lesson.time.split(":")[0]}</span>
                    <span className="text-[10px] opacity-70">
                      {lesson.time.split(":")[1]}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-700 group-hover:text-primary transition-colors">
                        {lesson.student}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 bg-white"
                      >
                        {lesson.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {lesson.content}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full",
                    lesson.status === "completed"
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground hover:text-accent hover:bg-background",
                  )}
                >
                  <LucideIcons.CheckCircle2 className="w-6 h-6" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="col-span-4 lg:col-span-2 space-y-6">
          <StatCard
            title="이번 달 예상 수익"
            value="€ 2,450"
            trend="전월 대비 12% ▲"
            icon="TrendingUp"
            color="primary"
          />
          <StatCard
            title="진행 중인 학생"
            value={`${totalStudents}명`}
            trend="실시간 데이터"
            icon="Users"
            color="accent"
          />
          <Card className="bg-linear-to-br from-[#4C72A9] to-[#3b5b8a] text-white border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm text-white">빠른 실행</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full justify-start h-11">
                <LucideIcons.PlusCircle className="mr-2 h-4 w-4" /> 수업 일지
                작성
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start bg-white text-primary hover:bg-white/90 h-11"
              >
                <LucideIcons.UserPlus className="mr-2 h-4 w-4" /> 학생 추가
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const ScheduleView = () => {
  const [viewMode, setViewMode] = useState("weekly");
  const WEEKLY_SCHEDULE = MOCK_WEEKLY_SCHEDULE; // Mock

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <TabsList className="grid w-75 grid-cols-2">
          <TabsTrigger
            value="weekly"
            activeValue={viewMode}
            onClick={setViewMode}
          >
            이번 주 (Weekly)
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            activeValue={viewMode}
            onClick={setViewMode}
          >
            이달 (Monthly)
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2 text-primary font-bold bg-white px-3 py-1.5 rounded-lg border border-border shadow-sm">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <LucideIcons.ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm mx-1">2025. 12. 15 - 12. 21</span>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <LucideIcons.ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {viewMode === "weekly" ? (
        <div className="grid grid-cols-7 gap-4">
          {WEEKLY_SCHEDULE.map((day, idx) => (
            <Card
              key={idx}
              className={cn(
                "min-h-75 border-l-4 shadow-sm hover:shadow-md transition-shadow",
                day.isToday
                  ? "border-l-accent ring-1 ring-accent/20 bg-white"
                  : "border-l-transparent bg-white/60",
              )}
            >
              <div className="p-3 border-b border-border text-center">
                <p
                  className={cn(
                    "text-xs font-bold uppercase",
                    day.isToday ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {day.day}
                </p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    day.isToday ? "text-primary" : "text-foreground",
                  )}
                >
                  {day.date}
                </p>
              </div>
              <div className="p-2 space-y-2">
                {day.lessons.map((l, i) => (
                  <div
                    key={i}
                    className="rounded border border-border bg-white p-2 text-xs shadow-sm hover:border-accent transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-accent"></div>
                      {l.time}
                    </div>
                    <div className="font-medium text-slate-700">
                      {l.student}
                    </div>
                    <div className="text-[10px] text-muted-foreground bg-background border border-border px-1.5 rounded w-fit mt-1.5">
                      {l.type}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <div className="grid grid-cols-7 text-center mb-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-xs font-bold text-muted-foreground uppercase"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 h-125">
            {[...Array(31)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md border border-border p-2 flex flex-col justify-between text-sm transition-colors",
                  i + 1 === 17
                    ? "bg-accent/10 border-accent font-bold text-accent"
                    : "bg-white hover:bg-background",
                )}
              >
                <span>{i + 1}</span>
                {[5, 10, 12, 17, 20, 24].includes(i + 1) && (
                  <div className="h-1 w-full bg-primary/30 rounded-full mt-auto"></div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const StudentListView = ({ students }) => (
  <Card className="animate-in border-none shadow-sm">
    <div className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="relative">
          <LucideIcons.Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            className="flex h-10 w-72 rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
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
        <tr className="border-b border-border transition-colors hover:bg-muted/20 data-[state=selected]:bg-muted">
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
      <tbody className="[&_tr:last-child]:border-0">
        {students.length === 0 ? (
          <tr>
            <td colSpan="5" className="p-6 text-center text-muted-foreground">
              데이터가 없습니다. (Axios 설정 및 DB 데이터 확인 필요)
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

const CourseListView = ({ courses, students }) => {
  // 백엔드 CourseRegistrationSerializer는 'student' 필드에 ID를 반환함.
  // 따라서 학생 목록에서 ID를 이용해 이름을 찾아야 함.
  const getStudentName = (id) => {
    // 혹시 Serializer가 확장되어 객체나 이름을 반환할 경우를 대비
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
};

const ExamResultsView = ({ exams, officialExams }) => {
  const [examTab, setExamTab] = useState("internal");

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
                      {/* serializers.py에서 student_name 필드를 제공하므로 바로 사용 가능 */}
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
                          <>
                            {exam.total_score}
                            <span className="text-xs text-muted-foreground font-normal">
                              {/* ExamRecordSerializer에는 max 점수가 포함되지 않으므로 UI에서 처리 */}
                              {/* / {exam.max || "-"} */}
                            </span>
                          </>
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
};

const SettingsView = () => (
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

// --- Main Export ---
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("is_logged_in"),
  );

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;
  return <DashboardApp />;
}

function DashboardApp() {
  const [user] = useState(
    JSON.parse(localStorage.getItem("user_info") || "{}"),
  );
  const [activeTab, setActiveTab] = useState("dashboard");
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [officialExams, setOfficialExams] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // api.js에서 withCredentials: true가 설정되었으므로
      // 이제 쿠키가 전송되어 401 오류가 발생하지 않음
      const [studentsRes, coursesRes, examsRes, officialRes] =
        await Promise.all([
          api.get("/api/students/"),
          api.get("/api/courses/"),
          api.get("/api/exam-records/"),
          api.get("/api/official-results/"),
        ]);
      setStudents(studentsRes.data);
      setCourses(coursesRes.data);
      setExams(examsRes.data);
      setOfficialExams(officialRes.data);
    } catch (err) {
      console.error("Fetch Error:", err);
      // 실제 앱에서는 Toast Notification 등을 사용 권장
      if (err.response && err.response.status === 401) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        localStorage.removeItem("is_logged_in");
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch (e) {
      console.error(e);
    }
    // 로그아웃 시 쿠키는 백엔드에서 삭제하라고 응답을 주거나 만료시킴
    // 프론트에서는 로컬 스토리지 정보 삭제
    localStorage.removeItem("user_info");
    localStorage.removeItem("is_logged_in");
    window.location.reload();
  };

  const getPageTitle = (t) =>
    ({
      dashboard: "Overview",
      schedule: "Schedule",
      students: "Students",
      courses: "Contracts",
      exams: "Exam Results",
      settings: "Settings",
    })[t];
  const getPageDescription = (t) =>
    ({
      dashboard: "오늘의 일정과 주요 지표",
      schedule: "주간 및 월간 수업 일정",
      students: "등록된 학생 목록",
      courses: "수강권 및 결제 관리",
      exams: "모의고사 및 정규 시험",
      settings: "환경설정",
    })[t];

  const renderContent = (t, data) => {
    switch (t) {
      case "dashboard":
        return <DashboardView {...data} />;
      case "schedule":
        return <ScheduleView />;
      case "students":
        return <StudentListView students={data.students} />;
      case "courses":
        return (
          <CourseListView courses={data.courses} students={data.students} />
        );
      case "exams":
        return (
          <ExamResultsView
            exams={data.exams}
            officialExams={data.officialExams}
          />
        );
      case "settings":
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      <aside className="w-64 bg-primary text-primary-foreground flex flex-col shadow-2xl z-20">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2 tracking-tight">
            <span className="bg-accent text-white rounded-lg p-1 w-8 h-8 flex items-center justify-center text-lg shadow-md">
              M
            </span>
            MyTutor
          </h1>
          <p className="text-[10px] text-secondary mt-2 uppercase tracking-widest font-semibold opacity-80">
            v8.0 Live API
          </p>
        </div>
        <nav className="flex-1 px-3 space-y-1 mt-2">
          <SidebarItem
            icon="layout-dashboard"
            label="대시보드"
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
          />
          <SidebarItem
            icon="calendar-days"
            label="전체 일정"
            active={activeTab === "schedule"}
            onClick={() => setActiveTab("schedule")}
          />
          <SidebarItem
            icon="users"
            label="학생 관리"
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
          />
          <SidebarItem
            icon="book-open"
            label="수강/계약 관리"
            active={activeTab === "courses"}
            onClick={() => setActiveTab("courses")}
          />
          <SidebarItem
            icon="graduation-cap"
            label="시험 결과"
            active={activeTab === "exams"}
            onClick={() => setActiveTab("exams")}
          />
          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] uppercase text-secondary font-bold tracking-wider opacity-70">
              System
            </p>
          </div>
          <SidebarItem
            icon="settings"
            label="설정"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </nav>
        <div className="p-4 border-t border-secondary/20 bg-primary-foreground/5">
          <div className="flex items-center gap-3 hover:bg-primary-foreground/10 p-2 rounded-lg cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
              {user.name?.[0] || "K"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-secondary truncate">Admin</p>
            </div>
            <LucideIcons.LogOut
              onClick={handleLogout}
              className="w-4 h-4 text-secondary hover:text-white transition-colors cursor-pointer"
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-background">
        <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary">
              {getPageTitle(activeTab)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {getPageDescription(activeTab)}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground relative"
            >
              <LucideIcons.Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-background"></span>
            </Button>
            <Button
              onClick={fetchData}
              variant="outline"
              size="icon"
              isLoading={loading}
              title="Refresh"
            >
              <LucideIcons.RefreshCw
                className={cn("w-4 h-4", loading && "animate-spin")}
              />
            </Button>
            <Button className="gap-2">
              <LucideIcons.Plus className="w-4 h-4" /> 새로 만들기
            </Button>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {renderContent(activeTab, {
            students,
            courses,
            exams,
            officialExams,
          })}
        </div>
      </main>
    </div>
  );
}

const SidebarItem = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all select-none group mx-2",
      active
        ? "bg-primary-foreground/10 text-white font-bold border-l-4 border-accent"
        : "text-secondary hover:bg-primary-foreground/5 hover:text-white",
    )}
  >
    {getIcon(icon, {
      className: cn(
        "w-4 h-4 transition-transform",
        active ? "" : "group-hover:scale-110",
      ),
    })}
    <span className="text-sm">{label}</span>
  </div>
);

export default App;