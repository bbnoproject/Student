(function () {
  const App = window.StudentAppCommon;
  const appRoot = document.getElementById("app-root");
  const searchInput = document.getElementById("global-search");
  const quickSearch = document.getElementById("quick-search");
  const themeToggle = document.getElementById("theme-toggle");

  if (!App || !appRoot) return;

  const PAGE_IDS = ["overview", "process", "students", "feedback"];
  const CATEGORY_ORDER = [
    "overall_strong",
    "growth_high",
    "support_priority",
    "collaboration_strength",
    "career_progress",
    "attendance_watch",
    "steady_path",
  ];

  const TAG_COPY = {
    overall_strong: {
      label: "종합 우수",
      short: "종합",
      tone: "success",
      description: "총점과 세부 역량이 균형 있게 안정적인 학생",
    },
    growth_high: {
      label: "성장 가능성 우수",
      short: "성장",
      tone: "brand",
      description: "현재 수준, 상승 또는 고수준 유지, 근거 신뢰도가 함께 높은 학생",
    },
    support_priority: {
      label: "지원 검토",
      short: "지원검토",
      tone: "danger",
      description: "총점과 별개로 운영 개입과 점검이 우선 필요한 학생",
    },
    collaboration_strength: {
      label: "협업강점",
      short: "협업",
      tone: "mint",
      description: "동료 평가, 팀 역할, 회고, 체크인 흐름에서 협업 신호가 좋은 학생",
    },
    career_progress: {
      label: "진로역량 우수",
      short: "진로",
      tone: "violet",
      description: "구체 직무 목표와 객관 근거, 실행 계획이 확인되는 학생",
    },
    attendance_watch: {
      label: "참여관찰",
      short: "참여",
      tone: "warning",
      description: "출결, 체크인, 참여 리듬을 함께 관찰할 학생",
    },
    steady_path: {
      label: "일반",
      short: "일반",
      tone: "neutral",
      description: "과정 진행 중이며 큰 위험 신호 없이 추적 중인 학생",
    },
  };

  const PROFILE_LABELS = {
    selfRegulation: "학습 자기조절",
    engagement: "참여 지속성",
    collaboration: "협업",
    resilience: "회복탄력성",
    reflection: "성찰",
    careerAgency: "진로 목적성",
  };

  const STATUS_COPY = {
    all: { label: "전체", tone: "neutral", description: "전체 학생" },
    general: { label: "일반", tone: "success", description: "과정 진행 중인 학생" },
    employed: { label: "취업", tone: "violet", description: "취업 또는 채용 연계 확인" },
    dropout: { label: "과정이탈", tone: "neutral", description: "이탈 기록이 있는 학생" },
  };

  const DEMOGRAPHIC_FILTER_COPY = {
    all: { label: "전체", tone: "neutral" },
    age: { label: "나이대", tone: "brand" },
    gender: { label: "성별", tone: "mint" },
    education: { label: "학력", tone: "success" },
  };

  const CASE_FILTER_COPY = {
    all: {
      label: "전체",
      tone: "neutral",
      caseTypes: [],
    },
    health_rhythm: {
      label: "컨디션/리듬",
      tone: "warning",
      caseTypes: [
        "health_management_watch",
        "health_project_strain",
        "condition_management_sequence",
        "daily_checkin_pattern",
      ],
    },
  };

  const PURPOSE_CARDS = [
    {
      title: "학생 분류",
      tone: "brand",
      href: "#students",
      summary: "유사한 특징을 가진 학생군을 빠르게 파악합니다.",
      current: "운영 분류, 상태 분류, 분류 사유를 학생관리에서 확인합니다.",
      next: "유사 학생 비교와 분류 근거 축적을 더 강화합니다.",
    },
    {
      title: "학생 파악",
      tone: "success",
      href: "#students",
      summary: "과정 시작부터 현재까지의 변화와 위험 신호를 봅니다.",
      current: "학생 상세에서 협업 변화, 학습 흐름 케이스, 마일스톤을 확인합니다.",
      next: "이상 신호가 발생한 날짜와 원인 데이터를 더 직접 연결합니다.",
    },
    {
      title: "과정 파악",
      tone: "mint",
      href: "#overview",
      summary: "전체 학생 성질과 과정 운영 리듬을 요약합니다.",
      current: "개요에서 분포, 기본 통계, 반복 케이스를 확인합니다.",
      next: "기수별 비교와 운영 개입 효과 분석을 추가합니다.",
    },
    {
      title: "과정 보고서",
      tone: "violet",
      href: "#process",
      summary: "모집부터 종강까지의 흐름을 시간선 보고서로 봅니다.",
      current: "학습과정에서 과정 개요와 마일스톤별 상세를 확인합니다.",
      next: "보고서 출력/PDF/요약 문장 생성을 붙입니다.",
    },
    {
      title: "학생 멘토링",
      tone: "warning",
      href: "#feedback",
      summary: "학생 개인 정보와 진로 자료를 상담/취업 지원에 활용합니다.",
      current: "피드백 메뉴에서 학생 데이터와 제출 문서를 중간다리 JSON으로 묶습니다.",
      next: "Gemini API, 문서 파서, 멘토링 메모 저장을 연결합니다.",
    },
  ];

  const TABLE_COLUMNS = [
    { key: "name", label: "학생", type: "text" },
    { key: "status", label: "상태", type: "text" },
    { key: "tag", label: "운영 분류", type: "text" },
    { key: "profile", label: "총점", type: "number" },
    { key: "initial", label: "초기", type: "number" },
    { key: "growth", label: "성장", type: "number" },
    { key: "participation", label: "참여", type: "number" },
    { key: "collaboration", label: "협업", type: "number" },
    { key: "career", label: "진로", type: "number" },
    { key: "support", label: "지원", type: "number" },
    { key: "attendanceRisk", label: "무단/위험", type: "number" },
    { key: "projectRate", label: "제출률", type: "number" },
  ];
  const SORT_OPTIONS = [...TABLE_COLUMNS, { key: "jobFit", label: "직무적합", type: "number" }];

  const initialRoute = routeFromHash();

  const state = {
    theme: App.getSavedTheme(),
    query: "",
    activePage: initialRoute.page,
    processView: initialRoute.processView,
    milestoneTab: "milestone",
    activeTag: "all",
    activeCase: "all",
    statusFilter: "all",
    regionFilter: "all",
    demographicFilterType: "all",
    demographicFilterValue: "all",
    classificationFilter: "all",
    sortKey: "name",
    sortDirection: "asc",
    feedbackStudentId: "",
    feedbackType: "self_intro",
    feedbackProvider: "gemini",
    feedbackModel: "gemini-1.5-pro",
    feedbackApiKey: "",
    feedbackFileName: "",
    feedbackFileMeta: null,
    submissionText: "",
    feedbackOutput: "",
  };

  const today = new Date();
  let overviewCharts = [];

  function routeFromHash() {
    const raw = window.location.hash.replace("#", "").trim();
    const [pagePart, detailPart] = raw.split(/[/:]/).filter(Boolean);
    const page = PAGE_IDS.includes(pagePart) ? pagePart : "overview";
    const milestoneIds = (App.rawData.milestones || []).map((milestone) => milestone.id);
    const processView = page === "process" && milestoneIds.includes(detailPart) ? detailPart : "overview";
    return { page, processView };
  }

  function processHash(view) {
    return view && view !== "overview" ? `#process/${encodeURIComponent(view)}` : "#process";
  }

  function navigateProcessView(view) {
    const nextView = view || "overview";
    const nextHash = processHash(nextView);
    if (window.location.hash === nextHash) {
      state.activePage = "process";
      state.processView = nextView;
      state.milestoneTab = "milestone";
      render();
      return;
    }
    window.location.hash = nextHash;
  }

  function escape(value) {
    return App.escapeHtml(value);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round(value, digits = 0) {
    const number = Number(value) || 0;
    return Number(number.toFixed(digits));
  }

  function formatNumber(value, digits = 0) {
    if (value === null || value === undefined || value === "") return "-";
    return new Intl.NumberFormat("ko-KR", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(Number(value) || 0);
  }

  function formatPercent(value, digits = 0) {
    return `${formatNumber(value, digits)}%`;
  }

  function firstFiniteNumber(...values) {
    for (const value of values) {
      if (value === null || value === undefined || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  }

  function score100(...values) {
    return clamp(firstFiniteNumber(...values), 0, 100);
  }

  function parseDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function daysBetween(start, end) {
    if (!start || !end) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / 86400000);
  }

  function average(items, mapper) {
    const values = items
      .map(mapper)
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map(Number)
      .filter((value) => Number.isFinite(value));
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function tagMeta(tag) {
    return TAG_COPY[tag] || TAG_COPY.steady_path;
  }

  function caseFilterMeta(caseFilter) {
    return CASE_FILTER_COPY[caseFilter] || CASE_FILTER_COPY.all;
  }

  function matchesCaseFilter(student, caseFilter) {
    const meta = caseFilterMeta(caseFilter);
    if (!meta.caseTypes.length) return true;
    const typeSet = new Set(meta.caseTypes);
    return (student.learningFlowCases || []).some((item) => typeSet.has(item.caseType));
  }

  function statusGroup(student) {
    if (App.hasDropoutRecord(student)) return "dropout";
    const status = student?.stats?.managementStatus || student?.managementStatus || App.effectiveManagementStatus(student);
    if (status === "취업") return "employed";
    return "general";
  }

  function statusMeta(status) {
    return STATUS_COPY[status] || STATUS_COPY.general;
  }

  function statusLabel(student) {
    return statusMeta(statusGroup(student)).label;
  }

  function tagPill(tag) {
    const meta = tagMeta(tag);
    return `<span class="pill ${App.toneClass(meta.tone)}">${escape(meta.label)}</span>`;
  }

  function statusPill(status) {
    const meta = statusMeta(status);
    return `<span class="pill ${App.toneClass(meta.tone)}">${escape(meta.label)}</span>`;
  }

  function activeCourseStudents() {
    return App.rawData.students.filter((student) => !App.hasDropoutRecord(student));
  }

  function milestoneSnapshot(student, milestone) {
    return student.milestones?.find((item) => item.id === milestone.id);
  }

  function milestoneStudents(milestone) {
    return App.rawData.students
      .map((student) => ({ student, snapshot: milestoneSnapshot(student, milestone) }))
      .filter((item) => item.snapshot && item.snapshot.participated !== false);
  }

  function countBy(items, mapper) {
    return items.reduce((acc, item) => {
      const key = mapper(item) || "미상";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function sortedCountRows(counts) {
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko-KR"));
  }

  function orderedCountRows(counts, order) {
    const rows = order.map((label) => ({ label, count: counts[label] || 0 }));
    Object.entries(counts).forEach(([label, count]) => {
      if (!order.includes(label)) rows.push({ label, count });
    });
    return rows;
  }

  function studentSortValue(student, key) {
    const derived = student.derived || {};
    const stats = student.stats || {};
    const primaryTag = derived.primaryTag || "steady_path";
    const values = {
      name: student.name || "",
      status: statusLabel(student),
      tag: tagMeta(primaryTag).label,
      profile: derived.totalRankScore || derived.profileRankScore || derived.profileIndex || 0,
      initial: score100(derived.initialCapabilityRankScore, derived.initialCapability?.score),
      growth: score100(derived.growthRankScore, derived.growthIndex),
      participation: score100(derived.participationRankScore, derived.participationReadiness?.score),
      support: score100(derived.supportRankScore, derived.supportIndex),
      collaboration: score100(derived.collaborationRankScore, derived.collaborationReadiness?.collaborationReadinessScore),
      career: score100(derived.careerRankScore, derived.careerReadiness?.careerReadinessScore),
      jobFit: score100(student.jobFit?.score),
      attendanceRisk: stats.attendanceRiskIssues || 0,
      projectRate: stats.projectSubmissionRate || 0,
    };
    return values[key] ?? "";
  }

  function filteredStudents() {
    const query = state.query.trim().toLowerCase();
    let students = [...App.rawData.students];

    if (state.statusFilter !== "all") {
      students = students.filter((student) => statusGroup(student) === state.statusFilter);
    }

    if (state.activeTag !== "all") {
      students = students.filter((student) => student.derived?.primaryTag === state.activeTag);
    }

    if (state.activeCase !== "all") {
      students = students.filter((student) => matchesCaseFilter(student, state.activeCase));
    }

    if (state.regionFilter !== "all") {
      students = students.filter((student) => matchesRegionFilter(student));
    }

    if (state.demographicFilterType !== "all") {
      students = students.filter((student) => matchesDemographicFilter(student));
    }

    if (state.classificationFilter !== "all") {
      students = students.filter((student) => matchesClassificationFilter(student));
    }

    if (query) {
      students = students.filter((student) => App.studentSearchPool(student).includes(query));
    }

    const column = SORT_OPTIONS.find((item) => item.key === state.sortKey) || TABLE_COLUMNS[0];
    const direction = state.sortDirection === "desc" ? -1 : 1;
    students.sort((a, b) => {
      const left = studentSortValue(a, column.key);
      const right = studentSortValue(b, column.key);
      if (column.type === "number") return ((Number(left) || 0) - (Number(right) || 0)) * direction;
      return String(left).localeCompare(String(right), "ko-KR", { numeric: true }) * direction;
    });

    return students;
  }

  function statusCounts(students = App.rawData.students) {
    return {
      all: students.length,
      general: students.filter((student) => statusGroup(student) === "general").length,
      employed: students.filter((student) => statusGroup(student) === "employed").length,
      dropout: students.filter((student) => statusGroup(student) === "dropout").length,
    };
  }

  function categoryCounts(students) {
    return CATEGORY_ORDER.map((tag) => ({
      tag,
      ...tagMeta(tag),
      count: students.filter((student) => student.derived?.primaryTag === tag).length,
    }));
  }

  function courseProgress() {
    const curriculum = App.rawData.curriculum || {};
    const start = parseDate(curriculum.startDate);
    const end = parseDate(curriculum.endDate);
    const totalDays = Math.max(1, daysBetween(start, end) + 1);
    const elapsedDays = clamp(daysBetween(start, today) + 1, 0, totalDays);
    const percent = clamp((elapsedDays / totalDays) * 100, 0, 100);
    const sessions = curriculum.sessions || [];
    const completedSessions = sessions.filter((session) => {
      const sessionDate = parseDate(session.date);
      return sessionDate && sessionDate <= today;
    }).length;
    return {
      start,
      end,
      totalDays,
      elapsedDays,
      percent,
      totalWeeks: Math.ceil(totalDays / 7),
      currentWeek: clamp(Math.ceil(elapsedDays / 7), 1, Math.ceil(totalDays / 7)),
      completedSessions,
      totalSessions: sessions.length,
    };
  }

  function ageOf(student) {
    const birthDate = parseDate(student.birthDate);
    if (!birthDate) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDelta = today.getMonth() - birthDate.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    return age;
  }

  function ageGroup(student) {
    const age = ageOf(student);
    if (!age) return "미상";
    if (age < 25) return "24세 이하";
    if (age < 30) return "25-29세";
    if (age < 35) return "30-34세";
    if (age < 40) return "35-39세";
    return "40세 이상";
  }

  function educationGroup(student) {
    const education = String(student.education || "");
    if (!education.trim()) return "미상";
    if (/고등학교|고등|공업고|상업고|디자인고|게임과학고/.test(education)) return "고등학교";
    if (/대학원|석사|박사/.test(education)) return "대학원";
    if (/재학|휴학|자퇴|중퇴/.test(education)) return "대학재학";
    return "대학졸업";
  }

  function regionDetailGroup(student) {
    const address = String(student.address || "");
    if (!address.trim()) return { group: "수도권", detail: "주소 확인 필요" };
    if (/서울|용마산로|강남|강동|금천/.test(address)) return { group: "수도권", detail: "서울" };
    if (/인천|부평|만수/.test(address)) return { group: "수도권", detail: "인천" };
    if (/경기도|경기|성남|용인|수원|고양|시흥|군포|양주|안양|오산/.test(address)) return { group: "수도권", detail: "경기" };
    if (/강원/.test(address)) return { group: "강원도", detail: "강원도" };
    if (/세종|조치원/.test(address)) return { group: "충청도", detail: "세종" };
    if (/충청북도|충북|청주/.test(address)) return { group: "충청도", detail: "충청북도" };
    if (/충청남도|충남|천안|아산|공주/.test(address)) return { group: "충청도", detail: "충청남도" };
    if (/대전/.test(address)) return { group: "충청도", detail: "대전" };
    if (/전라북도|전북|전주|군산/.test(address)) return { group: "전라도", detail: "전라북도" };
    if (/전라남도|전남|순천/.test(address)) return { group: "전라도", detail: "전라남도" };
    if (/광주광역시/.test(address)) return { group: "전라도", detail: "광주" };
    if (/대구/.test(address)) return { group: "경상도", detail: "대구" };
    if (/부산|낙동대로/.test(address)) return { group: "경상도", detail: "부산" };
    if (/울산/.test(address)) return { group: "경상도", detail: "울산" };
    if (/경상북도|경북|구미/.test(address)) return { group: "경상도", detail: "경상북도" };
    if (/경상남도|경남/.test(address)) return { group: "경상도", detail: "경상남도" };
    if (/제주/.test(address)) return { group: "제주도", detail: "제주도" };
    return { group: "수도권", detail: "주소 확인 필요" };
  }

  function regionGroup(student) {
    return regionDetailGroup(student).group;
  }

  function matchesRegionFilter(student, region = state.regionFilter) {
    return region === "all" || regionGroup(student) === region;
  }

  function regionFilterLabel(region) {
    return region === "all" ? "전체" : region;
  }

  function demographicValue(student, type) {
    if (type === "age") return ageGroup(student);
    if (type === "gender") return student.gender || "미상";
    if (type === "education") return educationGroup(student);
    return "";
  }

  function matchesDemographicFilter(student, type = state.demographicFilterType, value = state.demographicFilterValue) {
    return type === "all" || value === "all" || demographicValue(student, type) === value;
  }

  function demographicFilterMeta(type = state.demographicFilterType, value = state.demographicFilterValue) {
    if (type === "all" || value === "all") return { label: "전체", tone: "neutral" };
    const meta = DEMOGRAPHIC_FILTER_COPY[type] || DEMOGRAPHIC_FILTER_COPY.all;
    return { label: `${meta.label} · ${value}`, tone: meta.tone };
  }

  function matchesClassificationFilter(student, key = state.classificationFilter) {
    return key === "all" || Boolean(App.studentOperationalAssessmentByKey(student, key)?.qualified);
  }

  function classificationFilterMeta(key) {
    return key === "all"
      ? { label: "전체", tone: "neutral", groupLabel: "운영포커스" }
      : App.operationalClassificationMeta(key) || { label: key, tone: "neutral", groupLabel: "운영포커스" };
  }

  function regionDetailCounts(students) {
    return students.reduce((acc, student) => {
      const { group, detail } = regionDetailGroup(student);
      if (!acc[group]) acc[group] = {};
      acc[group][detail] = (acc[group][detail] || 0) + 1;
      return acc;
    }, {});
  }

  function toneColor(tone) {
    const colors = {
      success: "#2f9e6d",
      brand: "#4f7cff",
      danger: "#d65c62",
      mint: "#2db7a3",
      violet: "#8f6be8",
      warning: "#d89614",
      neutral: "#8a9099",
    };
    return colors[tone] || colors.neutral;
  }

  function donutStyle(rows) {
    const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
    let cursor = 0;
    const segments = rows
      .filter((row) => row.count > 0)
      .map((row) => {
        const start = cursor;
        const end = cursor + (row.count / total) * 360;
        cursor = end;
        return `${toneColor(row.tone)} ${start}deg ${end}deg`;
      });
    return `background: conic-gradient(${segments.join(", ")});`;
  }

  function renderMetric(label, value, copy, tone = "neutral") {
    return `
      <article class="metric-card ${App.toneClass(tone)}">
        <span class="metric-label">${escape(label)}</span>
        <strong class="metric-value">${escape(value)}</strong>
        <p class="metric-copy">${escape(copy)}</p>
      </article>
    `;
  }

  function renderCourseProgressCard() {
    const progress = courseProgress();
    return `
      <article class="course-progress-card">
        <div class="course-progress-head">
          <span>과정 진행률</span>
          <strong>${formatPercent(progress.percent)}</strong>
        </div>
        <div class="progress-rail" aria-hidden="true">
          <span style="width:${progress.percent}%"></span>
        </div>
        <div class="course-progress-meta">
          <span>${escape(App.formatDate(App.rawData.curriculum?.startDate))}</span>
          <span>${escape(App.formatDate(App.rawData.curriculum?.endDate))}</span>
        </div>
      </article>
    `;
  }

  function renderDonutCard(title, rows, centerLabel) {
    const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
    return `
      <article class="donut-card">
        <div class="donut-head">
          <h3>${escape(title)}</h3>
          <span>${escape(centerLabel)}</span>
        </div>
        <div class="donut-layout">
          <div class="distribution-donut" style="${donutStyle(rows)}">
            <span>${escape(String(total))}<small>명</small></span>
          </div>
          <div class="donut-legend">
            ${rows
              .filter((row) => row.count > 0)
              .map(
                (row) => `
                  <div class="donut-legend-row">
                    <i style="background:${toneColor(row.tone)}"></i>
                    <strong>${escape(row.label)}</strong>
                    <span>${row.count}명 · ${formatPercent((row.count / total) * 100)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </article>
    `;
  }

  function renderBarRows(rows, total) {
    return rows
      .filter((row) => row.count > 0)
      .map(
        (row) => `
          <div class="diagram-bar-row">
            <div class="diagram-bar-label">
              <strong>${escape(row.label)}</strong>
              <span>${row.count}명</span>
            </div>
            <div class="diagram-bar-track">
              <span class="${App.toneClass(row.tone)}" style="width:${Math.max(4, (row.count / Math.max(1, total)) * 100)}%"></span>
            </div>
          </div>
        `
      )
      .join("");
  }

  function renderDistributionDiagram(students) {
    const counts = statusCounts(App.rawData.students);
    const statusRows = ["general", "employed", "dropout"].map((key) => ({
      label: statusMeta(key).label,
      tone: statusMeta(key).tone,
      count: counts[key] || 0,
    }));
    const categories = categoryCounts(students);
    return `
      <section class="panel overview-diagram-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Distribution</span>
            <h2>전체 학생 분포</h2>
          </div>
        </div>
        <div class="overview-diagram-grid">
          ${renderDonutCard("상태 분포", statusRows, "전체")}
          <article class="donut-card category-bars-card">
            <div class="donut-head">
              <h3>주 운영 분류</h3>
              <span>과정 진행 학생 기준</span>
            </div>
            <div class="diagram-bar-list">
              ${renderBarRows(categories, students.length)}
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderBreakdownCard(title, rows, total) {
    return `
      <article class="breakdown-card">
        <h3>${escape(title)}</h3>
        <div class="breakdown-list">
          ${rows
            .slice(0, 5)
            .map(
              (row) => `
                <div class="breakdown-row">
                  <span>${escape(row.label)}</span>
                  <strong>${row.count}명</strong>
                  <i style="width:${Math.max(4, (row.count / Math.max(1, total)) * 100)}%"></i>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function renderDemographics(students) {
    const ageRows = sortedCountRows(countBy(students, ageGroup));
    const genderRows = sortedCountRows(countBy(students, (student) => student.gender || "미상"));
    const educationRows = orderedCountRows(countBy(students, educationGroup), ["대학원", "대학졸업", "대학재학", "고등학교"]);
    const regionRows = orderedCountRows(countBy(students, regionGroup), ["수도권", "강원도", "충청도", "전라도", "경상도", "제주도"]);
    const mainAge = ageRows[0] || { label: "미상", count: 0 };
    const mainEducation = educationRows[0] || { label: "미상", count: 0 };
    const mainRegion = regionRows[0] || { label: "미상", count: 0 };
    const careerReadyCount = students.filter((student) => (student.stats?.careerDocumentRounds || 0) > 0).length;
    return `
      <section class="panel demographics-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Cohort Snapshot</span>
            <h2>기수 통계</h2>
          </div>
          <p class="panel-copy">나이, 성별, 학력, 지역은 판단 점수가 아니라 운영 안내와 커뮤니케이션 톤을 정하기 위한 기본 맥락입니다. 각 분류를 누르면 해당 학생관리 데이터로 이동합니다.</p>
        </div>
        <div class="demographic-chart-grid">
          <article class="demographic-chart-card">
            <h3>나이대</h3>
            <div class="chart-shell"><canvas id="overview-age-chart" aria-label="나이대 분포 차트"></canvas></div>
          </article>
          <article class="demographic-chart-card">
            <h3>성별</h3>
            <div class="chart-shell"><canvas id="overview-gender-chart" aria-label="성별 분포 차트"></canvas></div>
          </article>
          <article class="demographic-chart-card wide">
            <h3>학력</h3>
            <div class="chart-shell"><canvas id="overview-education-chart" aria-label="학력 분포 차트"></canvas></div>
          </article>
          <article class="demographic-chart-card">
            <h3>지역</h3>
            <div class="chart-shell"><canvas id="overview-region-chart" aria-label="지역 분포 차트"></canvas></div>
          </article>
        </div>
        <div class="cohort-insight-list">
          <p><strong>${escape(mainAge.label)}</strong> 비중이 가장 크고, <strong>${escape(mainEducation.label)}</strong> 배경 학생이 가장 많습니다.</p>
          <p><strong>${escape(mainRegion.label)}</strong> 거주 학생이 ${mainRegion.count}명으로 운영 공지와 오프라인 일정 안내의 기본 기준이 됩니다.</p>
          <p>진로 문서 라운드가 확인된 학생은 ${careerReadyCount}명으로, 피드백 메뉴와 학생 상세의 자기표현 자료를 함께 보는 흐름이 유효합니다.</p>
        </div>
      </section>
    `;
  }

  function renderCaseLibraryOverview() {
    const rows = App.rawData.dashboard?.learningCaseLibrary || [];
    const visibleRows = rows.slice(0, 8);
    return `
      <section class="panel learning-case-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Observed Cases</span>
            <h2>현재까지 파악된 학생 특징</h2>
          </div>
          <p class="panel-copy">카드 대신 케이스 유형, 규모, 예시 학생을 한 줄로 스캔할 수 있게 정리했습니다.</p>
        </div>
        <div class="feature-list">
          ${visibleRows
            .map(
              (row) => `
                <article class="feature-row ${App.toneClass(row.severityCounts?.warning ? "warning" : row.severityCounts?.success ? "success" : "neutral")}">
                  <div class="feature-main">
                    <strong>${escape(row.label)}</strong>
                    <p>${escape(row.description)}</p>
                  </div>
                  <div class="feature-meta">
                    <span>${row.count}명</span>
                    <small>${escape((row.examples || []).slice(0, 4).map((item) => item.studentName).join(", ") || "예시 없음")}</small>
                  </div>
                </article>
              `
            )
            .join("") || `<p class="empty-state">아직 수집된 복합 케이스가 없습니다.</p>`}
        </div>
      </section>
    `;
  }

  function purposeMetric(title, students) {
    const counts = statusCounts();
    const caseCount = App.rawData.dashboard?.learningCaseLibrary?.length || 0;
    const milestoneCount = App.rawData.milestones?.length || 0;
    const metrics = {
      "학생 분류": `${CATEGORY_ORDER.length}개 분류`,
      "학생 파악": `${caseCount}개 케이스`,
      "과정 파악": `${counts.general}명 진행`,
      "과정 보고서": `${milestoneCount}개 단계`,
      "학생 멘토링": `${students.length}명 대상`,
    };
    return metrics[title] || "-";
  }

  function topNames(students, limit = 3) {
    return students
      .slice(0, limit)
      .map((student) => student.name)
      .filter(Boolean)
      .join(", ") || "대상 없음";
  }

  function studentsWithCase(students, caseTypes) {
    const typeSet = new Set(caseTypes);
    return students
      .filter((student) => (student.learningFlowCases || []).some((item) => typeSet.has(item.caseType)))
      .sort((a, b) => {
        const warningScore = (student) =>
          (student.learningFlowCases || []).filter((item) => typeSet.has(item.caseType) && item.severity === "warning").length;
        return warningScore(b) - warningScore(a) || (b.stats?.healthAttendanceIssues || 0) - (a.stats?.healthAttendanceIssues || 0) || a.name.localeCompare(b.name, "ko-KR");
      });
  }

  function rankedStudents(students, mapper) {
    return [...students].sort((a, b) => (Number(mapper(b)) || 0) - (Number(mapper(a)) || 0) || a.name.localeCompare(b.name, "ko-KR"));
  }

  function hasCaseType(student, caseTypes, severity = "") {
    const typeSet = new Set(caseTypes);
    return (student.learningFlowCases || []).some((item) => typeSet.has(item.caseType) && (!severity || item.severity === severity));
  }

  function expressionFocusScore(student) {
    const dimensions = student.derived?.expressionProfile?.dimensions || {};
    const values = ["specificity", "agency", "reflection", "career"]
      .map((key) => Number(dimensions[key]?.score || 0))
      .filter((value) => value > 0);
    if (!values.length) return 0;
    return (values.reduce((sum, value) => sum + value, 0) / values.length) * 25;
  }

  function diligenceScore(student) {
    const projectRate = Number(student.stats?.projectSubmissionRate || 0);
    const checkinRate = Number(student.derived?.collaborationReadiness?.checkinOnTimeRate || 0);
    const penalty = Math.min(
      100,
      (student.stats?.attendanceRiskIssues || 0) * 20 + (student.stats?.lateCount || 0) * 3 + (student.stats?.absenceCount || 0) * 10
    );
    return clamp(projectRate * 0.45 + checkinRate * 0.35 + (100 - penalty) * 0.2, 0, 100);
  }

  function currentCourseInfo() {
    const sessions = App.rawData.curriculum?.sessions || [];
    const todayKey = today.toISOString().slice(0, 10);
    const currentSession =
      sessions.find((session) => session.date === todayKey && session.subject && session.lessonTitle) ||
      sessions
        .filter((session) => session.date <= todayKey && session.subject && session.lessonTitle)
        .at(-1) ||
      sessions.find((session) => session.subject && session.lessonTitle) ||
      {};
    const week = (App.rawData.curriculum?.weeks || []).find((item) => dateInRange(todayKey, item.startDate, item.endDate));
    return {
      subject: currentSession.subject || "진행 교과 확인 필요",
      lessonTitle: currentSession.lessonTitle || "세부 수업 확인 필요",
      date: currentSession.date || todayKey,
      weekLabel: week?.label || "",
      weekRange: week ? App.formatRange(week.startDate, week.endDate) : "",
    };
  }

  function operationalClassification(students) {
    return App.operationalClassification(students);
  }

  function issueDateInWindow(startDate, endDate, since) {
    const start = parseDate(startDate);
    const end = parseDate(endDate || startDate);
    if (!start && !end) return false;
    const windowStart = parseDate(since);
    if (!windowStart) return false;
    return (end || start) >= windowStart && (start || end) <= today;
  }

  function recentIssueRows(students, limit = 6) {
    const since = new Date(today);
    since.setDate(since.getDate() - 30);
    const sinceKey = since.toISOString().slice(0, 10);
    return students
      .map((student) => {
        const recentAttendance = (student.attendanceEvents || []).filter((event) => event.date >= sinceKey && event.date <= today.toISOString().slice(0, 10));
        const behavioral = recentAttendance.filter((event) => event.impact === "behavioral_risk" || event.severity === "warning");
        const healthAttendance = recentAttendance.filter(
          (event) => ["health", "condition"].includes(event.category) && event.kind !== "외출"
        );
        const oversleepAttendance = recentAttendance.filter((event) => /늦잠/.test(`${event.detail || ""} ${event.reason || ""}`));
        const checkins = (student.checkins || []).filter((item) => {
          const text = `${item.workText || ""} ${item.noteText || ""}`;
          return item.date >= sinceKey && (!item.onTime || /아프|병|컨디션|힘들|불만|갈등|지연|문제/.test(text));
        });
        const recentConflict = (student.learningFlowCases || []).filter(
          (item) => item.caseType === "collaboration_conflict_signal" && item.severity === "warning" && issueDateInWindow(item.startDate, item.endDate, sinceKey)
        );
        const projectRate = Number(student.stats?.projectSubmissionRate || 0);
        const reasons = [];
        let score = 0;
        if (behavioral.length) {
          score += behavioral.length * 5;
          reasons.push(`위험 출결 ${behavioral.length}건`);
        }
        if (healthAttendance.length >= 3) {
          score += (healthAttendance.length - 2) * 3;
          reasons.push(`건강형 출결 ${healthAttendance.length}건`);
        }
        if (oversleepAttendance.length >= 2) {
          score += (oversleepAttendance.length - 1) * 4;
          reasons.push(`늦잠 출결 ${oversleepAttendance.length}건`);
        }
        if (checkins.length >= 3 && projectRate < 80) {
          score += 6;
          reasons.push(`체크인 지연 ${checkins.length}건 · 제출률 ${formatPercent(projectRate, 1)}`);
        }
        if (recentConflict.length) {
          score += recentConflict.length * 5;
          reasons.push("최근 협업 갈등 경고");
        }
        const evidence = [
          ...behavioral.slice(0, 2),
          ...healthAttendance.slice(0, 2),
          ...oversleepAttendance.slice(0, 2),
        ].map((event) => `${App.formatDate(event.date)} ${event.detail || event.kind}`);
        return { student, score, reasons: [...reasons, ...evidence], checkins };
      })
      .filter((item) => item.score >= 4)
      .sort((a, b) => b.score - a.score || a.student.name.localeCompare(b.student.name, "ko-KR"))
      .slice(0, limit);
  }

  function uniqueStudentCount(rows) {
    return new Set(rows.flatMap((row) => row.students.map((student) => student.id))).size;
  }

  function classificationRankValue(row, student) {
    return App.operationalClassificationRankValue(row, student);
  }

  function renderClassificationGroup(title, rows, tone, chartId) {
    const total = uniqueStudentCount(rows);
    return `
      <article class="classification-group-card ${App.toneClass(tone)}">
        <div class="classification-group-head">
          <div>
            <span>${escape(title)}</span>
            <h3>${total}명</h3>
          </div>
          <strong>중복 제외</strong>
        </div>
        <div class="chart-shell compact-chart">
          <canvas id="${escape(chartId)}" aria-label="${escape(title)} 세부 분류 차트"></canvas>
          <p class="chart-fallback">Chart.js를 불러오면 ${escape(title)} 차트가 표시됩니다.</p>
        </div>
        <div class="classification-row-list">
          ${rows
            .map(
              (row) => `
                <button type="button" class="classification-row ${App.toneClass(row.tone)}" data-operational-filter="${escape(row.key)}" title="${escape(`${row.groupLabel} · ${row.label} 학생관리로 보기`)}">
                  <strong>${escape(row.label)}</strong>
                  <span>${row.count}명</span>
                  <p>${escape(row.basis)}</p>
                  <small>${escape(topNames(rankedStudents(row.students, (student) => classificationRankValue(row, student)), 3))}</small>
                </button>
              `
            )
            .join("")}
        </div>
      </article>
    `;
  }

  function renderActionCard(item) {
    const attrs = item.attrs || "";
    const tagName = item.href ? "a" : "button";
    const href = item.href ? ` href="${escape(item.href)}"` : ` type="button"`;
    return `
      <${tagName} class="overview-action-card ${App.toneClass(item.tone)}" ${href} ${attrs}>
        <span>${escape(item.kicker)}</span>
        <strong>${escape(item.metric)}</strong>
        <h3>${escape(item.title)}</h3>
        <p>${escape(item.copy)}</p>
        <small>${escape(item.names)}</small>
        <em>${escape(item.action)}</em>
      </${tagName}>
    `;
  }

  function renderOverviewActionBoard(students) {
    const milestones = App.rawData.milestones || [];
    const currentId = currentMilestoneId(milestones);
    const currentIndex = Math.max(0, milestones.findIndex((milestone) => milestone.id === currentId));
    const currentMilestone = milestones[currentIndex];
    const course = currentCourseInfo();
    const classification = operationalClassification(students);
    const issueRows = recentIssueRows(students);
    return `
      <section class="panel overview-action-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Next Actions</span>
            <h2>지금 볼 운영 포커스</h2>
          </div>
          <p class="panel-copy">현재 구간과 오늘 교과를 기준으로, 우수 신호와 위험 신호를 학생 단위로 나눠 봅니다.</p>
        </div>
        <div class="operation-current-grid">
          <button type="button" class="operation-stage-card ${App.toneClass("brand")}" data-process-view="${escape(currentId || "overview")}">
            <span>현재 단계</span>
            <strong>${currentMilestone ? `M${currentIndex + 1}` : "-"}</strong>
            <h3>${escape(currentMilestone ? App.shortMilestoneLabel(currentMilestone.label) : "구간 없음")}</h3>
            <p>${escape(currentMilestone ? App.formatRange(currentMilestone.startDate, currentMilestone.endDate) : "현재 구간 정보를 확인할 수 없습니다.")}</p>
          </button>
          <article class="operation-stage-card ${App.toneClass("mint")}">
            <span>진행 교과</span>
            <strong>${escape(course.weekLabel || "Today")}</strong>
            <h3>${escape(course.subject)}</h3>
            <p>${escape(`${App.formatDate(course.date)} · ${course.lessonTitle}${course.weekRange ? ` · ${course.weekRange}` : ""}`)}</p>
          </article>
        </div>
        <div class="classification-group-grid">
          ${renderClassificationGroup("우수자", classification.excellent, "success", "overview-excellent-chart")}
          ${renderClassificationGroup("위험군", classification.risk, "danger", "overview-risk-chart")}
        </div>
        <div class="recent-issue-block">
          <div class="recent-issue-head">
            <div>
              <span>Recent 30 Days</span>
              <h3>근 1개월 긴급 이슈 요약</h3>
            </div>
            <p>단발 병원/개인 일정은 제외하고, 반복 건강 결석·조퇴, 늦잠 반복, 위험 출결, 낮은 제출률과 체크인 지연이 겹친 경우만 표시합니다.</p>
          </div>
          <div class="recent-issue-list">
            ${issueRows
              .map(
                (row) => `
                  <a class="recent-issue-row" href="${escape(App.studentPageHref(row.student.id))}">
                    <strong>${escape(row.student.name)}</strong>
                    <span>${escape(row.reasons.slice(0, 3).join(" · ") || "최근 확인 필요")}</span>
                    <em>${row.score}점</em>
                  </a>
                `
              )
              .join("") || `<p class="empty-state">최근 1개월 기준 긴급 이슈가 크게 잡히지 않았습니다.</p>`}
          </div>
        </div>
      </section>
    `;
  }

  function renderPurposeBoard(students) {
    return `
      <section class="panel purpose-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Purpose Map</span>
            <h2>운영 목적별 활용 지도</h2>
          </div>
          <p class="panel-copy">이 문서는 학생을 분류하고, 변화를 파악하고, 과정 운영과 보고, 멘토링까지 연결하는 운영 도구입니다.</p>
        </div>
        <div class="purpose-grid">
          ${PURPOSE_CARDS.map(
            (item, index) => `
              <a class="purpose-card ${App.toneClass(item.tone)}" href="${escape(item.href)}">
                <span>0${index + 1}</span>
                <strong>${escape(item.title)}</strong>
                <em>${escape(purposeMetric(item.title, students))}</em>
                <p>${escape(item.summary)}</p>
                <small><b>현재</b> ${escape(item.current)}</small>
                <small><b>다음</b> ${escape(item.next)}</small>
              </a>
            `
          ).join("")}
        </div>
      </section>
    `;
  }

  function renderOverviewPage() {
    const courseStudents = activeCourseStudents();
    const counts = statusCounts();
    return `
      <section class="overview-hero">
        ${renderCourseProgressCard()}
        <div class="hero-stats overview-stats">
          ${renderMetric("전체", `${counts.all}명`, "등록된 전체 학생", "neutral")}
          ${renderMetric("일반", `${counts.general}명`, "과정 진행 중", "success")}
          ${renderMetric("과정이탈", `${counts.dropout}명`, "분포에는 포함, 일반에서는 제외", "neutral")}
        </div>
      </section>
      ${renderOverviewActionBoard(courseStudents)}
      ${renderDemographics(courseStudents)}
      ${renderCaseLibraryOverview()}
    `;
  }

  function milestoneAggregate(milestone) {
    const rows = milestoneStudents(milestone);
    const students = rows.map((item) => item.student);
    const snapshots = rows.map((item) => item.snapshot);
    const projectRanges = projectRangesForMilestone(milestone);
    const eventCounts = snapshots.reduce(
      (acc, item) => {
        Object.entries(item.eventCounts || {}).forEach(([key, value]) => {
          acc[key] = (acc[key] || 0) + (Number(value) || 0);
        });
        return acc;
      },
      { attendance: 0, attendanceRisk: 0, counseling: 0, project: 0, career: 0, dropout: 0 }
    );
    const caseRows = students.flatMap((student) =>
      (student.learningFlowCases || [])
        .filter((item) => overlaps(item.startDate, item.endDate, milestone.startDate, milestone.endDate))
        .map((item) => ({ ...item, studentName: student.name }))
    );
    const statusRows = rows.map(({ student, snapshot }) => ({
      student,
      snapshot,
      status: milestoneStatus(student, snapshot),
    }));
    const urgentRows = buildMilestoneUrgentRows(statusRows, caseRows, milestone);
    const caseCounts = sortedCountRows(countBy(caseRows, (item) => item.label));
    const cautionCounts = sortedCountRows(countBy(snapshots.flatMap((item) => item.cautionKeys || []), (key) => PROFILE_LABELS[key] || key));
    return {
      snapshots,
      eventCounts,
      caseRows,
      statusRows,
      urgentRows,
      caseCounts,
      cautionCounts,
      projectRanges,
      participantCount: snapshots.length,
      dropoutCount: snapshots.filter((item) => item.dropoutDuringMilestone).length,
      statusCounts: sortedStatusRows(statusRows),
      avgProfile: average(snapshots, (item) => item.profileAverage),
      avgGrowth: average(snapshots, (item) => item.growthDelta),
    };
  }

  function projectRangesForMilestone(milestone) {
    return (App.rawData.projectPhaseRanges || []).filter((range) =>
      overlaps(range.startDate, range.endDate, milestone.startDate, milestone.endDate)
    );
  }

  function dateInRange(value, start, end) {
    const date = parseDate(value);
    const startDate = parseDate(start);
    const endDate = parseDate(end || start);
    if (!date || !startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  }

  function weekdayDates(start, end) {
    const startDate = parseDate(start);
    const endDate = parseDate(end || start);
    if (!startDate || !endDate) return [];
    const rows = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) rows.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  }

  function observedEndDate(end) {
    const endDate = parseDate(end);
    if (!endDate || endDate <= today) return end;
    return today.toISOString().slice(0, 10);
  }

  function observedWeekdayDates(start, end) {
    const startDate = parseDate(start);
    const endDate = parseDate(observedEndDate(end || start));
    if (!startDate || !endDate || startDate > endDate) return [];
    return weekdayDates(start, endDate.toISOString().slice(0, 10));
  }

  function dropoutDateForStudent(student) {
    return student.stats?.dropoutDate || student.dropoutDate || student.derived?.dropoutDate || "";
  }

  function activeDatesForStudent(student, dates) {
    const dropoutDate = dropoutDateForStudent(student);
    return dates.filter((date) => !dropoutDate || date <= dropoutDate);
  }

  function attendanceStatsForDates(students, dates) {
    const dateSet = new Set(dates);
    const activeDatesByStudent = new Map();
    let expectedAttendance = 0;
    students.forEach((student) => {
      const activeDates = activeDatesForStudent(student, dates);
      if (!activeDates.length) return;
      activeDatesByStudent.set(student.id, new Set(activeDates));
      expectedAttendance += activeDates.length;
    });

    const absenceKeys = new Set();
    const lateKeys = new Set();
    const riskKeys = new Set();
    students.forEach((student) => {
      const activeDateSet = activeDatesByStudent.get(student.id);
      if (!activeDateSet) return;
      (student.attendanceEvents || []).forEach((event) => {
        if (!dateSet.has(event.date) || !activeDateSet.has(event.date)) return;
        const key = `${student.id}|${event.date}|${event.kind || ""}`;
        if (event.kind === "결석") absenceKeys.add(key);
        if (event.kind === "지각") lateKeys.add(key);
        if (event.impact === "behavioral_risk" || event.severity === "warning") riskKeys.add(key);
      });
    });

    const absenceCount = absenceKeys.size;
    const lateCount = lateKeys.size;
    const riskCount = riskKeys.size;
    return {
      dateCount: dates.length,
      participantCount: activeDatesByStudent.size,
      expectedAttendance,
      absenceCount,
      lateCount,
      riskCount,
      attendanceRate: expectedAttendance ? Math.max(0, ((expectedAttendance - absenceCount) / expectedAttendance) * 100) : null,
      lateRate: expectedAttendance ? (lateCount / expectedAttendance) * 100 : null,
      riskRate: expectedAttendance ? (riskCount / expectedAttendance) * 100 : null,
    };
  }

  function bucketDates(dates, maxBuckets = 8) {
    if (!dates.length) return [];
    const bucketSize = Math.max(1, Math.ceil(dates.length / maxBuckets));
    const buckets = [];
    for (let index = 0; index < dates.length; index += bucketSize) {
      buckets.push(dates.slice(index, index + bucketSize));
    }
    return buckets;
  }

  function timelineRowsForRange(students, startDate, endDate, options = {}) {
    const dates = options.dates?.length ? options.dates : observedWeekdayDates(startDate, endDate);
    return bucketDates(dates, options.maxBuckets || 8).map((bucket) => {
      const stats = attendanceStatsForDates(students, bucket);
      const start = bucket[0];
      const end = bucket[bucket.length - 1];
      return {
        label: start === end ? App.formatDate(start) : App.formatRange(start, end),
        startDate: start,
        endDate: end,
        centerDate: bucket[Math.floor((bucket.length - 1) / 2)] || start,
        ...stats,
      };
    });
  }

  function projectOperationRows(milestone, aggregate) {
    const participants = milestoneStudents(milestone).map((item) => item.student);
    return (aggregate.projectRanges || []).map((range) => {
      const projectObservedEnd = observedEndDate(range.endDate);
      const plannedDates = (range.dates || []).filter((date) => dateInRange(date, range.startDate, projectObservedEnd));
      const projectDates = plannedDates.length ? plannedDates : observedWeekdayDates(range.startDate, range.endDate);
      const plannedDateSet = new Set(plannedDates);
      const activeDatesByStudent = new Map();
      participants.forEach((student) => {
        const activeDates = activeDatesForStudent(student, projectDates);
        if (activeDates.length) activeDatesByStudent.set(student.id, activeDates);
      });
      const projectParticipantCount = activeDatesByStudent.size;
      const expectedCheckins = plannedDates.length
        ? Array.from(activeDatesByStudent.values()).reduce((sum, dates) => sum + dates.filter((date) => plannedDateSet.has(date)).length, 0)
        : 0;
      const attendanceStats = attendanceStatsForDates(participants, projectDates);
      const checkinKeys = new Set();
      const checkinsByDate = new Map();
      const onTimeByDate = new Map();
      const lateCheckinsByDate = new Map();
      const noteSignalsByDate = new Map();
      let onTimeCount = 0;
      const retroStudents = new Set();
      let retroCount = 0;
      let positiveRetro = 0;
      let concernRetro = 0;

      participants.forEach((student) => {
        const activeDateSet = new Set(activeDatesByStudent.get(student.id) || []);
        (student.checkins || [])
          .filter((item) => item.phase === range.phase && activeDateSet.has(item.date))
          .forEach((item) => {
            const key = `${student.id}|${item.date}`;
            if (checkinKeys.has(key)) return;
            checkinKeys.add(key);
            if (!checkinsByDate.has(item.date)) checkinsByDate.set(item.date, new Set());
            checkinsByDate.get(item.date).add(student.id);
            if (item.onTime) {
              onTimeCount += 1;
              if (!onTimeByDate.has(item.date)) onTimeByDate.set(item.date, new Set());
              onTimeByDate.get(item.date).add(student.id);
            } else {
              if (!lateCheckinsByDate.has(item.date)) lateCheckinsByDate.set(item.date, new Set());
              lateCheckinsByDate.get(item.date).add(student.id);
            }
            const checkinText = [item.workText, item.noteText].filter(Boolean).join(" ");
            if (/갈등|불만|어려|스트레스|지연|문제|미흡|부족|불안|조율/.test(checkinText)) {
              noteSignalsByDate.set(item.date, (noteSignalsByDate.get(item.date) || 0) + 1);
            }
          });

        (student.retrospectives || [])
          .filter((item) => item.phase === range.phase && activeDateSet.has(item.date))
          .forEach((item) => {
            const text = [item.detail, item.summary, item.note, item.content].filter(Boolean).join(" ");
            retroStudents.add(student.id);
            retroCount += 1;
            if (/만족|좋|재미|성장|해결|완성|도움|긍정/.test(text)) positiveRetro += 1;
            if (/어려|힘들|부족|아쉽|불안|갈등|지연|미흡|문제/.test(text)) concernRetro += 1;
          });
      });

      const timelineRows = projectDates.map((date) => {
        const dayStats = attendanceStatsForDates(participants, [date]);
        const checkinCount = checkinsByDate.get(date)?.size || 0;
        const onTimeDayCount = onTimeByDate.get(date)?.size || 0;
        const lateCheckinCount = lateCheckinsByDate.get(date)?.size || 0;
        return {
          label: App.formatDate(date),
          startDate: date,
          endDate: date,
          centerDate: date,
          ...dayStats,
          checkinCount,
          checkinRate: plannedDateSet.has(date) && dayStats.participantCount ? (checkinCount / dayStats.participantCount) * 100 : null,
          onTimeRate: checkinCount ? (onTimeDayCount / checkinCount) * 100 : null,
          lateCheckinCount,
          noteSignalCount: noteSignalsByDate.get(date) || 0,
        };
      });

      const row = {
        phase: range.phase,
        startDate: range.startDate,
        endDate: range.endDate,
        isEstimated: Boolean(range.isEstimated),
        plannedDayCount: plannedDates.length,
        scheduleDayCount: projectDates.length,
        participantCount: projectParticipantCount,
        checkinCount: checkinKeys.size,
        checkinRate: expectedCheckins ? (checkinKeys.size / expectedCheckins) * 100 : null,
        onTimeRate: checkinKeys.size ? (onTimeCount / checkinKeys.size) * 100 : null,
        attendanceRate: attendanceStats.attendanceRate,
        lateRate: attendanceStats.lateRate,
        riskRate: attendanceStats.riskRate,
        absenceCount: attendanceStats.absenceCount,
        lateCount: attendanceStats.lateCount,
        riskAttendanceCount: attendanceStats.riskCount,
        retroCount,
        retroRate: projectParticipantCount ? (retroStudents.size / projectParticipantCount) * 100 : null,
        positiveRetro,
        concernRetro,
        timelineRows,
      };
      return { ...row, specialNotes: projectSpecialNotes(row) };
    });
  }

  function projectSpecialNotes(row) {
    const notes = [];
    const lowCheckinDays = row.timelineRows.filter((item) => item.checkinRate !== null && item.checkinRate < 85);
    const attendanceIssueDays = row.timelineRows.filter((item) => item.lateCount || item.absenceCount || item.riskCount);
    const noteSignalDays = row.timelineRows.filter((item) => item.noteSignalCount);
    if (lowCheckinDays.length) {
      notes.push({
        label: "체크인 공백",
        detail: `${lowCheckinDays.slice(0, 3).map((item) => `${item.label} ${formatPercent(item.checkinRate, 1)}`).join(" · ")} 구간은 제출률 확인이 필요합니다.`,
      });
    }
    if (attendanceIssueDays.length) {
      notes.push({
        label: "출결 신호",
        detail: `${attendanceIssueDays.slice(0, 3).map((item) => `${item.label} 지각 ${item.lateCount}건/결석 ${item.absenceCount}건`).join(" · ")}이 잡혔습니다.`,
      });
    }
    if (noteSignalDays.length) {
      notes.push({
        label: "팀 운영 메모",
        detail: `${noteSignalDays.slice(0, 3).map((item) => `${item.label} ${item.noteSignalCount}건`).join(" · ")}에서 갈등, 조율, 지연 관련 언급이 있습니다.`,
      });
    }
    if (row.retroCount) {
      notes.push({
        label: "회고 분위기",
        detail: `회고 ${row.retroCount}건 중 긍정 신호 ${row.positiveRetro}건, 우려 신호 ${row.concernRetro}건으로 정리됩니다.`,
      });
    }
    if (!notes.length) {
      notes.push({
        label: "특이 신호 없음",
        detail: "제출, 출결, 회고에서 즉시 분리해서 볼 특이 신호가 크지 않습니다.",
      });
    }
    return notes.slice(0, 4);
  }

  function milestoneAttendanceStats(milestone) {
    const students = milestoneStudents(milestone).map((item) => item.student);
    return attendanceStatsForDates(students, observedWeekdayDates(milestone.startDate, milestone.endDate));
  }

  function milestoneTimelineRows(milestone) {
    const students = milestoneStudents(milestone).map((item) => item.student);
    return timelineRowsForRange(students, milestone.startDate, milestone.endDate, { maxBuckets: 9 });
  }

  function milestoneStatus(student, snapshot) {
    if (snapshot.dropoutDuringMilestone) return "이탈";
    const eventCounts = snapshot.eventCounts || {};
    const hasWarningEvent = (snapshot.events || []).some((event) => event.severity === "warning");
    if (hasWarningEvent || (eventCounts.attendanceRisk || 0) >= 2 || (snapshot.id !== "m1" && (snapshot.profileAverage || 4) <= 2)) return "경고";
    if ((snapshot.cautionKeys || []).length || (eventCounts.attendanceRisk || 0) >= 1 || (eventCounts.counseling || 0) >= 1) return "주의";
    if (student.stats?.currentStatus === "경고" && snapshot.id === student.milestones?.at(-1)?.id) return "경고";
    return "안정";
  }

  function sortedStatusRows(statusRows) {
    const order = ["안정", "주의", "경고", "이탈"];
    const counts = countBy(statusRows, (item) => item.status);
    return order.map((label) => ({ label, count: counts[label] || 0 })).filter((row) => row.count > 0);
  }

  function buildMilestoneUrgentRows(statusRows, caseRows, milestone) {
    const caseMap = new Map();
    caseRows.forEach((item) => {
      if (!caseMap.has(item.studentName)) caseMap.set(item.studentName, []);
      caseMap.get(item.studentName).push(item);
    });
    return statusRows
      .map(({ student, snapshot, status }) => {
        const eventCounts = snapshot.eventCounts || {};
        const cases = caseMap.get(student.name) || [];
        const cautionLabels = (snapshot.cautionKeys || []).map((key) => PROFILE_LABELS[key] || key);
        const riskScore =
          (status === "이탈" ? 100 : 0) +
          (status === "경고" ? 80 : 0) +
          (status === "주의" ? 35 : 0) +
          (eventCounts.attendanceRisk || 0) * 16 +
          (eventCounts.counseling || 0) * 8 +
          Math.max(0, 2.4 - (snapshot.profileAverage || 4)) * 25 +
          cases.filter((item) => item.severity === "warning").length * 18;
        const reasons = [];
        if (snapshot.dropoutDuringMilestone) reasons.push(`이탈 ${App.formatDate(snapshot.dropoutDate)}`);
        if (eventCounts.attendanceRisk) reasons.push(`위험출결 ${eventCounts.attendanceRisk}건`);
        if (eventCounts.counseling) reasons.push(`상담 ${eventCounts.counseling}건`);
        if ((snapshot.profileAverage || 4) <= 2.4) reasons.push(`프로파일 ${formatNumber(snapshot.profileAverage, 2)}`);
        if (cautionLabels.length) reasons.push(`관찰 ${cautionLabels.slice(0, 2).join(", ")}`);
        if (cases.length) reasons.push(cases[0].label);
        const hasWarningCase = cases.some((item) => item.severity === "warning");
        const isUrgent =
          status === "이탈" ||
          status === "경고" ||
          (eventCounts.attendanceRisk || 0) >= 2 ||
          (snapshot.id !== "m1" && (snapshot.profileAverage || 4) <= 2.2) ||
          hasWarningCase;
        return {
          student,
          snapshot,
          status,
          riskScore,
          cases,
          reasons,
          isUrgent,
          milestoneLabel: App.shortMilestoneLabel(milestone.label),
        };
      })
      .filter((item) => item.isUrgent)
      .sort((a, b) => b.riskScore - a.riskScore || (a.student.name || "").localeCompare(b.student.name || "", "ko-KR"))
      .slice(0, 12);
  }

  function overlaps(startA, endA, startB, endB) {
    const aStart = parseDate(startA);
    const aEnd = parseDate(endA || startA);
    const bStart = parseDate(startB);
    const bEnd = parseDate(endB || startB);
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    return aStart <= bEnd && aEnd >= bStart;
  }

  function isCurrentMilestone(milestone) {
    const start = parseDate(milestone.startDate);
    const end = parseDate(milestone.endDate);
    return start && end && today >= start && today <= end;
  }

  function currentMilestoneId(milestones = App.rawData.milestones || []) {
    const current = milestones.find(isCurrentMilestone);
    if (current) return current.id;
    const past = milestones
      .filter((milestone) => {
        const end = parseDate(milestone.endDate);
        return end && end <= today;
      })
      .at(-1);
    return past?.id || milestones[0]?.id || "";
  }

  function processRows(milestones = App.rawData.milestones || []) {
    return milestones.map((milestone, index) => ({
      milestone,
      index,
      aggregate: milestoneAggregate(milestone),
      isCurrent: isCurrentMilestone(milestone),
    }));
  }

  function observedProcessRows(milestones = App.rawData.milestones || []) {
    return processRows(milestones).filter((row) => {
      const start = parseDate(row.milestone.startDate);
      return start && start <= today;
    });
  }

  function milestoneObservedAttendanceStats(milestone) {
    const students = milestoneStudents(milestone).map((item) => item.student);
    return attendanceStatsForDates(students, observedWeekdayDates(milestone.startDate, milestone.endDate));
  }

  function profileScoreAverages(snapshots) {
    return App.PROFILE_KEYS.map((key) => ({
      key,
      label: PROFILE_LABELS[key] || App.PROFILE_LABELS[key] || key,
      value: average(snapshots, (snapshot) => snapshot.scores?.[key]),
    }));
  }

  function milestoneCurriculumSummary(milestone) {
    const observedEnd = observedEndDate(milestone.endDate);
    const sessions = (App.rawData.curriculum?.sessions || []).filter((session) => {
      if (!dateInRange(session.date, milestone.startDate, observedEnd)) return false;
      return Boolean(session.subject && session.lessonTitle);
    });
    const subjects = [...new Set(sessions.map((session) => session.subject).filter(Boolean))];
    const lessonSamples = sessions
      .map((session) => session.lessonTitle)
      .filter(Boolean)
      .slice(0, 5);
    return {
      observedEnd,
      sessions,
      subjects,
      lessonSamples,
      subjectText: subjects.slice(0, 5).join(", ") || "커리큘럼 수업 전/모집 자료 중심",
      lessonText: lessonSamples.join(" · ") || "모집 서류, 면접, 개인정보, 사전 경력 자료",
    };
  }

  function milestoneAnalysisPurpose(milestone, index, aggregate) {
    const curriculum = milestoneCurriculumSummary(milestone);
    const range = App.formatRange(milestone.startDate, curriculum.observedEnd);
    const projectNames = (aggregate.projectRanges || []).map((rangeItem) => rangeItem.phase).filter(Boolean);
    const common = {
      period: range,
      curriculum,
      projectText: projectNames.join(", "),
    };
    if (index === 0) {
      return {
        ...common,
        label: "초기 진단",
        title: "초기 스펙과 모집 서류 신뢰도 분석",
        short: "과정에 어떤 학생들이 들어왔는지, 개인정보·학력·거주지·지원서·면접 서술을 기준으로 초기 지원 필요도를 정합니다.",
        purpose:
          "모집 단계에서는 학생들의 초기 스펙 통계가 핵심입니다. 학력, 전공, 거주지, 경력, 희망 직무, 지원 동기, 자기소개와 면접 기록을 함께 읽어 과정에 들어온 학생 집단의 출발선을 정의합니다.",
        questions: [
          "어떤 배경과 목표를 가진 학생들이 입과했는가",
          "모집 서류의 문장 깊이와 실제 준비도는 어느 정도 일치하는가",
          "지병, 건강 제약, 경제적 어려움, 장거리 통학 등 초기에 배려해야 할 우려사항은 무엇인가",
        ],
        cautions: [
          "지원서와 자기소개는 학생의 주관적 서술이므로 사실로 단정하지 않고 신뢰도와 구체성의 정도를 나눠 봅니다.",
          "건강·경제 어려움은 낙인이 아니라 운영 지원 필요도를 가늠하는 참고 신호로만 사용합니다.",
        ],
      };
    }
    if (index === 1) {
      return {
        ...common,
        label: "초기 적응",
        title: "개강 적응과 1차 실습 수행 기반 분석",
        short: "기초 직무 이해와 첫 프로젝트 리듬을 통해 출석, 제출, 역할 이해, 협업 출발선을 확인합니다.",
        purpose:
          "개강 후 첫 실습 구간은 학생이 실제 수업 환경에 적응하는지 보는 단계입니다. 기획 직무 이해, 게임 컨셉, 시스템, BM, 생성형 AI, 스토리텔링, 업무관리, 레벨 디자인 등 초반 커리큘럼을 따라가며 자기조절과 참여 지속성을 확인합니다.",
        questions: [
          "수업 리듬, 출석, 데일리 체크인, 과제 제출이 안정적으로 자리 잡았는가",
          "첫 프로젝트에서 역할 이해와 협업 태도가 실제 기록으로 확인되는가",
          "모집 서류에서 보인 강점과 실제 수업 수행이 이어지는가",
        ],
        cautions: [
          "초기 부진은 역량 부족으로 단정하지 않고 낯선 환경 적응, 통학, 건강, 생활 리듬과 분리해 봅니다.",
          "첫 프로젝트 평가는 결과물보다 역할 수행 과정과 회고의 구체성을 더 중요하게 봅니다.",
        ],
      };
    }
    if (index === 2) {
      return {
        ...common,
        label: "실습 심화",
        title: "2차 실습에서 기획 사고와 제작 리듬 분석",
        short: "심화 수업과 반복 프로젝트 기록을 통해 아이디어를 구조화하고 실행으로 옮기는 힘을 봅니다.",
        purpose:
          "두 번째 실습 단계에서는 학생이 기초 이해를 넘어 게임 기획 관점으로 문제를 구조화하는지 확인합니다. 해당 기간의 수업 주제와 프로젝트 체크인을 연결해 기획 의도, 시스템 사고, 일정 관리, 회고 품질을 함께 분석합니다.",
        questions: [
          "수업 개념이 프로젝트 기획 문장과 회고에 반영되는가",
          "반복된 데일리 체크인에서 일정 관리와 자기 수정이 보이는가",
          "협업 갈등이나 역할 불균형이 프로젝트 진행에 영향을 주는가",
        ],
        cautions: [
          "작성한 작업 내용은 자기보고 성격이 있으므로 제출 시점, 회고, 동료 언급과 교차 확인합니다.",
          "표현이 많은 학생과 조용한 학생을 같은 방식으로 평가하지 않고 근거의 구체성을 중심으로 봅니다.",
        ],
      };
    }
    if (index === 3) {
      return {
        ...common,
        label: "팀 운영",
        title: "3차 실습의 협업·일정·위험 신호 분석",
        short: "팀 프로젝트의 중반부에서 협업 방식, 갈등, 지연, 위험출결이 학습 성과에 미치는 영향을 봅니다.",
        purpose:
          "세 번째 실습 구간은 프로젝트 운영 신호가 가장 많이 드러나는 단계입니다. 수업 커리큘럼과 프로젝트 기록을 연결해 역할 수행, 협업 조율, 일정 지연, 건강·컨디션 리듬, 상담 필요도를 함께 분석합니다.",
        questions: [
          "팀 안에서 맡은 역할을 이해하고 끝까지 수행하는가",
          "지각, 체크인 지연, 회고 공백이 프로젝트 리스크로 이어지는가",
          "불만, 갈등, 소통 문제를 조정할 수 있는 수준인가",
        ],
        cautions: [
          "갈등 신호는 한쪽 진술만으로 판단하지 않고 반복성, 다른 기록과의 일치도, 프로젝트 맥락을 함께 봅니다.",
          "건강 이슈는 불성실과 분리하되, 일정 영향이 반복되는 경우 별도 지원 대상으로 표시합니다.",
        ],
      };
    }
    if (index === 4) {
      return {
        ...common,
        label: "현재 운영",
        title: "4차 실습의 현재 역량과 개입 우선순위 분석",
        short: "현재 진행 구간의 수업·프로젝트·출결·상담 기록을 묶어 즉시 개입할 학생과 우수 신호를 구분합니다.",
        purpose:
          "현재 실습 구간은 지금 운영 판단에 직접 연결됩니다. 진행 중인 커리큘럼과 프로젝트 체크인, 출결, 회고, 상담 기록을 종합해 우수자와 위험군, 긴급 확인 인원을 분리합니다.",
        questions: [
          "현재 수업 내용과 프로젝트 수행이 게임 기획자로서의 깊이로 이어지는가",
          "지금 개입해야 할 건강, 불성실, 협업 위험 신호는 무엇인가",
          "총점, 성장가능성, 과정참여도, 협업, 진로역량이 높은 학생을 어떤 근거로 구분할 수 있는가",
        ],
        cautions: [
          "현재 구간은 데이터가 계속 쌓이는 중이므로 단일 사건보다 최근 1개월 반복성과 영향도를 우선합니다.",
          "작업물 자기보고보다 체크인 한마디, 회고, 상담, 출결처럼 시간 흐름이 남는 기록을 더 신뢰합니다.",
        ],
      };
    }
    return {
      ...common,
      label: "마무리/전환",
      title: "후반 구간의 완성도와 진로 전환 준비 분석",
      short: "후반 수업과 프로젝트 완성도를 통해 포트폴리오, 취업 문서, 진로 방향의 준비도를 확인합니다.",
      purpose:
        "후반 마일스톤은 수업 성과를 취업과 포트폴리오로 전환할 수 있는지 보는 단계입니다. 커리큘럼 이수, 프로젝트 완성도, 진로 문서, 피드백 반영, 협업 평판을 연결해 수료 이후 지원 방향을 정합니다.",
      questions: [
        "프로젝트 결과와 문서가 직무 역량 설명으로 전환되는가",
        "피드백을 반영해 포트폴리오와 자기소개가 개선되는가",
        "수료 전까지 집중 보완해야 할 역량과 위험 신호는 무엇인가",
      ],
      cautions: [
        "완성 결과만 보지 않고 과정 중 수정, 피드백 수용, 역할 지속성을 함께 봅니다.",
        "취업 의지 서술은 실제 문서 개선과 지원 행동으로 교차 확인합니다.",
      ],
    };
  }

  function renderProcessSubnav(milestones) {
    return `
      <nav class="process-subnav" aria-label="학습과정 내부 메뉴">
        <button type="button" class="${state.processView === "overview" ? "is-active" : ""}" data-process-view="overview">
          과정 개요
        </button>
        ${milestones
          .map(
            (milestone, index) => `
              <button type="button" class="${state.processView === milestone.id ? "is-active" : ""} ${isCurrentMilestone(milestone) ? "is-current" : ""}" data-process-view="${escape(milestone.id)}">
                M${index + 1}
              </button>
            `
          )
          .join("")}
      </nav>
    `;
  }

  function renderProcessOverviewGraph(rows) {
    const currentId = currentMilestoneId(rows.map((row) => row.milestone));
    return `
      <section class="panel process-overview-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Process Overview</span>
            <h2>모집부터 현재까지의 과정 흐름</h2>
          </div>
          <p class="panel-copy">전체 학생의 모집 단계부터 현재까지 관측된 마일스톤을 기준으로 봅니다. 그래프에 마우스를 올리면 평균 프로파일을 구성한 세부 점수와 출결 지표가 함께 표시됩니다.</p>
        </div>
        <div class="chart-shell process-chart-shell">
          <canvas id="process-overview-chart" aria-label="과정 개요 프로파일 및 출결 차트"></canvas>
          <p class="chart-fallback">Chart.js를 불러오면 과정 개요 차트가 표시됩니다.</p>
        </div>
        <div class="process-overview-summary-grid">
          ${rows
            .map(
              (row) => `
                <button type="button" class="process-summary-card ${row.milestone.id === currentId ? "is-current" : ""}" data-process-view="${escape(row.milestone.id)}">
                  <span>M${row.index + 1}</span>
                  <strong>${escape(App.shortMilestoneLabel(row.milestone.label))}</strong>
                  <small>${escape(App.formatRange(row.milestone.startDate, observedEndDate(row.milestone.endDate)))}</small>
                  <em>평균 ${formatNumber(row.aggregate.avgProfile, 2)}</em>
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderProcessOverview() {
    const milestones = App.rawData.milestones || [];
    const allRows = processRows(milestones);
    const rows = observedProcessRows(milestones);
    const currentId = currentMilestoneId(milestones);
    const currentRow = allRows.find((row) => row.milestone.id === currentId) || rows.at(-1) || allRows[0];
    const todayKey = today.toISOString().slice(0, 10);
    const courseEnd = parseDate(App.rawData.curriculum?.endDate) && parseDate(App.rawData.curriculum?.endDate) < today ? App.rawData.curriculum.endDate : todayKey;
    const courseAttendance = attendanceStatsForDates(App.rawData.students, weekdayDates(App.rawData.curriculum?.startDate, courseEnd));
    const observedSnapshots = rows.flatMap((row) => row.aggregate.snapshots);
    const avgProfile = average(observedSnapshots, (snapshot) => snapshot.profileAverage);
    const totalEvents = rows.reduce(
      (acc, row) => {
        Object.entries(row.aggregate.eventCounts || {}).forEach(([key, value]) => {
          acc[key] = (acc[key] || 0) + (Number(value) || 0);
        });
        return acc;
      },
      { project: 0, counseling: 0, attendanceRisk: 0, career: 0, dropout: 0 }
    );
    const urgentStudentCount = new Set(rows.flatMap((row) => (row.aggregate.urgentRows || []).map((item) => item.student.id))).size;
    return `
      <section class="process-overview-hero">
        ${renderMetric("전체 학생", `${App.rawData.students.length}명`, "모집단계부터 현재까지", "neutral")}
        ${renderMetric("관측 구간", `${rows.length}개`, rows.length ? `M1-M${rows.at(-1).index + 1}` : "진행 전", "brand")}
        ${renderMetric("현재 구간", currentRow ? `M${currentRow.index + 1}` : "-", currentRow ? App.shortMilestoneLabel(currentRow.milestone.label) : "현재 구간 없음", "success")}
        ${renderMetric("평균 프로파일", formatNumber(avgProfile, 2), "전체 관측 스냅샷 기준", "mint")}
        ${renderMetric("출석률", courseAttendance.attendanceRate === null ? "판단 전" : formatPercent(courseAttendance.attendanceRate, 1), `${App.formatRange(App.rawData.curriculum?.startDate, courseEnd)}`, "success")}
        ${renderMetric("지각률", courseAttendance.lateRate === null ? "판단 전" : formatPercent(courseAttendance.lateRate, 1), `위험출결 ${totalEvents.attendanceRisk || 0}건`, "warning")}
        ${renderMetric("핵심 이슈", `${urgentStudentCount}명`, `상담 ${totalEvents.counseling || 0}건 · 이탈 ${totalEvents.dropout || 0}명`, "danger")}
      </section>
      ${renderProcessOverviewGraph(rows)}
      ${renderProcessMilestoneBriefs(rows)}
    `;
  }

  function renderProcessStage(milestone, index) {
    const aggregate = milestoneAggregate(milestone);
    const eventCounts = aggregate.eventCounts;
    const attendanceStats = milestoneAttendanceStats(milestone);
    const current = isCurrentMilestone(milestone);
    return `
      <article class="process-stage-card ${current ? "is-current" : ""}">
        <div class="process-stage-index">${index + 1}</div>
        <div class="process-stage-main">
          <div class="process-stage-head">
            <div>
              <span>${escape(App.formatRange(milestone.startDate, milestone.endDate))}${milestone.isEstimated ? " · 예정" : ""}</span>
              <h3>M${index + 1}</h3>
            </div>
            ${current ? `<strong class="current-badge">현재 구간</strong>` : ""}
          </div>
          <div class="process-stage-stats">
            <span>평균 프로필 ${formatNumber(aggregate.avgProfile, 2)}</span>
            <span>성장 변화 ${aggregate.avgGrowth >= 0 ? "+" : ""}${formatNumber(aggregate.avgGrowth, 2)}</span>
            <span>출석률 ${attendanceStats.attendanceRate === null ? "판단 전" : formatPercent(attendanceStats.attendanceRate, 1)}</span>
            <span>지각률 ${attendanceStats.lateRate === null ? "판단 전" : formatPercent(attendanceStats.lateRate, 1)}</span>
            <span>상담 ${eventCounts.counseling || 0}건</span>
            <span>위험출결 ${eventCounts.attendanceRisk || 0}건</span>
            <span>참여 ${aggregate.participantCount || 0}명</span>
            ${aggregate.dropoutCount ? `<span>이탈 ${aggregate.dropoutCount}명</span>` : ""}
          </div>
          <div class="process-stage-notes">
            <div>
              <strong>주요 특이사항</strong>
              <p>${
                aggregate.caseCounts.length
                  ? escape(aggregate.caseCounts.slice(0, 3).map((row) => `${row.label} ${row.count}명`).join(" · "))
                  : "해당 구간에서 반복 케이스가 뚜렷하게 누적되지 않았습니다."
              }</p>
            </div>
            <div>
              <strong>관찰 영역</strong>
              <p>${
                aggregate.cautionCounts.length
                  ? escape(aggregate.cautionCounts.slice(0, 3).map((row) => `${row.label} ${row.count}명`).join(" · "))
                  : "큰 주의 영역 없음"
              }</p>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderEventCountBars(eventCounts) {
    const rows = [
      { key: "counseling", label: "상담", tone: "violet" },
      { key: "attendanceRisk", label: "위험출결", tone: "danger" },
      { key: "career", label: "진로", tone: "mint" },
      { key: "dropout", label: "구간 이탈", tone: "neutral" },
    ].map((item) => ({ ...item, count: Number(eventCounts[item.key] || 0) }));
    const max = Math.max(1, ...rows.map((row) => row.count));
    return `
      <div class="milestone-event-bars">
        ${rows
          .map(
            (row) => `
              <div class="milestone-event-row">
                <span>${escape(row.label)}</span>
                <div class="diagram-bar-track">
                  <i class="${App.toneClass(row.tone)}" style="width:${Math.max(4, (row.count / max) * 100)}%"></i>
                </div>
                <strong>${row.count}건</strong>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderCountList(rows, emptyText) {
    if (!rows.length) return `<p class="empty-state compact">${escape(emptyText)}</p>`;
    return `
      <div class="milestone-count-list">
        ${rows
          .slice(0, 6)
          .map(
            (row) => `
              <div>
                <span>${escape(row.label)}</span>
                <strong>${row.count}명</strong>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderInlineCountRows(rows, emptyText) {
    if (!rows.length) return `<p class="empty-state compact">${escape(emptyText)}</p>`;
    return rows
      .slice(0, 5)
      .map((row) => `<span>${escape(row.label)} <strong>${row.count}명</strong></span>`)
      .join("");
  }

  function renderMilestoneTopSummary(aggregate) {
    const warningCount = aggregate.statusCounts.find((row) => row.label === "경고")?.count || 0;
    const cautionCount = aggregate.statusCounts.find((row) => row.label === "주의")?.count || 0;
    return `
      <div class="milestone-top-summary">
        <article>
          <span>구간 총원</span>
          <strong>${aggregate.participantCount || 0}명</strong>
          <div class="milestone-inline-counts">
            ${renderInlineCountRows(aggregate.statusCounts, "상태 집계 없음")}
          </div>
        </article>
        <article>
          <span>관리 신호</span>
          <strong>${warningCount + cautionCount + (aggregate.dropoutCount || 0)}명</strong>
          <div class="milestone-inline-counts">
            ${renderInlineCountRows(
              [
                { label: "주의", count: cautionCount },
                { label: "경고", count: warningCount },
                { label: "이탈", count: aggregate.dropoutCount || 0 },
              ].filter((row) => row.count > 0),
              "집중 관리 신호 없음"
            )}
          </div>
        </article>
        <article>
          <span>관찰영역</span>
          <div class="milestone-inline-counts">
            ${renderInlineCountRows(aggregate.cautionCounts, "큰 주의 영역 없음")}
          </div>
        </article>
        <article>
          <span>특이사항</span>
          <div class="milestone-inline-counts">
            ${renderInlineCountRows(aggregate.caseCounts, "반복 특이사항 없음")}
          </div>
        </article>
      </div>
    `;
  }

  function renderRateTimelineGraph(rows, metrics, options = {}) {
    if (!rows.length) return `<p class="empty-state compact">${escape(options.emptyText || "표시할 타임라인 데이터가 없습니다.")}</p>`;
    const width = 940;
    const left = 110;
    const right = 36;
    const top = 30;
    const rowHeight = 72;
    const plotHeight = 42;
    const height = top + metrics.length * rowHeight + 44;
    const dates = rows.flatMap((row) => [parseDate(row.startDate), parseDate(row.endDate), parseDate(row.centerDate)]).filter(Boolean);
    const minTime = Math.min(...dates.map((date) => date.getTime()));
    const maxTime = Math.max(...dates.map((date) => date.getTime()));
    const xForDate = (value) => {
      const date = parseDate(value);
      if (!date || minTime === maxTime) return left + (width - left - right) / 2;
      return left + ((date.getTime() - minTime) / (maxTime - minTime)) * (width - left - right);
    };
    const tickRows =
      rows.length <= 6
        ? rows
        : rows.filter((_, index) => index === 0 || index === rows.length - 1 || index === Math.floor(rows.length / 2));
    return `
      <div class="rate-timeline-wrap">
        <svg class="rate-timeline-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(options.label || "운영 비율 타임라인")}">
          <line class="rate-timeline-axis" x1="${left}" y1="${height - 30}" x2="${width - right}" y2="${height - 30}"></line>
          ${tickRows
            .map((row) => {
              const x = xForDate(row.centerDate);
              return `
                <line class="rate-timeline-tick" x1="${x}" y1="${height - 35}" x2="${x}" y2="${height - 24}"></line>
                <text class="rate-timeline-date" x="${x}" y="${height - 9}">${escape(App.formatDate(row.centerDate))}</text>
              `;
            })
            .join("")}
          ${metrics
            .map((metric, index) => {
              const laneY = top + index * rowHeight;
              const baseY = laneY + plotHeight;
              const points = rows
                .map((row) => {
                  const value = Number(row[metric.key]);
                  if (!Number.isFinite(value)) return null;
                  const clamped = clamp(value, 0, 100);
                  return {
                    row,
                    value,
                    x: xForDate(row.centerDate),
                    y: laneY + (1 - clamped / 100) * plotHeight,
                  };
                })
                .filter(Boolean);
              const linePath = points.map((point, pointIndex) => `${pointIndex ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
              return `
                <g class="rate-timeline-metric is-${escape(metric.tone || "brand")}">
                  <text class="rate-timeline-label" x="18" y="${laneY + 18}">${escape(metric.label)}</text>
                  <text class="rate-timeline-hint" x="18" y="${laneY + 36}">${escape(metric.hint || "")}</text>
                  <line class="rate-timeline-lane" x1="${left}" y1="${baseY}" x2="${width - right}" y2="${baseY}"></line>
                  ${linePath ? `<path class="rate-timeline-line" d="${linePath}"></path>` : ""}
                  ${points
                    .map(
                      (point) => `
                        <g class="rate-timeline-point">
                          <circle cx="${point.x}" cy="${point.y}" r="5"></circle>
                          <text x="${point.x}" y="${point.y - 9}">${escape(formatPercent(point.value, 1))}</text>
                          <title>${escape(`${point.row.label} · ${metric.label} ${formatPercent(point.value, 1)}`)}</title>
                        </g>
                      `
                    )
                    .join("")}
                </g>
              `;
            })
            .join("")}
        </svg>
      </div>
    `;
  }

  function renderMilestoneRateTimeline(milestone, aggregate) {
    const rows = milestoneTimelineRows(milestone);
    const stats = milestoneAttendanceStats(milestone);
    return `
      <section class="panel milestone-rate-timeline-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Ratio Timeline</span>
            <h2>운영 비율 타임라인</h2>
          </div>
          <p class="panel-copy">마일스톤 기간을 가로 시간선으로 놓고 출석률, 지각률, 위험출결률을 구간별 비율로 봅니다.</p>
        </div>
        <div class="milestone-rate-summary">
          ${renderMetric("출석률", stats.attendanceRate === null ? "판단 전" : formatPercent(stats.attendanceRate, 1), `결석 ${stats.absenceCount}건`, "success")}
          ${renderMetric("지각률", stats.lateRate === null ? "판단 전" : formatPercent(stats.lateRate, 1), `지각 ${stats.lateCount}건`, "warning")}
          ${renderMetric("위험출결률", stats.riskRate === null ? "판단 전" : formatPercent(stats.riskRate, 1), `위험 ${stats.riskCount}건`, "danger")}
        </div>
        <div class="chart-shell milestone-rate-chart-shell">
          <canvas id="milestone-rate-chart" aria-label="${escape(App.shortMilestoneLabel(milestone.label))} 운영 비율 차트"></canvas>
          <p class="chart-fallback">Chart.js를 불러오면 마일스톤 운영 비율 차트가 표시됩니다.</p>
        </div>
        <div class="milestone-rate-note">
          ${rows
            .slice(0, 4)
            .map(
              (row) => `
                <span>${escape(row.label)} · 출석 ${row.attendanceRate === null ? "판단 전" : formatPercent(row.attendanceRate, 1)} · 지각 ${row.lateCount}건 · 위험 ${row.riskCount}건</span>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderMilestoneCourseInfo(milestone, aggregate) {
    const eventCounts = aggregate.eventCounts || {};
    const attendanceStats = milestoneAttendanceStats(milestone);
    const statusText = aggregate.statusCounts.map((row) => `${row.label} ${row.count}명`).join(" · ") || "상태 집계 없음";
    const ratioText = [
      `출석률 ${attendanceStats.attendanceRate === null ? "판단 전" : formatPercent(attendanceStats.attendanceRate, 1)}`,
      `지각률 ${attendanceStats.lateRate === null ? "판단 전" : formatPercent(attendanceStats.lateRate, 1)}`,
      `위험출결률 ${attendanceStats.riskRate === null ? "판단 전" : formatPercent(attendanceStats.riskRate, 1)}`,
    ].join(" · ");
    const signalText = [
      `참여 ${aggregate.participantCount || 0}명`,
      `평균 프로파일 ${formatNumber(aggregate.avgProfile, 2)}`,
      `성장 변화 ${aggregate.avgGrowth >= 0 ? "+" : ""}${formatNumber(aggregate.avgGrowth, 2)}`,
      `상담 ${eventCounts.counseling || 0}건`,
      `위험출결 ${eventCounts.attendanceRisk || 0}건`,
    ].join(" · ");
    return `
      <section class="panel milestone-course-info">
        <div class="panel-head compact">
          <div>
            <span class="panel-kicker">Milestone Overview</span>
            <h2>구간 정보</h2>
          </div>
          <p class="panel-copy">${escape(App.formatRange(milestone.startDate, milestone.endDate))}</p>
        </div>
        <div class="milestone-course-grid">
          <article>
            <span>상태 분포</span>
            <p>${escape(statusText)}</p>
          </article>
          <article>
            <span>운영 비율</span>
            <p>${escape(ratioText)}</p>
          </article>
          <article>
            <span>운영 신호</span>
            <p>${escape(signalText)}</p>
          </article>
          <article>
            <span>핵심 특이사항</span>
            <p>${escape(aggregate.caseCounts.slice(0, 4).map((row) => `${row.label} ${row.count}명`).join(" · ") || "반복 특이사항 없음")}</p>
          </article>
        </div>
      </section>
    `;
  }

  function renderMilestoneAnalysisPurpose(milestone, index, aggregate) {
    const purpose = milestoneAnalysisPurpose(milestone, index, aggregate);
    return `
      <section class="panel milestone-purpose-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Analysis Purpose</span>
            <h2>${escape(purpose.title)}</h2>
          </div>
          <p class="panel-copy">${escape(purpose.period)}</p>
        </div>
        <div class="milestone-purpose-grid">
          <article class="milestone-purpose-main">
            <span>${escape(purpose.label)}</span>
            <p>${escape(purpose.purpose)}</p>
          </article>
          <article>
            <span>수업/자료 범위</span>
            <p>${escape(purpose.curriculum.subjectText)}</p>
            <small>${escape(purpose.curriculum.lessonText)}</small>
            ${purpose.projectText ? `<small>${escape(`프로젝트: ${purpose.projectText}`)}</small>` : ""}
          </article>
          <article>
            <span>분석 질문</span>
            <ul>
              ${purpose.questions.map((item) => `<li>${escape(item)}</li>`).join("")}
            </ul>
          </article>
          <article>
            <span>판단 주의</span>
            <ul>
              ${purpose.cautions.map((item) => `<li>${escape(item)}</li>`).join("")}
            </ul>
          </article>
        </div>
      </section>
    `;
  }

  function renderUrgentMilestoneStudents(aggregate) {
    const rows = aggregate.urgentRows || [];
    return `
      <div class="urgent-student-list">
        ${rows.length
          ? rows
              .map(
                ({ student, snapshot, status, reasons }) => `
                  <a href="${App.studentPageHref(student.id)}" class="urgent-student-row ${App.toneClass(status === "경고" ? "danger" : status === "이탈" ? "neutral" : "warning")}">
                    <div>
                      <strong>${escape(student.name)}</strong>
                      <span>${escape(status)} · 평균 ${formatNumber(snapshot.profileAverage, 2)}</span>
                    </div>
                    <p>${escape(reasons.slice(0, 4).join(" · ") || snapshot.note || "확인 필요")}</p>
                  </a>
                `
              )
              .join("")
          : `<p class="empty-state compact">이 구간에 긴급 확인 인원은 없습니다.</p>`}
      </div>
    `;
  }

  function milestoneEvaluationReason(milestone, aggregate) {
    const eventCounts = aggregate.eventCounts || {};
    const attendanceStats = milestoneAttendanceStats(milestone);
    const statusText = aggregate.statusCounts.map((row) => `${row.label} ${row.count}명`).join(", ") || "상태 집계 없음";
    const cautionText = aggregate.cautionCounts.slice(0, 3).map((row) => `${row.label} ${row.count}명`).join(", ");
    const caseText = aggregate.caseCounts.slice(0, 2).map((row) => `${row.label} ${row.count}명`).join(", ");
    const growthText =
      aggregate.avgGrowth > 0.25
        ? "이전 구간보다 성장 흐름이 뚜렷합니다"
        : aggregate.avgGrowth < -0.25
          ? "이전 구간보다 프로파일이 흔들린 학생이 늘었습니다"
          : "이전 구간과 비교해 큰 변동보다는 유지 흐름이 중심입니다";
    const riskText = [
      `출석률 ${attendanceStats.attendanceRate === null ? "판단 전" : formatPercent(attendanceStats.attendanceRate, 1)}`,
      `지각률 ${attendanceStats.lateRate === null ? "판단 전" : formatPercent(attendanceStats.lateRate, 1)}`,
      eventCounts.counseling ? `상담 ${eventCounts.counseling}건` : "",
      eventCounts.attendanceRisk ? `위험출결 ${eventCounts.attendanceRisk}건` : "",
      aggregate.dropoutCount ? `구간 이탈 ${aggregate.dropoutCount}명` : "",
    ].filter(Boolean).join(", ");
    return [
      `${App.shortMilestoneLabel(milestone.label)} 평가는 참여 ${aggregate.participantCount || 0}명의 평균 프로파일 ${formatNumber(aggregate.avgProfile, 2)}점과 성장 변화 ${aggregate.avgGrowth >= 0 ? "+" : ""}${formatNumber(aggregate.avgGrowth, 2)}를 기준으로 봅니다.`,
      `${growthText}.`,
      `상태 분포는 ${statusText}이며${cautionText ? `, 관찰영역은 ${cautionText}이 두드러집니다` : ", 두드러진 관찰영역은 크지 않습니다"}.`,
      `${riskText ? `${riskText}이 평가 이유에 함께 반영됩니다.` : "추가 위험 신호는 크지 않아 기본 참여 흐름을 중심으로 해석합니다."}`,
      `${caseText ? `특이사항은 ${caseText}을 우선 확인합니다.` : "반복 특이사항은 아직 뚜렷하게 누적되지 않았습니다."}`,
    ].join(" ");
  }

  function renderMilestoneEvaluationReason(milestone, aggregate) {
    return `
      <section class="panel milestone-evaluation-reason">
        <p>${escape(milestoneEvaluationReason(milestone, aggregate))}</p>
      </section>
    `;
  }

  function renderProjectOperationPanel(milestone, aggregate) {
    const rows = projectOperationRows(milestone, aggregate);
    if (!rows.length) return "";
    return `
      <section class="panel project-operation-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Project Operation</span>
            <h2>프로젝트 운영 지표</h2>
          </div>
          <p class="panel-copy">프로젝트 시작일부터 종료일까지의 흐름을 따로 분리해 체크인, 출석, 회고, 만족도 신호를 봅니다.</p>
        </div>
        <div class="project-operation-grid">
          ${rows
            .map(
              (row) => `
                <article class="project-operation-card ${row.isEstimated ? "is-estimated" : ""}">
                  <div class="project-operation-title">
                    <div>
                      <strong>${escape(row.phase)}</strong>
                      <span>${escape(App.formatRange(row.startDate, row.endDate))} · 대상 ${row.participantCount}명${row.isEstimated ? " · 일정 추정" : ""}</span>
                    </div>
                    <em>${row.plannedDayCount ? `${row.plannedDayCount}일` : `${row.scheduleDayCount}일 추정`}</em>
                  </div>
                  <div class="project-operation-stats">
                    <div>
                      <span>데일리체크인</span>
                      <strong>${row.checkinRate === null ? "판단 전" : formatPercent(row.checkinRate, 1)}</strong>
                      <small>${row.checkinCount}건${row.onTimeRate === null ? "" : ` · 정시 ${formatPercent(row.onTimeRate, 1)}`}</small>
                    </div>
                    <div>
                      <span>출석률</span>
                      <strong>${row.attendanceRate === null ? "판단 전" : formatPercent(row.attendanceRate, 1)}</strong>
                      <small>결석 ${row.absenceCount}건 · 지각 ${row.lateCount}건</small>
                    </div>
                    <div>
                      <span>회고</span>
                      <strong>${row.retroRate === null ? "판단 전" : formatPercent(row.retroRate, 1)}</strong>
                      <small>${row.retroCount}건 제출</small>
                    </div>
                    <div>
                      <span>만족도 신호</span>
                      <strong>${row.retroCount ? `긍정 ${row.positiveRetro}` : "판단 전"}</strong>
                      <small>${row.retroCount ? `우려 ${row.concernRetro}건` : "구조화 점수 없음"}</small>
                    </div>
                  </div>
                  ${renderRateTimelineGraph(
                    row.timelineRows,
                    [
                      { key: "checkinRate", label: "체크인", hint: "제출률", tone: "mint" },
                      { key: "attendanceRate", label: "출석률", hint: "결석 제외", tone: "success" },
                      { key: "lateRate", label: "지각률", hint: "지각/일정", tone: "warning" },
                    ],
                    { label: `${row.phase} 프로젝트 타임라인`, emptyText: "프로젝트 타임라인 데이터가 없습니다." }
                  )}
                  <div class="project-special-list">
                    ${row.specialNotes
                      .map(
                        (note) => `
                          <div>
                            <strong>${escape(note.label)}</strong>
                            <p>${escape(note.detail)}</p>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                  <p>${escape(
                    row.plannedDayCount
                      ? "체크인 제출률은 커리큘럼의 프로젝트 운영일과 참여 인원을 기준으로 산정했습니다. 출석률은 결석 기록 기반 추정치이므로 위험 신호 확인용으로만 사용합니다."
                      : "세부 운영일이 없는 추정 프로젝트이므로 제출률·회고·만족도는 실제 데이터가 들어온 뒤 판단합니다."
                  )}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderMilestoneStudentSamples(milestone) {
    const samples = milestoneStudents(milestone)
      .map(({ student, snapshot }) => ({
        student,
        snapshot,
        cases: (student.learningFlowCases || []).filter((item) => overlaps(item.startDate, item.endDate, milestone.startDate, milestone.endDate)),
      }))
      .sort((a, b) => {
        const caseDelta = b.cases.length - a.cases.length;
        if (caseDelta) return caseDelta;
        const dropoutDelta = Number(b.snapshot.dropoutDuringMilestone || false) - Number(a.snapshot.dropoutDuringMilestone || false);
        if (dropoutDelta) return dropoutDelta;
        return (a.snapshot.profileAverage || 0) - (b.snapshot.profileAverage || 0);
      })
      .slice(0, 8);
    return `
      <div class="milestone-student-sample-list">
        ${samples
          .map(
            ({ student, snapshot, cases }) => `
              <a href="${App.studentPageHref(student.id)}" class="milestone-student-sample">
                <strong>${escape(student.name)}${snapshot.dropoutDuringMilestone ? ` · 이탈 ${escape(App.formatDate(snapshot.dropoutDate))}` : ""}</strong>
                <span>평균 ${formatNumber(snapshot.profileAverage, 2)} · 성장 ${snapshot.growthDelta >= 0 ? "+" : ""}${formatNumber(snapshot.growthDelta, 2)}</span>
                <small>${escape(cases[0]?.label || snapshot.note || "특이 케이스 없음")}</small>
              </a>
            `
          )
          .join("") || `<p class="empty-state compact">표시할 학생 기록이 없습니다.</p>`}
      </div>
    `;
  }

  function renderMilestoneInnerTabs(aggregate, activeTab) {
    if (!aggregate.projectRanges?.length) return "";
    return `
      <nav class="milestone-inner-tabs" aria-label="마일스톤 상세 탭">
        <button type="button" class="${activeTab === "milestone" ? "is-active" : ""}" data-milestone-tab="milestone">마일스톤</button>
        <button type="button" class="${activeTab === "project" ? "is-active" : ""}" data-milestone-tab="project">프로젝트</button>
      </nav>
    `;
  }

  function renderMilestoneDefaultContent(milestone, aggregate, eventCounts) {
    return `
      <section class="milestone-detail-grid">
        <article class="panel milestone-detail-card">
          <div class="panel-head compact">
            <div>
              <span class="panel-kicker">Operation Signals</span>
              <h2>운영 기록 신호</h2>
            </div>
          </div>
          ${renderEventCountBars(eventCounts)}
        </article>
        <article class="panel milestone-detail-card">
          <div class="panel-head compact">
            <div>
              <span class="panel-kicker">Cases</span>
              <h2>주요 특이사항</h2>
            </div>
          </div>
          ${renderCountList(aggregate.caseCounts, "이 구간에 반복적으로 잡힌 특이 케이스가 없습니다.")}
        </article>
      </section>
      <section class="panel milestone-case-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Priority Students</span>
            <h2>긴급 확인 인원</h2>
          </div>
          <p class="panel-copy">경고, 이탈, 위험출결, 낮은 프로파일, 상담 신호가 겹친 학생을 우선 표시합니다.</p>
        </div>
        ${renderUrgentMilestoneStudents(aggregate)}
      </section>
      <section class="panel milestone-student-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Student Samples</span>
            <h2>확인할 학생</h2>
          </div>
          <p class="panel-copy">케이스가 있거나 평균 프로파일이 낮은 학생을 우선 노출합니다.</p>
        </div>
        ${renderMilestoneStudentSamples(milestone)}
      </section>
    `;
  }

  function renderMilestoneDetail(milestone, index) {
    if (!milestone) return `<section class="panel"><p class="empty-state">선택된 마일스톤을 찾을 수 없습니다.</p></section>`;
    const aggregate = milestoneAggregate(milestone);
    const eventCounts = aggregate.eventCounts;
    const attendanceStats = milestoneAttendanceStats(milestone);
    const activeTab = aggregate.projectRanges?.length && state.milestoneTab === "project" ? "project" : "milestone";
    const current = isCurrentMilestone(milestone);
    return `
      ${renderMilestoneEvaluationReason(milestone, aggregate)}
      <section class="panel milestone-detail-hero ${current ? "is-current" : ""}">
        <div class="milestone-detail-metrics">
          ${renderMetric("참여 인원", `${aggregate.participantCount || 0}명`, aggregate.dropoutCount ? `이 구간 이탈 ${aggregate.dropoutCount}명` : "해당 구간 수강 기준", "neutral")}
          ${renderMetric("평균 프로파일", formatNumber(aggregate.avgProfile, 2), "참여 인원 기준", "brand")}
          ${renderMetric("성장 변화", `${aggregate.avgGrowth >= 0 ? "+" : ""}${formatNumber(aggregate.avgGrowth, 2)}`, "이전 구간 대비 평균", "success")}
          ${renderMetric("출석률", attendanceStats.attendanceRate === null ? "판단 전" : formatPercent(attendanceStats.attendanceRate, 1), `결석 ${attendanceStats.absenceCount}건`, "success")}
          ${renderMetric("지각률", attendanceStats.lateRate === null ? "판단 전" : formatPercent(attendanceStats.lateRate, 1), `지각 ${attendanceStats.lateCount}건`, "warning")}
        </div>
        ${renderMilestoneTopSummary(aggregate)}
      </section>
      ${renderMilestoneAnalysisPurpose(milestone, index, aggregate)}
      ${renderMilestoneCourseInfo(milestone, aggregate)}
      ${renderMilestoneRateTimeline(milestone, aggregate)}
      ${renderMilestoneInnerTabs(aggregate, activeTab)}
      ${activeTab === "project" ? renderProjectOperationPanel(milestone, aggregate) : renderMilestoneDefaultContent(milestone, aggregate, eventCounts)}
    `;
  }

  function renderProcessPage() {
    const milestones = App.rawData.milestones || [];
    const selectedMilestone = milestones.find((milestone) => milestone.id === state.processView);
    const selectedIndex = Math.max(0, milestones.findIndex((milestone) => milestone.id === state.processView));
    return `
      <section class="panel process-page-head">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Learning Process</span>
            <h2>모집부터 종강까지의 학습 흐름</h2>
          </div>
          <p class="panel-copy">각 단계는 학생 프로필 변화, 출석·지각 비율, 상담, 위험출결, 복합 케이스를 시간순으로 묶어 보여줍니다.</p>
        </div>
        ${renderProcessSubnav(milestones)}
      </section>
      ${state.processView === "overview" ? renderProcessOverview() : renderMilestoneDetail(selectedMilestone, selectedIndex)}
    `;
  }

  function renderStatusFilter() {
    const basis = App.rawData.students
      .filter((student) => matchesCaseFilter(student, state.activeCase))
      .filter((student) => matchesRegionFilter(student))
      .filter((student) => matchesDemographicFilter(student))
      .filter((student) => matchesClassificationFilter(student));
    const counts = statusCounts(basis);
    return `
      <section class="status-summary-grid">
        ${Object.keys(STATUS_COPY)
          .map((status) => {
            const meta = statusMeta(status);
            return `
              <button type="button" class="status-summary-card ${App.toneClass(meta.tone)} ${state.statusFilter === status ? "is-active" : ""}" data-status-filter="${escape(status)}">
                <span>${escape(meta.label)}</span>
                <strong>${counts[status] || 0}명</strong>
                <small>${escape(meta.description)}</small>
              </button>
            `;
          })
          .join("")}
      </section>
    `;
  }

  function renderCategoryCard(tag, students) {
    const meta = tagMeta(tag);
    const count = students.filter((student) => student.derived?.primaryTag === tag).length;
    return `
      <button type="button" class="category-card ${App.toneClass(meta.tone)} ${state.activeTag === tag ? "is-active" : ""}" data-tag="${escape(tag)}">
        <span class="category-count">${count}명</span>
        <strong>${escape(meta.label)}</strong>
        <small>${escape(meta.description)}</small>
      </button>
    `;
  }

  function renderCategoryOverview() {
    const students = App.rawData.students
      .filter((student) => state.statusFilter === "all" || statusGroup(student) === state.statusFilter)
      .filter((student) => matchesCaseFilter(student, state.activeCase))
      .filter((student) => matchesRegionFilter(student))
      .filter((student) => matchesDemographicFilter(student))
      .filter((student) => matchesClassificationFilter(student));
    return `
      <section class="panel category-panel">
        <div class="panel-head compact">
          <div>
            <span class="panel-kicker">Operating Categories</span>
            <h2>운영 분류 카테고리</h2>
          </div>
          <button type="button" class="soft-action ${state.activeTag === "all" ? "is-active" : ""}" data-tag="all">전체 보기</button>
        </div>
        <div class="category-grid compact">
          ${CATEGORY_ORDER.map((tag) => renderCategoryCard(tag, students)).join("")}
        </div>
      </section>
    `;
  }

  function jobFitTone(score) {
    const value = score100(score);
    if (value >= 76) return "success";
    if (value >= 66) return "brand";
    if (value >= 56) return "warning";
    return "neutral";
  }

  function topJobFitRole(student) {
    return student.jobFit?.topRoles?.[0] || null;
  }

  function renderJobFitOverview(students) {
    const market = App.rawData.jobMarket || {};
    const activeStudents = students.filter((student) => !App.hasDropoutRecord(student));
    const ranked = activeStudents
      .filter((student) => score100(student.jobFit?.score) > 0)
      .sort((a, b) => score100(b.jobFit?.score) - score100(a.jobFit?.score));
    const averageFit = ranked.length ? average(ranked, (student) => student.jobFit?.score) : 0;
    const labelCounts = ranked.reduce((acc, student) => {
      const label = student.jobFit?.label || "판단 보류";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const roleRows = (market.roleSummary || []).slice(0, 6).map((role) => ({
      ...role,
      studentCount: activeStudents.filter((student) => topJobFitRole(student)?.key === role.key).length,
    }));
    return `
      <section class="panel job-fit-overview-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">GameJob Fit</span>
            <h2>채용공고 기반 직무 적합도</h2>
          </div>
          <p class="panel-copy">
            <a href="${escape(market.sourceUrl || "https://rkdghkclgns-design.github.io/gamejob-crawler/")}" target="_blank" rel="noopener">GameJob Crawler</a>
            ${escape(String(market.planningJobs || 0))}건 · ${escape(market.latestUpdatedAt || "갱신일 미확인")}
          </p>
        </div>
        <div class="job-fit-overview-grid">
          <article class="job-fit-summary-card ${App.toneClass(jobFitTone(averageFit))}">
            <span>표시 학생 평균</span>
            <strong>${formatNumber(averageFit, 1)}</strong>
            <p>총점/지원검토와 분리된 취업 직무 매칭 지표입니다.</p>
            <button type="button" class="soft-action compact-action" data-table-sort="jobFit">직무적합순</button>
          </article>
          <article class="job-fit-label-card">
            <span>지원 우선도</span>
            <div>
              ${Object.entries(labelCounts)
                .map(([label, count]) => `<p><b>${escape(label)}</b><strong>${escape(String(count))}명</strong></p>`)
                .join("") || `<p><b>판단 보류</b><strong>0명</strong></p>`}
            </div>
          </article>
          <article class="job-fit-role-card">
            <span>공고 수요와 학생 직무군</span>
            <div class="job-fit-role-stack">
              ${roleRows
                .map(
                  (role) => `
                    <p>
                      <b>${escape(role.label)}</b>
                      <span>공고 ${escape(String(role.count || 0))}건 · 학생 ${escape(String(role.studentCount || 0))}명</span>
                    </p>
                  `
                )
                .join("") || `<p><b>직무군 없음</b><span>공고 데이터가 없습니다.</span></p>`}
            </div>
          </article>
        </div>
        <div class="job-fit-student-strip">
          ${ranked
            .slice(0, 8)
            .map((student) => {
              const role = topJobFitRole(student);
              return `
                <a class="job-fit-student-card" href="${escape(App.studentPageHref(student.id, { tab: "status" }))}">
                  <span>${escape(student.jobFit?.label || "판단 보류")}</span>
                  <strong>${escape(student.name)} · ${formatNumber(score100(student.jobFit?.score), 0)}</strong>
                  <small>${escape(role?.label || "직무군 근거 부족")} · 매칭 ${escape(String(student.jobFit?.matchedJobCount || 0))}건</small>
                </a>
              `;
            })
            .join("") || `<div class="empty-state compact">현재 필터 조건에서 직무 적합도 산정 대상이 없습니다.</div>`}
        </div>
      </section>
    `;
  }

  function filterChip(label, value, tone = "neutral") {
    return `<span class="filter-state-chip ${App.toneClass(tone)}"><b>${escape(label)}</b>${escape(value)}</span>`;
  }

  function renderStudentCommandBar(students) {
    const status = statusMeta(state.statusFilter);
    const tag = state.activeTag === "all" ? null : tagMeta(state.activeTag);
    const caseFilter = caseFilterMeta(state.activeCase);
    const region = regionFilterLabel(state.regionFilter);
    const demographic = demographicFilterMeta();
    const classification = classificationFilterMeta(state.classificationFilter);
    const sortColumn = SORT_OPTIONS.find((item) => item.key === state.sortKey) || TABLE_COLUMNS[0];
    const hasFilters =
      state.statusFilter !== "all" ||
      state.activeTag !== "all" ||
      state.activeCase !== "all" ||
      state.regionFilter !== "all" ||
      state.demographicFilterType !== "all" ||
      state.classificationFilter !== "all" ||
      Boolean(state.query.trim());
    const quickSorts = [
      { key: "name", label: "가나다" },
      { key: "profile", label: "총점" },
      { key: "growth", label: "성장" },
      { key: "participation", label: "참여" },
      { key: "collaboration", label: "협업" },
      { key: "career", label: "진로" },
      { key: "support", label: "지원검토" },
      { key: "jobFit", label: "직무적합" },
      { key: "attendanceRisk", label: "위험출결" },
    ];
    return `
      <section class="panel student-command-panel">
        <div class="student-command-main">
          <div>
            <span class="panel-kicker">Current View</span>
            <h2>학생관리 탐색 기준</h2>
            <p>상태, 지역, 운영 포커스, 운영 분류는 한 화면에서 함께 적용됩니다. 수치 기준은 표 머리글이나 아래 빠른 정렬로 바꿀 수 있습니다.</p>
          </div>
          <div class="student-command-count">
            <strong>${students.length}</strong>
            <span>표시 중</span>
          </div>
        </div>
        <div class="filter-state-row">
          ${filterChip("상태", status.label, status.tone)}
          ${filterChip("지역", region, state.regionFilter === "all" ? "neutral" : "brand")}
          ${filterChip("기수통계", demographic.label, demographic.tone)}
          ${filterChip("운영포커스", `${classification.groupLabel === "운영포커스" ? "" : `${classification.groupLabel} · `}${classification.label}`, classification.tone)}
          ${filterChip("분류", tag ? tag.label : "전체", tag ? tag.tone : "neutral")}
          ${filterChip("케이스", caseFilter.label, caseFilter.tone)}
          ${filterChip("정렬", `${sortColumn.label} ${state.sortDirection === "asc" ? "오름차순" : "내림차순"}`, "brand")}
          ${state.query.trim() ? filterChip("검색", state.query.trim(), "mint") : filterChip("검색", "없음", "neutral")}
          ${hasFilters ? `<button type="button" class="soft-action compact-action" data-reset-student-filters>필터 초기화</button>` : ""}
        </div>
        <div class="student-sort-row" aria-label="빠른 정렬">
          ${quickSorts
            .map(
              (item) => `
                <button type="button" class="student-sort-chip ${state.sortKey === item.key ? "is-active" : ""}" data-table-sort="${escape(item.key)}">
                  ${escape(item.label)}${sortGlyph(item.key)}
                </button>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function sortGlyph(key) {
    if (state.sortKey !== key) return "";
    return state.sortDirection === "asc" ? " ▲" : " ▼";
  }

  function classificationReasonSummary(student, tag) {
    const reasons = student.derived?.tagReasons?.[tag]?.reasons || [];
    return reasons[0] || tagMeta(tag).description;
  }

  function score100Cell(value, tone, label) {
    const score = score100(value);
    return `
      <span class="score100-cell score100-${escape(tone)}" title="${escape(`${label} ${formatNumber(score, 1)}점 / 100점`)}">
        <b>${formatNumber(score, 1)}</b>
        <i aria-hidden="true"><span style="width:${round(score, 1)}%"></span></i>
      </span>
    `;
  }

  function scoreColumnCell(label, value, tone) {
    const score = score100(value);
    return `
      <span class="score-column-cell score100-${escape(tone)}" title="${escape(`${label} ${formatNumber(score, 1)}점 / 100점`)}" aria-label="${escape(`${label} ${formatNumber(score, 1)}점 / 100점`)}">
        <b>${formatNumber(score, 0)}</b>
        <i aria-hidden="true"><span style="width:${round(score, 1)}%"></span></i>
      </span>
    `;
  }

  function projectSubmissionRateCell(stats) {
    const expected = Number(stats.projectExpectedCount || 0);
    const submitted = Number(stats.projectSubmissionCount || 0);
    const rate = Number(stats.projectSubmissionRate || 0);
    const title = expected
      ? `관측기간 제출 ${submitted}/${expected} · ${formatPercent(rate, 1)}`
      : "관측기간 제출 기준 없음";
    return `<span title="${escape(title)}">${formatPercent(rate, 1)}</span>`;
  }

  function renderStudentRow(student) {
    const derived = student.derived || {};
    const stats = student.stats || {};
    const primaryTag = derived.primaryTag || "steady_path";
    const focusAssessment = state.classificationFilter === "all" ? null : App.studentOperationalAssessmentByKey(student, state.classificationFilter);
    const totalScore = score100(derived.totalRankScore, derived.profileRankScore, derived.profileIndex);
    const initialScore = score100(derived.initialCapabilityRankScore, derived.initialCapability?.score);
    const growthScore = score100(derived.growthRankScore, derived.growthIndex);
    const participationScore = score100(derived.participationRankScore, derived.participationReadiness?.score);
    const supportScore = score100(derived.supportRankScore, derived.supportIndex);
    const collaborationScore = score100(derived.collaborationRankScore, derived.collaborationReadiness?.collaborationReadinessScore);
    const careerScore = score100(derived.careerRankScore, derived.careerReadiness?.careerReadinessScore);
    const jobFitScore = score100(student.jobFit?.score);
    const jobFitRole = topJobFitRole(student);
    const studentHref = App.studentPageHref(student.id, {
      ...(focusAssessment?.qualified ? { focus: state.classificationFilter } : {}),
    });
    return `
      <tr data-student-id="${escape(student.id)}">
        <td>
          <a class="student-name-link" href="${escape(studentHref)}">${escape(student.name)}</a>
          <small>${escape(student.education || "학력 미기재")}</small>
          <small>직무 ${formatNumber(jobFitScore, 0)} · ${escape(jobFitRole?.label || student.jobFit?.label || "판단 보류")}</small>
        </td>
        <td>${statusPill(statusGroup(student))}</td>
        <td>
          ${tagPill(primaryTag)}
          <small>${escape(classificationReasonSummary(student, primaryTag))}</small>
          ${focusAssessment?.qualified ? `<small>${escape(`${focusAssessment.groupLabel} · ${focusAssessment.label}: ${focusAssessment.reasons[0] || focusAssessment.basis}`)}</small>` : ""}
        </td>
        <td>${scoreColumnCell("총점", totalScore, "total")}</td>
        <td>${scoreColumnCell("초기역량", initialScore, "initial")}</td>
        <td>${scoreColumnCell("성장 가능성", growthScore, "growth")}</td>
        <td>${scoreColumnCell("과정참여도", participationScore, "participation")}</td>
        <td>${scoreColumnCell("협업", collaborationScore, "collaboration")}</td>
        <td>${scoreColumnCell("진로역량", careerScore, "career")}</td>
        <td>${scoreColumnCell("지원 검토", supportScore, "support")}</td>
        <td class="number-cell">${stats.attendanceRiskIssues || 0}</td>
        <td class="number-cell">${projectSubmissionRateCell(stats)}</td>
      </tr>
    `;
  }

  function renderStudentTable(students) {
    return `
      <div class="student-table-wrap">
        <table class="student-table">
          <thead>
            <tr>
              ${TABLE_COLUMNS.map(
                (column) => `
                  <th scope="col">
                    <button type="button" data-table-sort="${escape(column.key)}">
                      ${escape(column.label)}${sortGlyph(column.key)}
                    </button>
                  </th>
                `
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${
              students.length
                ? students.map(renderStudentRow).join("")
                : `<tr><td colspan="${TABLE_COLUMNS.length}" class="empty-state">검색 또는 필터 조건에 맞는 학생이 없습니다.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStudentsPage() {
    const students = filteredStudents();
    return `
      ${renderStudentCommandBar(students)}
      ${renderStatusFilter()}
      ${renderCategoryOverview()}
      ${renderJobFitOverview(students)}
      <section class="panel student-management-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Student Management</span>
            <h2>학생 리스트와 상태 데이터</h2>
          </div>
          <p class="panel-copy">총점은 초기역량 비중을 낮게 두고 성장 가능성, 과정참여도, 협업, 진로역량을 합산합니다. 지원검토는 총점과 분리된 운영 개입 지표입니다.</p>
        </div>
        <div class="student-table-meta">
          <strong>${students.length}명 표시</strong>
          <span>${state.query ? `"${escape(state.query)}" 검색 중` : "검색어 없음"}</span>
        </div>
        ${renderStudentTable(students)}
      </section>
    `;
  }

  function feedbackStudents() {
    return [...App.rawData.students].sort((a, b) => String(a.name).localeCompare(String(b.name), "ko-KR", { numeric: true }));
  }

  function currentFeedbackStudent() {
    const students = feedbackStudents();
    if (!state.feedbackStudentId || !App.studentsById.get(state.feedbackStudentId)) {
      state.feedbackStudentId = students[0]?.id || "";
    }
    return App.studentsById.get(state.feedbackStudentId) || students[0] || null;
  }

  function limitText(value, limit = 1200) {
    const text = String(value || "").trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
  }

  function careerDocumentSummary(student) {
    const docs = student.careerDocuments || {};
    const rounds = docs.rounds || [];
    return {
      summary: docs.summary || {},
      rounds: rounds.map((round) => ({
        roundLabel: round.roundLabel,
        date: round.date,
        hasSelfIntroduction: Boolean(round.documents?.selfIntroduction),
        hasResume: Boolean(round.documents?.resume),
        feedbackExcerpt: limitText(round.feedback, 700),
      })),
    };
  }

  function bridgeRubric() {
    return {
      feedbackType: "자기소개서",
      criteria: [
        {
          key: "purpose_clarity",
          label: "목적의 명확성",
          question: "지원 직무, 목표 회사/직무 맥락, 포트폴리오 방향이 객관 자료로 확인되는가?",
        },
        {
          key: "strength_awareness",
          label: "자기 강점 인식",
          question: "자신의 강점과 근거 경험을 스스로 이해하고 있는가?",
        },
        {
          key: "personal_color",
          label: "자기 스타일/색깔",
          question: "취향 나열이 아니라 게임 기획 문제를 바라보는 관점과 산출물 근거가 보이는가?",
        },
        {
          key: "evidence_alignment",
          label: "근거의 일관성",
          question: "학생 데이터와 제출 문서의 주장, 사례, 표현이 서로 연결되는가?",
        },
        {
          key: "revision_actionability",
          label: "수정 가능성",
          question: "학생이 바로 고칠 수 있는 문장 단위의 개선 방향을 제시할 수 있는가?",
        },
      ],
      guardrails: [
        "저장된 학생 데이터에 없는 사실을 새로 만들지 않는다.",
        "협업 평가는 운영진 관찰, 프로젝트 데일리체크인, 회고, 같은 프로젝트 팀원 언급, PM/팀장 수행 근거를 분리해서 참고한다.",
        "진로 평가는 추상적인 희망 표현을 긍정으로 보지 않고, 구체 직무 목표, 객관 자료, 피드백 반영, 발표 주제의 게임기획 관련성을 우선한다.",
        "병가, 건강형 출결, 늦잠 지각은 태도 문제가 아니라 건강/컨디션 관리 신호로 분리한다.",
        "협업 위험은 타 학생의 불만, 프로젝트 불화, 소통 저해가 있는지 시간·팀·커리큘럼 맥락과 함께 확인한다.",
        "기본 정보는 점수 근거가 아니라 학생이 직접 쓴 문서의 표현과 선택을 이해하기 위한 맥락으로만 사용한다.",
      ],
    };
  }

  function buildFeedbackBridge(student) {
    if (!student) return {};
    const derived = student.derived || {};
    return {
      version: "student-feedback-bridge/v1",
      generatedAt: new Date().toISOString(),
      providerProfile: {
        targetProvider: state.feedbackProvider,
        primaryModel: state.feedbackModel,
        format: "JSON-friendly Korean instruction payload",
        note: "Gemini에 바로 전달하기 쉽도록 구조화하되, 다른 모델에서도 해석 가능한 중간 문서입니다.",
      },
      task: {
        feedbackType: state.feedbackType === "self_intro" ? "자기소개서" : state.feedbackType,
        language: "ko-KR",
        expectedOutput: ["종합 판단", "강점", "보완점", "문장/구조 수정 제안", "학생 데이터 기반 주의사항"],
      },
      rubric: bridgeRubric(),
      student: {
        id: student.id,
        name: student.name,
        gender: student.gender,
        age: ageOf(student),
        education: student.education,
        course: student.course,
        cohort: student.cohort,
        status: statusLabel(student),
        classification: {
          primaryTag: derived.primaryTag,
          primaryLabel: tagMeta(derived.primaryTag || "steady_path").label,
          tags: derived.tags || [],
          tagReasons: derived.tagReasons || {},
        },
        profileScores: student.currentProfile || {},
        profileLabels: PROFILE_LABELS,
        rankScores: {
          total: score100(derived.totalRankScore, derived.profileRankScore, derived.profileIndex),
          profile: score100(derived.totalRankScore, derived.profileRankScore, derived.profileIndex),
          initialCapability: score100(derived.initialCapabilityRankScore, derived.initialCapability?.score),
          growth: score100(derived.growthRankScore, derived.growthIndex),
          participation: score100(derived.participationRankScore, derived.participationReadiness?.score),
          support: score100(derived.supportRankScore, derived.supportIndex),
          collaboration: score100(derived.collaborationRankScore, derived.collaborationReadiness?.collaborationReadinessScore),
          career: score100(derived.careerRankScore, derived.careerReadiness?.careerReadinessScore),
        },
        rankScoreBasis: derived.rankScoreBasis || {},
        stats: student.stats || {},
        careerReadiness: derived.careerReadiness || {},
        expressionProfile: derived.expressionProfile || {},
        collaborationReadiness: {
          ...(derived.collaborationReadiness || {}),
          interpretation: "협업은 반복 팀원이나 단순 선호/비선호가 아니라 운영진 관찰, 같은 프로젝트 팀원 언급, PM/팀장 수행 회고, 체크인·회고 흐름을 중심으로 해석합니다.",
        },
        learningFlowCases: (student.learningFlowCases || []).map((item) => ({
          label: item.label,
          severity: item.severity,
          summary: item.summary,
          evidence: item.evidence,
          startDate: item.startDate,
          endDate: item.endDate,
        })),
        careerDocuments: careerDocumentSummary(student),
        recentTimeline: (student.timelineEvents || [])
          .slice()
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .slice(0, 12)
          .map((event) => ({
            date: event.date,
            title: event.title,
            summary: limitText(event.summary, 280),
            type: event.type,
            severity: event.severity,
          })),
      },
      submission: {
        fileName: state.feedbackFileName,
        fileMeta: state.feedbackFileMeta,
        textLength: state.submissionText.length,
        textExcerpt: limitText(state.submissionText, 6000),
      },
    };
  }

  function renderBridgePreview(student) {
    return escape(JSON.stringify(buildFeedbackBridge(student), null, 2));
  }

  function generateLocalFeedbackDraft(student) {
    if (!student) return "학생을 먼저 선택해주세요.";
    const bridge = buildFeedbackBridge(student);
    const career = bridge.student.careerReadiness || {};
    const tag = bridge.student.classification?.primaryLabel || "일반";
    return [
      `# ${student.name} 자기소개서 피드백 초안`,
      "",
      "## 종합 판단",
      `${student.name} 학생은 현재 '${tag}' 분류로 보고 있으며, 자기소개서에서는 구체 직무 목표, 객관 근거, 피드백 반영, 게임 기획자로서 설명 가능한 발표/산출물 맥락이 학생 데이터와 맞게 드러나는지 우선 확인합니다.`,
      "",
      "## 데이터상 먼저 볼 지점",
      `- 진로 목적성 점수: ${formatNumber(career.careerReadinessScore || bridge.student.rankScores.career, 1)}`,
      `- 목적 명확성: ${formatNumber(career.purposeClarity, 1)} / 객관 근거: ${formatNumber(career.objectiveEvidenceScore, 1)} / 구체 목표: ${career.hasConcreteGoal ? "있음" : "부족"} / 추상 표현: ${formatNumber(career.abstractExpressionCount, 0)}건`,
      `- 주요 케이스: ${(bridge.student.learningFlowCases || []).slice(0, 3).map((item) => item.label).join(", ") || "특이 케이스 없음"}`,
      "",
      "## 피드백 방향",
      "1. 지원동기 첫 문단에서 구체 직무와 지원 맥락을 더 빠르게 드러냅니다.",
      "2. 강점은 성격 표현보다 프로젝트, 회고, 문서 수정 이력 같은 근거와 연결합니다.",
      "3. 자기만의 색깔은 취향 나열이 아니라 게임 기획 문제를 바라보는 방식과 산출물로 정리합니다.",
      "4. 저장된 학생 데이터와 충돌하는 표현은 AI가 단정하지 말고 확인 질문으로 남깁니다.",
      "",
      "## API 연동 메모",
      "실제 Gemini 또는 다른 모델 호출 시에는 우측 중간다리 JSON을 컨텍스트로 전달하고, 제출 문서 원문을 submission.textExcerpt 또는 파일 파서 결과로 넣으면 됩니다.",
    ].join("\n");
  }

  function renderFeedbackPage() {
    const student = currentFeedbackStudent();
    const students = feedbackStudents();
    return `
      <section class="panel feedback-intro">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Feedback Studio</span>
            <h2>학생 제출 문서 피드백</h2>
          </div>
          <p class="panel-copy">학생 데이터와 평가 준거를 AI가 읽기 쉬운 중간다리 문서로 묶어, Gemini부터 다른 모델까지 확장할 수 있게 설계합니다.</p>
        </div>
      </section>
      <section class="feedback-workbench">
        <article class="panel feedback-panel">
          <div class="feedback-form-grid">
            <label>
              <span>학생</span>
              <select data-feedback-student>
                ${students.map((item) => `<option value="${escape(item.id)}" ${item.id === student?.id ? "selected" : ""}>${escape(item.name)}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>피드백 형태</span>
              <select data-feedback-type>
                <option value="self_intro" ${state.feedbackType === "self_intro" ? "selected" : ""}>자기소개서</option>
              </select>
            </label>
            <label>
              <span>AI 제공자</span>
              <select data-feedback-provider>
                <option value="gemini" ${state.feedbackProvider === "gemini" ? "selected" : ""}>Gemini</option>
                <option value="openai" ${state.feedbackProvider === "openai" ? "selected" : ""}>OpenAI</option>
                <option value="custom" ${state.feedbackProvider === "custom" ? "selected" : ""}>기타</option>
              </select>
            </label>
            <label>
              <span>모델</span>
              <input type="text" value="${escape(state.feedbackModel)}" data-feedback-model />
            </label>
            <label class="wide-field">
              <span>API Key</span>
              <input type="password" value="${escape(state.feedbackApiKey)}" placeholder="브라우저 저장 전 임시 입력" data-feedback-api-key />
            </label>
            <label class="wide-field">
              <span>제출 파일</span>
              <input type="file" accept=".txt,.md,.json,.csv,.docx,.pdf" data-feedback-file />
            </label>
            <label class="wide-field">
              <span>제출 문서 텍스트</span>
              <textarea data-feedback-submission placeholder="파일을 등록하거나 문서 내용을 붙여넣으세요.">${escape(state.submissionText)}</textarea>
            </label>
          </div>
          <div class="feedback-actions">
            <button type="button" class="primary-action" data-build-bridge>중간다리 문서 생성</button>
            <button type="button" class="soft-action" data-generate-local-feedback>피드백 초안 보기</button>
          </div>
          <div class="student-feedback-snapshot">
            <strong>${escape(student?.name || "학생 미선택")}</strong>
            <span>${student ? tagPill(student.derived?.primaryTag || "steady_path") : ""}</span>
            <p>${escape((student?.learningFlowCases || []).slice(0, 2).map((item) => item.summary).join(" ") || "학생을 선택하면 주요 분석 근거가 표시됩니다.")}</p>
          </div>
        </article>
        <article class="panel feedback-panel bridge-panel">
          <div class="bridge-head">
            <div>
              <span class="panel-kicker">Bridge Document</span>
              <h3>AI 전달용 중간다리 JSON</h3>
            </div>
            <span>${escape(state.feedbackFileName || "파일 미등록")}</span>
          </div>
          <pre class="bridge-preview" data-bridge-preview>${renderBridgePreview(student)}</pre>
        </article>
      </section>
      <section class="panel feedback-output-panel">
        <div class="panel-head compact">
          <div>
            <span class="panel-kicker">Generated Draft</span>
            <h2>생성 결과</h2>
          </div>
        </div>
        <pre class="feedback-output">${escape(state.feedbackOutput || "아직 생성된 결과가 없습니다. 현재 단계에서는 API 설정과 중간다리 문서 구조를 준비합니다.")}</pre>
      </section>
    `;
  }

  function milestoneIssueSummary(row) {
    const aggregate = row.aggregate;
    const stats = milestoneObservedAttendanceStats(row.milestone);
    const issues = [];
    if (aggregate.urgentRows?.length) {
      issues.push(`긴급 확인 ${aggregate.urgentRows.length}명: ${aggregate.urgentRows.slice(0, 3).map((item) => item.student.name).join(", ")}`);
    }
    if ((aggregate.eventCounts.attendanceRisk || 0) > 0) {
      issues.push(`위험출결 ${aggregate.eventCounts.attendanceRisk}건`);
    }
    if (stats.lateCount > 0) {
      issues.push(`지각 ${stats.lateCount}건`);
    }
    if (aggregate.caseCounts.length) {
      issues.push(aggregate.caseCounts.slice(0, 2).map((item) => `${item.label} ${item.count}명`).join(" · "));
    }
    if (aggregate.dropoutCount) {
      issues.push(`구간 이탈 ${aggregate.dropoutCount}명`);
    }
    return issues.length ? issues.slice(0, 4) : ["누적된 긴급 이슈가 크지 않아 기본 학습 흐름을 유지합니다."];
  }

  function milestoneNarrative(row) {
    const aggregate = row.aggregate;
    const stats = milestoneObservedAttendanceStats(row.milestone);
    const profileText = `참여 ${aggregate.participantCount || 0}명, 평균 프로파일 ${formatNumber(aggregate.avgProfile, 2)}점`;
    const growthText =
      aggregate.avgGrowth > 0.2
        ? `성장 변화가 +${formatNumber(aggregate.avgGrowth, 2)}로 상승했습니다`
        : aggregate.avgGrowth < -0.2
          ? `성장 변화가 ${formatNumber(aggregate.avgGrowth, 2)}로 흔들렸습니다`
          : "성장 변화는 큰 급등락보다 유지 흐름입니다";
    const attendanceText = `출석률 ${stats.attendanceRate === null ? "판단 전" : formatPercent(stats.attendanceRate, 1)}, 지각률 ${stats.lateRate === null ? "판단 전" : formatPercent(stats.lateRate, 1)}`;
    const cautionText = aggregate.cautionCounts.length
      ? `관찰 영역은 ${aggregate.cautionCounts.slice(0, 2).map((item) => `${item.label} ${item.count}명`).join(", ")}입니다`
      : "뚜렷한 관찰 영역 쏠림은 없습니다";
    return `${profileText} 기준입니다. ${growthText}. ${attendanceText}로 운영 리듬을 확인했고, ${cautionText}.`;
  }

  function renderProcessMilestoneBriefs(rows) {
    return `
      <section class="panel process-brief-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Milestone Briefs</span>
            <h2>마일스톤별 요약과 핵심 이슈</h2>
          </div>
          <p class="panel-copy">각 구간의 평균 프로파일, 출결 리듬, 반복 케이스, 긴급 확인 인원을 한 장의 운영 메모처럼 읽을 수 있게 정리했습니다.</p>
        </div>
        <div class="process-brief-grid">
          ${rows
            .map((row) => {
              const stats = milestoneObservedAttendanceStats(row.milestone);
              const issues = milestoneIssueSummary(row);
              const current = isCurrentMilestone(row.milestone);
              const purpose = milestoneAnalysisPurpose(row.milestone, row.index, row.aggregate);
              return `
                <button type="button" class="process-brief-card ${current ? "is-current" : ""}" data-process-view="${escape(row.milestone.id)}">
                  <div class="process-brief-head">
                    <span>M${row.index + 1}</span>
                    <strong>${escape(App.shortMilestoneLabel(row.milestone.label))}</strong>
                    ${current ? `<em>현재</em>` : ""}
                  </div>
                  <div class="process-brief-purpose">
                    <b>${escape(purpose.label)}</b>
                    <span>${escape(purpose.short)}</span>
                  </div>
                  <p>${escape(milestoneNarrative(row))}</p>
                  <div class="process-brief-metrics">
                    <span>참여 <strong>${row.aggregate.participantCount || 0}명</strong></span>
                    <span>평균 <strong>${formatNumber(row.aggregate.avgProfile, 2)}</strong></span>
                    <span>출석 <strong>${stats.attendanceRate === null ? "판단 전" : formatPercent(stats.attendanceRate, 1)}</strong></span>
                    <span>상담 <strong>${row.aggregate.eventCounts.counseling || 0}건</strong></span>
                  </div>
                  <div class="process-brief-issues">
                    ${issues.map((issue) => `<i>${escape(issue)}</i>`).join("")}
                  </div>
                </button>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function destroyOverviewCharts() {
    overviewCharts.forEach((chart) => chart.destroy());
    overviewCharts = [];
  }

  function cssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  function chartColor(tone) {
    const colors = {
      brand: cssVar("--accent"),
      success: cssVar("--success"),
      warning: cssVar("--warning"),
      danger: cssVar("--danger"),
      violet: cssVar("--violet"),
      mint: cssVar("--mint"),
      neutral: cssVar("--neutral"),
    };
    return colors[tone] || colors.neutral;
  }

  function colorWithAlpha(color, alpha) {
    if (!color) return `rgba(47, 111, 237, ${alpha})`;
    const hex = color.trim();
    if (hex.startsWith("#")) {
      const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
      const value = normalized.replace("#", "");
      const red = parseInt(value.slice(0, 2), 16);
      const green = parseInt(value.slice(2, 4), 16);
      const blue = parseInt(value.slice(4, 6), 16);
      if ([red, green, blue].every(Number.isFinite)) return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
    if (hex.startsWith("rgb(")) return hex.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    return hex;
  }

  function chartBaseOptions(extra = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: cssVar("--text"),
            boxWidth: 12,
            font: { size: 12, weight: "700" },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label || context.dataset.label || ""}: ${formatNumber(context.raw)}명`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: cssVar("--text-soft"), precision: 0 },
          grid: { color: cssVar("--border") },
        },
        y: {
          ticks: { color: cssVar("--text-soft") },
          grid: { display: false },
        },
      },
      ...extra,
    };
  }

  function createOverviewChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;
    overviewCharts.push(new window.Chart(canvas, config));
  }

  function goToStudentsByRegion(region) {
    goToStudentsWithFilters({
      status: "general",
      tag: "all",
      caseFilter: "all",
      region,
      sort: "name",
      direction: "asc",
    });
  }

  function goToStudentsByDemographic(type, value) {
    if (!type || !value) return;
    if (type === "region") {
      goToStudentsByRegion(value);
      return;
    }
    goToStudentsWithFilters({
      status: "general",
      tag: "all",
      caseFilter: "all",
      region: "all",
      demographicType: type,
      demographicValue: value,
      sort: "name",
      direction: "asc",
    });
  }

  function chartDemographicClick(type, rows) {
    return (event, elements, chart) => {
      const selected = elements && elements[0];
      if (!selected) return;
      const value = rows?.[selected.index]?.label || chart?.data?.labels?.[selected.index];
      if (value) goToStudentsByDemographic(type, value);
    };
  }

  function chartPointerHover(event, elements) {
    const target = event.native?.target;
    if (target) target.style.cursor = elements?.length ? "pointer" : "default";
  }

  function demographicLegendOptions(type) {
    return {
      ...chartBaseOptions().plugins.legend,
      onClick: (event, legendItem) => {
        if (legendItem?.text) goToStudentsByDemographic(type, legendItem.text);
      },
      onHover: (event) => {
        const target = event.native?.target;
        if (target) target.style.cursor = "pointer";
      },
      onLeave: (event) => {
        const target = event.native?.target;
        if (target) target.style.cursor = "default";
      },
    };
  }

  function goToStudentsByClassification(classification) {
    goToStudentsWithFilters({
      status: "general",
      tag: "all",
      caseFilter: "all",
      region: "all",
      classification,
      sort: "name",
      direction: "asc",
    });
  }

  function chartClassificationClick(rows) {
    return (event, elements) => {
      const selected = elements && elements[0];
      if (!selected) return;
      const row = rows[selected.index];
      if (row?.key) goToStudentsByClassification(row.key);
    };
  }

  function ensureChartFallbacks() {
    const hasChart = Boolean(window.Chart);
    document.querySelectorAll(".chart-shell").forEach((shell) => {
      let fallback = shell.querySelector(".chart-fallback");
      if (!fallback) {
        fallback = document.createElement("p");
        fallback.className = "chart-fallback";
        fallback.textContent = "Chart.js를 불러오면 차트가 표시됩니다.";
        shell.appendChild(fallback);
      }
      fallback.classList.toggle("is-visible", !hasChart);
    });
  }

  function renderOverviewCharts() {
    if (state.activePage !== "overview") return;
    destroyOverviewCharts();
    ensureChartFallbacks();
    if (!window.Chart) return;

    const students = activeCourseStudents();
    const classification = operationalClassification(students);
    createOverviewChart("overview-excellent-chart", {
      type: "bar",
      data: {
        labels: classification.excellent.map((row) => row.label),
        datasets: [
          {
            label: "인원",
            data: classification.excellent.map((row) => row.count),
            backgroundColor: classification.excellent.map((row) => chartColor(row.tone)),
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: chartBaseOptions({
        indexAxis: "y",
        onClick: chartClassificationClick(classification.excellent),
        onHover: chartPointerHover,
        plugins: {
          ...chartBaseOptions().plugins,
          legend: { display: false },
        },
      }),
    });
    createOverviewChart("overview-risk-chart", {
      type: "bar",
      data: {
        labels: classification.risk.map((row) => row.label),
        datasets: [
          {
            label: "인원",
            data: classification.risk.map((row) => row.count),
            backgroundColor: classification.risk.map((row) => chartColor(row.tone)),
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: chartBaseOptions({
        indexAxis: "y",
        onClick: chartClassificationClick(classification.risk),
        onHover: chartPointerHover,
        plugins: {
          ...chartBaseOptions().plugins,
          legend: { display: false },
        },
      }),
    });

    const ageRows = sortedCountRows(countBy(students, ageGroup));
    const genderRows = sortedCountRows(countBy(students, (student) => student.gender || "미상"));
    const educationRows = orderedCountRows(countBy(students, educationGroup), ["대학원", "대학졸업", "대학재학", "고등학교"]);
    const regionRows = orderedCountRows(countBy(students, regionGroup), ["수도권", "강원도", "충청도", "전라도", "경상도", "제주도"]);
    const regionDetails = regionDetailCounts(students);

    createOverviewChart("overview-age-chart", {
      type: "bar",
      data: {
        labels: ageRows.map((row) => row.label),
        datasets: [{ label: "인원", data: ageRows.map((row) => row.count), backgroundColor: chartColor("brand"), borderRadius: 8 }],
      },
      options: chartBaseOptions({
        onClick: chartDemographicClick("age", ageRows),
        onHover: chartPointerHover,
        plugins: { ...chartBaseOptions().plugins, legend: { display: false } },
      }),
    });
    createOverviewChart("overview-gender-chart", {
      type: "doughnut",
      data: {
        labels: genderRows.map((row) => row.label),
        datasets: [{ data: genderRows.map((row) => row.count), backgroundColor: [chartColor("brand"), chartColor("mint"), chartColor("neutral")] }],
      },
      options: chartBaseOptions({
        cutout: "62%",
        onClick: chartDemographicClick("gender", genderRows),
        onHover: chartPointerHover,
        plugins: {
          ...chartBaseOptions().plugins,
          legend: demographicLegendOptions("gender"),
        },
        scales: {},
      }),
    });
    createOverviewChart("overview-education-chart", {
      type: "bar",
      data: {
        labels: educationRows.map((row) => row.label),
        datasets: [{ label: "인원", data: educationRows.map((row) => row.count), backgroundColor: chartColor("success"), borderRadius: 8 }],
      },
      options: chartBaseOptions({
        indexAxis: "y",
        onClick: chartDemographicClick("education", educationRows),
        onHover: chartPointerHover,
        plugins: { ...chartBaseOptions().plugins, legend: { display: false } },
      }),
    });
    createOverviewChart("overview-region-chart", {
      type: "doughnut",
      data: {
        labels: regionRows.map((row) => row.label),
        datasets: [
          {
            data: regionRows.map((row) => row.count),
            backgroundColor: [
              chartColor("violet"),
              chartColor("brand"),
              chartColor("warning"),
              chartColor("danger"),
              chartColor("mint"),
              chartColor("success"),
            ],
          },
        ],
      },
      options: chartBaseOptions({
        cutout: "62%",
        onClick: chartDemographicClick("region", regionRows),
        onHover: chartPointerHover,
        plugins: {
          ...chartBaseOptions().plugins,
          legend: demographicLegendOptions("region"),
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const detail = Object.entries(regionDetails[label] || {})
                  .map(([name, count]) => `${name} ${count}명`)
                  .join(", ");
                return `${label}: ${formatNumber(context.raw)}명${detail ? ` (${detail})` : ""}`;
              },
            },
          },
        },
        scales: {},
      }),
    });
  }

  function processChartRows() {
    return observedProcessRows(App.rawData.milestones || []).map((row) => {
      const attendanceStats = milestoneObservedAttendanceStats(row.milestone);
      return {
        ...row,
        attendanceStats,
        scoreBreakdown: profileScoreAverages(row.aggregate.snapshots),
      };
    });
  }

  function renderProcessCharts() {
    if (state.activePage !== "process" || state.processView !== "overview") return;
    destroyOverviewCharts();
    ensureChartFallbacks();
    if (!window.Chart) return;

    const rows = processChartRows();
    createOverviewChart("process-overview-chart", {
      type: "line",
      data: {
        labels: rows.map((row) => `M${row.index + 1}`),
        datasets: [
          {
            type: "bar",
            label: "출석률",
            data: rows.map((row) => row.attendanceStats.attendanceRate),
            yAxisID: "percent",
            backgroundColor: colorWithAlpha(chartColor("success"), 0.18),
            borderColor: colorWithAlpha(chartColor("success"), 0.42),
            borderWidth: 1,
            borderRadius: 10,
            maxBarThickness: 34,
            order: 2,
          },
          {
            label: "평균 프로파일",
            data: rows.map((row) => row.aggregate.avgProfile || null),
            yAxisID: "score",
            borderColor: chartColor("brand"),
            backgroundColor: colorWithAlpha(chartColor("brand"), 0.16),
            pointBackgroundColor: rows.map((row) => (isCurrentMilestone(row.milestone) ? chartColor("danger") : chartColor("brand"))),
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: rows.map((row) => (isCurrentMilestone(row.milestone) ? 7 : 5)),
            pointHoverRadius: 8,
            borderWidth: 3,
            tension: 0.34,
            fill: true,
            order: 1,
          },
          {
            label: "지각률",
            data: rows.map((row) => row.attendanceStats.lateRate),
            yAxisID: "percent",
            borderColor: chartColor("warning"),
            backgroundColor: chartColor("warning"),
            borderDash: [6, 5],
            pointRadius: 3,
            borderWidth: 2,
            tension: 0.3,
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: cssVar("--text"),
              boxWidth: 12,
              font: { size: 12, weight: "700" },
            },
          },
          tooltip: {
            backgroundColor: colorWithAlpha(cssVar("--surface"), 0.96),
            borderColor: cssVar("--border"),
            borderWidth: 1,
            titleColor: cssVar("--text"),
            bodyColor: cssVar("--text"),
            padding: 12,
            callbacks: {
              title: (items) => {
                const row = rows[items[0]?.dataIndex || 0];
                return row ? `M${row.index + 1} · ${App.shortMilestoneLabel(row.milestone.label)}` : "";
              },
              label: (context) => {
                const value = Number(context.raw);
                if (!Number.isFinite(value)) return `${context.dataset.label}: 판단 전`;
                return context.dataset.yAxisID === "score"
                  ? `${context.dataset.label}: ${formatNumber(value, 2)}점`
                  : `${context.dataset.label}: ${formatPercent(value, 1)}`;
              },
              afterBody: (items) => {
                const row = rows[items[0]?.dataIndex || 0];
                if (!row) return [];
                const detailLines = row.scoreBreakdown
                  .filter((item) => Number.isFinite(Number(item.value)) && item.value > 0)
                  .map((item) => `${item.label}: ${formatNumber(item.value, 2)}점`);
                const stats = row.attendanceStats;
                return [
                  "",
                  "세부 점수",
                  ...detailLines,
                  "",
                  `참여 ${row.aggregate.participantCount || 0}명 · 결석 ${stats.absenceCount}건 · 지각 ${stats.lateCount}건 · 위험 ${stats.riskCount}건`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: cssVar("--text-soft"), font: { weight: "800" } },
            grid: { display: false },
          },
          score: {
            type: "linear",
            position: "left",
            min: 1,
            max: 4,
            ticks: { color: cssVar("--text-soft"), stepSize: 0.5 },
            grid: { color: colorWithAlpha(cssVar("--border"), 0.65) },
            title: { display: true, text: "프로파일 점수", color: cssVar("--text-soft"), font: { weight: "800" } },
          },
          percent: {
            type: "linear",
            position: "right",
            min: 0,
            max: 100,
            ticks: {
              color: cssVar("--text-soft"),
              callback: (value) => `${value}%`,
            },
            grid: { drawOnChartArea: false },
            title: { display: true, text: "출결 비율", color: cssVar("--text-soft"), font: { weight: "800" } },
          },
        },
      },
    });
  }

  function renderMilestoneDetailCharts() {
    if (state.activePage !== "process" || state.processView === "overview") return;
    destroyOverviewCharts();
    ensureChartFallbacks();
    if (!window.Chart) return;

    const milestone = (App.rawData.milestones || []).find((item) => item.id === state.processView);
    if (!milestone) return;
    const rows = milestoneTimelineRows(milestone);
    createOverviewChart("milestone-rate-chart", {
      type: "line",
      data: {
        labels: rows.map((row) => row.label),
        datasets: [
          {
            label: "출석률",
            data: rows.map((row) => row.attendanceRate),
            borderColor: chartColor("success"),
            backgroundColor: colorWithAlpha(chartColor("success"), 0.16),
            borderWidth: 3,
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.32,
            fill: true,
          },
          {
            label: "지각률",
            data: rows.map((row) => row.lateRate),
            borderColor: chartColor("warning"),
            backgroundColor: chartColor("warning"),
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 3,
            tension: 0.28,
          },
          {
            label: "위험출결률",
            data: rows.map((row) => row.riskRate),
            borderColor: chartColor("danger"),
            backgroundColor: chartColor("danger"),
            borderWidth: 2,
            borderDash: [2, 4],
            pointRadius: 3,
            tension: 0.28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: cssVar("--text"),
              boxWidth: 12,
              font: { size: 12, weight: "700" },
            },
          },
          tooltip: {
            backgroundColor: colorWithAlpha(cssVar("--surface"), 0.96),
            borderColor: cssVar("--border"),
            borderWidth: 1,
            titleColor: cssVar("--text"),
            bodyColor: cssVar("--text"),
            padding: 12,
            callbacks: {
              label: (context) => {
                const value = Number(context.raw);
                return Number.isFinite(value) ? `${context.dataset.label}: ${formatPercent(value, 1)}` : `${context.dataset.label}: 판단 전`;
              },
              afterBody: (items) => {
                const row = rows[items[0]?.dataIndex || 0];
                if (!row) return [];
                return [
                  "",
                  `운영일 ${row.dateCount}일 · 대상 ${row.participantCount}명`,
                  `결석 ${row.absenceCount}건 · 지각 ${row.lateCount}건 · 위험 ${row.riskCount}건`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: cssVar("--text-soft"), maxRotation: 0, autoSkip: true, maxTicksLimit: 5 },
            grid: { display: false },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              color: cssVar("--text-soft"),
              callback: (value) => `${value}%`,
            },
            grid: { color: colorWithAlpha(cssVar("--border"), 0.7) },
          },
        },
      },
    });
  }

  function render() {
    document.body.dataset.page = "lobby";
    appRoot.dataset.activePage = state.activePage;
    if (searchInput && searchInput.value !== state.query) searchInput.value = state.query;
    App.setTheme(state.theme, themeToggle);
    syncTopNav();
    destroyOverviewCharts();

    if (state.activePage === "process") appRoot.innerHTML = renderProcessPage();
    else if (state.activePage === "students") appRoot.innerHTML = renderStudentsPage();
    else if (state.activePage === "feedback") appRoot.innerHTML = renderFeedbackPage();
    else appRoot.innerHTML = renderOverviewPage();
    if (state.activePage === "overview") requestAnimationFrame(renderOverviewCharts);
    if (state.activePage === "process" && state.processView === "overview") requestAnimationFrame(renderProcessCharts);
    if (state.activePage === "process" && state.processView !== "overview") requestAnimationFrame(renderMilestoneDetailCharts);
  }

  function syncTopNav() {
    document.querySelectorAll("[data-page-link]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.pageLink === state.activePage);
    });
  }

  function updateBridgePreview() {
    const preview = document.querySelector("[data-bridge-preview]");
    if (preview) preview.textContent = JSON.stringify(buildFeedbackBridge(currentFeedbackStudent()), null, 2);
  }

  function handleSort(key) {
    if (state.sortKey === key) {
      state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDirection = key === "name" || key === "status" || key === "tag" ? "asc" : "desc";
    }
    render();
  }

  function goToStudentsWithFilters({
    status = "all",
    tag = "all",
    caseFilter = "all",
    region = "all",
    demographicType = "all",
    demographicValue = "all",
    classification = "all",
    sort = "name",
    direction = "asc",
  }) {
    state.statusFilter = status;
    state.activeTag = tag;
    state.activeCase = caseFilter;
    state.regionFilter = region;
    state.demographicFilterType = demographicType;
    state.demographicFilterValue = demographicValue;
    state.classificationFilter = classification;
    state.sortKey = sort;
    state.sortDirection = direction;
    state.activePage = "students";
    if (window.location.hash !== "#students") {
      window.location.hash = "#students";
    } else {
      render();
    }
  }

  function resetStudentFilters() {
    state.statusFilter = "all";
    state.activeTag = "all";
    state.activeCase = "all";
    state.regionFilter = "all";
    state.demographicFilterType = "all";
    state.demographicFilterValue = "all";
    state.classificationFilter = "all";
    state.sortKey = "name";
    state.sortDirection = "asc";
    state.query = "";
    if (searchInput) searchInput.value = "";
    if (quickSearch) {
      quickSearch.innerHTML = "";
      quickSearch.classList.remove("is-visible");
    }
    render();
  }

  async function handleFileUpload(file) {
    if (!file) return;
    state.feedbackFileName = file.name;
    state.feedbackFileMeta = {
      name: file.name,
      size: file.size,
      type: file.type || "unknown",
      lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : "",
    };
    const textLike = /text|json|csv|markdown/.test(file.type) || /\.(txt|md|json|csv)$/i.test(file.name);
    if (textLike) {
      state.submissionText = await file.text();
    } else {
      state.submissionText = `[${file.name}] 파일이 등록되었습니다. DOCX/PDF 본문 추출은 추후 파일 파서 또는 서버 API 연동 단계에서 처리해야 합니다.`;
    }
    render();
  }

  appRoot.addEventListener("click", (event) => {
    const sortButton = event.target.closest("[data-table-sort]");
    if (sortButton) {
      handleSort(sortButton.dataset.tableSort);
      return;
    }

    const tagButton = event.target.closest("[data-tag]");
    if (tagButton) {
      state.activeTag = tagButton.dataset.tag || "all";
      state.activeCase = "all";
      render();
      return;
    }

    const statusButton = event.target.closest("[data-status-filter]");
    if (statusButton) {
      state.statusFilter = statusButton.dataset.statusFilter || "all";
      state.activeCase = "all";
      render();
      return;
    }

    const operationalFilterButton = event.target.closest("[data-operational-filter]");
    if (operationalFilterButton) {
      goToStudentsByClassification(operationalFilterButton.dataset.operationalFilter || "all");
      return;
    }

    const overviewFilterButton = event.target.closest("[data-student-filter-action]");
    if (overviewFilterButton) {
      goToStudentsWithFilters({
        status: overviewFilterButton.dataset.filterStatus || "all",
        tag: overviewFilterButton.dataset.filterTag || "all",
        caseFilter: overviewFilterButton.dataset.filterCase || "all",
        classification: overviewFilterButton.dataset.filterClassification || "all",
        sort: overviewFilterButton.dataset.filterSort || "name",
        direction: overviewFilterButton.dataset.filterDirection || "asc",
      });
      return;
    }

    if (event.target.closest("[data-reset-student-filters]")) {
      resetStudentFilters();
      return;
    }

    const processButton = event.target.closest("[data-process-view]");
    if (processButton) {
      navigateProcessView(processButton.dataset.processView || "overview");
      return;
    }

    const milestoneTabButton = event.target.closest("[data-milestone-tab]");
    if (milestoneTabButton) {
      state.milestoneTab = milestoneTabButton.dataset.milestoneTab || "milestone";
      render();
      return;
    }

    if (event.target.closest("[data-build-bridge]")) {
      state.feedbackOutput = JSON.stringify(buildFeedbackBridge(currentFeedbackStudent()), null, 2);
      render();
      return;
    }

    if (event.target.closest("[data-generate-local-feedback]")) {
      state.feedbackOutput = generateLocalFeedbackDraft(currentFeedbackStudent());
      render();
    }
  });

  appRoot.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-feedback-student]")) {
      state.feedbackStudentId = target.value;
      state.feedbackOutput = "";
      render();
    } else if (target.matches("[data-feedback-type]")) {
      state.feedbackType = target.value;
      updateBridgePreview();
    } else if (target.matches("[data-feedback-provider]")) {
      state.feedbackProvider = target.value;
      updateBridgePreview();
    } else if (target.matches("[data-feedback-file]")) {
      handleFileUpload(target.files?.[0]);
    }
  });

  appRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("[data-feedback-model]")) {
      state.feedbackModel = target.value;
      updateBridgePreview();
    } else if (target.matches("[data-feedback-api-key]")) {
      state.feedbackApiKey = target.value;
    } else if (target.matches("[data-feedback-submission]")) {
      state.submissionText = target.value;
      updateBridgePreview();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value;
      App.renderQuickSearch(quickSearch, state.query);
      if (state.activePage === "students") render();
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      const first = App.quickSearchResults(state.query)[0];
      if (first) window.location.href = App.studentPageHref(first.id);
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      App.setTheme(state.theme, themeToggle);
      if (state.activePage === "overview") requestAnimationFrame(renderOverviewCharts);
      if (state.activePage === "process" && state.processView === "overview") requestAnimationFrame(renderProcessCharts);
      if (state.activePage === "process" && state.processView !== "overview") requestAnimationFrame(renderMilestoneDetailCharts);
    });
  }

  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    state.activePage = route.page;
    state.processView = route.processView;
    state.milestoneTab = "milestone";
    render();
  });

  render();
})();
