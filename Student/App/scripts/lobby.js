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
      label: "종합우수",
      short: "종합",
      tone: "success",
      description: "전반 지표가 고르게 높고 과정 적응이 안정적인 학생",
    },
    growth_high: {
      label: "성장우수",
      short: "성장",
      tone: "brand",
      description: "초기 대비 성장 곡선이 뚜렷한 학생",
    },
    support_priority: {
      label: "집중지원",
      short: "지원",
      tone: "danger",
      description: "개입, 상담, 리듬 회복을 우선 확인할 학생",
    },
    collaboration_strength: {
      label: "협업강점",
      short: "협업",
      tone: "mint",
      description: "체크인, 회고, 역할 수행에서 협업 신호가 좋은 학생",
    },
    career_progress: {
      label: "진로준비",
      short: "진로",
      tone: "violet",
      description: "목적, 강점, 자기 색깔이 진로 문서에 드러나는 학생",
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

  const TABLE_COLUMNS = [
    { key: "name", label: "학생", type: "text" },
    { key: "status", label: "상태", type: "text" },
    { key: "tag", label: "운영 분류", type: "text" },
    { key: "profile", label: "종합", type: "number" },
    { key: "growth", label: "성장", type: "number" },
    { key: "support", label: "지원", type: "number" },
    { key: "collaboration", label: "협업", type: "number" },
    { key: "career", label: "진로", type: "number" },
    { key: "attendanceRisk", label: "위험출결", type: "number" },
    { key: "projectRate", label: "제출률", type: "number" },
  ];

  const initialRoute = routeFromHash();

  const state = {
    theme: App.getSavedTheme(),
    query: "",
    activePage: initialRoute.page,
    processView: initialRoute.processView,
    activeTag: "all",
    statusFilter: "all",
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
    const values = items.map(mapper).map(Number).filter((value) => Number.isFinite(value));
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function tagMeta(tag) {
    return TAG_COPY[tag] || TAG_COPY.steady_path;
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

  function studentSortValue(student, key) {
    const derived = student.derived || {};
    const stats = student.stats || {};
    const primaryTag = derived.primaryTag || "steady_path";
    const values = {
      name: student.name || "",
      status: statusLabel(student),
      tag: tagMeta(primaryTag).label,
      profile: derived.profileRankScore || derived.profileIndex || 0,
      growth: derived.growthRankScore || derived.growthIndex || 0,
      support: derived.supportRankScore || derived.supportIndex || 0,
      collaboration: derived.collaborationRankScore || derived.collaborationReadiness?.collaborationReadinessScore || 0,
      career: derived.careerRankScore || derived.careerReadiness?.careerReadinessScore || 0,
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

    if (query) {
      students = students.filter((student) => App.studentSearchPool(student).includes(query));
    }

    const column = TABLE_COLUMNS.find((item) => item.key === state.sortKey) || TABLE_COLUMNS[0];
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
    if (/대학원|석사|박사/.test(education)) return "대학원";
    if (/전문대/.test(education)) return "전문대";
    if (/대학교|대학|학과|전공/.test(education)) return "대학교";
    if (/고등|검정/.test(education)) return "고졸/검정";
    return "기타";
  }

  function regionGroup(student) {
    const address = String(student.address || "");
    if (!address.trim()) return "미상";
    if (/서울|경기|인천/.test(address)) return "수도권";
    return "비수도권";
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
        <div class="course-progress-facts">
          <span>${progress.currentWeek}/${progress.totalWeeks}주차</span>
          <span>${progress.completedSessions}/${progress.totalSessions} 세션 진행</span>
          <span>${progress.elapsedDays}/${progress.totalDays}일</span>
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
    const educationRows = sortedCountRows(countBy(students, educationGroup));
    const regionRows = sortedCountRows(countBy(students, regionGroup));
    return `
      <section class="panel demographics-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Cohort Snapshot</span>
            <h2>이번 기수 기본 통계</h2>
          </div>
        </div>
        <div class="demographic-grid">
          ${renderBreakdownCard("나이", ageRows, students.length)}
          ${renderBreakdownCard("성별", genderRows, students.length)}
          ${renderBreakdownCard("학력", educationRows, students.length)}
          ${renderBreakdownCard("지역", regionRows, students.length)}
        </div>
      </section>
    `;
  }

  function renderCaseLibraryOverview() {
    const rows = App.rawData.dashboard?.learningCaseLibrary || [];
    return `
      <section class="panel learning-case-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Observed Cases</span>
            <h2>현재까지 파악된 학생 특징</h2>
          </div>
        </div>
        <div class="learning-case-summary-grid">
          ${rows
            .slice(0, 7)
            .map(
              (row) => `
                <article class="learning-case-summary ${App.toneClass(row.severityCounts?.warning ? "warning" : "neutral")}">
                  <strong>${escape(row.label)}</strong>
                  <span>${row.count}명</span>
                  <p>${escape(row.description)}</p>
                  <small>${escape((row.examples || []).slice(0, 3).map((item) => item.studentName).join(", "))}</small>
                </article>
              `
            )
            .join("") || `<article class="learning-case-summary"><p>아직 수집된 복합 케이스가 없습니다.</p></article>`}
        </div>
      </section>
    `;
  }

  function renderOverviewPage() {
    const courseStudents = activeCourseStudents();
    const counts = statusCounts();
    const avgProfile = average(courseStudents, (student) => student.derived?.profileIndex);
    const avgGrowth = average(courseStudents, (student) => student.derived?.growthIndex);
    const avgProject = average(courseStudents, (student) => student.stats?.projectSubmissionRate);
    return `
      <section class="overview-hero">
        ${renderCourseProgressCard()}
        <div class="hero-stats overview-stats">
          ${renderMetric("전체", `${counts.all}명`, "등록된 전체 학생", "neutral")}
          ${renderMetric("일반", `${counts.general}명`, "과정 진행 중", "success")}
          ${renderMetric("과정이탈", `${counts.dropout}명`, "분포에는 포함, 일반에서는 제외", "neutral")}
          ${renderMetric("평균 종합", formatNumber(avgProfile, 1), "진행 학생 기준", "brand")}
          ${renderMetric("제출률", formatPercent(avgProject, 1), `평균 성장 ${formatNumber(avgGrowth, 1)}`, "mint")}
        </div>
      </section>
      ${renderDistributionDiagram(courseStudents)}
      ${renderDemographics(courseStudents)}
      ${renderCaseLibraryOverview()}
    `;
  }

  function milestoneAggregate(milestone) {
    const students = activeCourseStudents();
    const snapshots = students
      .map((student) => student.milestones?.find((item) => item.id === milestone.id))
      .filter(Boolean);
    const eventCounts = snapshots.reduce(
      (acc, item) => {
        Object.entries(item.eventCounts || {}).forEach(([key, value]) => {
          acc[key] = (acc[key] || 0) + (Number(value) || 0);
        });
        return acc;
      },
      { attendance: 0, attendanceRisk: 0, counseling: 0, project: 0, career: 0 }
    );
    const caseRows = students.flatMap((student) =>
      (student.learningFlowCases || [])
        .filter((item) => overlaps(item.startDate, item.endDate, milestone.startDate, milestone.endDate))
        .map((item) => ({ ...item, studentName: student.name }))
    );
    const caseCounts = sortedCountRows(countBy(caseRows, (item) => item.label));
    const cautionCounts = sortedCountRows(countBy(snapshots.flatMap((item) => item.cautionKeys || []), (key) => PROFILE_LABELS[key] || key));
    return {
      snapshots,
      eventCounts,
      caseRows,
      caseCounts,
      cautionCounts,
      avgProfile: average(snapshots, (item) => item.profileAverage),
      avgGrowth: average(snapshots, (item) => item.growthDelta),
    };
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
                <span>${escape(milestone.label)}</span>
              </button>
            `
          )
          .join("")}
      </nav>
    `;
  }

  function renderProcessOverviewGraph(rows) {
    const width = 980;
    const height = 300;
    const paddingX = 64;
    const paddingY = 44;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;
    const currentId = currentMilestoneId(rows.map((row) => row.milestone));
    const points = rows.map((row, index) => {
      const x = paddingX + (rows.length === 1 ? chartWidth / 2 : (index / (rows.length - 1)) * chartWidth);
      const score = clamp(Number(row.aggregate.avgProfile) || 1, 1, 4);
      const y = paddingY + ((4 - score) / 3) * chartHeight;
      return { ...row, x, y, score, isCurrentPoint: row.milestone.id === currentId };
    });
    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    const areaPath = `${linePath} L ${points.at(-1)?.x || paddingX} ${height - paddingY} L ${points[0]?.x || paddingX} ${height - paddingY} Z`;
    return `
      <section class="panel process-overview-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Process Overview</span>
            <h2>과정 개요</h2>
          </div>
          <p class="panel-copy">전체 마일스톤의 평균 프로파일 변화를 한눈에 보고, 현재 시점은 강조 포인트로 표시합니다.</p>
        </div>
        <div class="process-graph-wrap">
          <svg class="process-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="마일스톤별 평균 프로파일 변화 그래프">
            <defs>
              <linearGradient id="processAreaGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.22"></stop>
                <stop offset="100%" stop-color="currentColor" stop-opacity="0.02"></stop>
              </linearGradient>
            </defs>
            ${[1, 2, 3, 4]
              .map((score) => {
                const y = paddingY + ((4 - score) / 3) * chartHeight;
                return `
                  <line class="process-grid-line" x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}"></line>
                  <text class="process-axis-label" x="${paddingX - 18}" y="${y + 4}">${score}</text>
                `;
              })
              .join("")}
            <path class="process-area" d="${areaPath}"></path>
            <path class="process-line" d="${linePath}"></path>
            ${points
              .map(
                (point) => `
                  <g class="process-point ${point.isCurrentPoint ? "is-current" : ""}">
                    <circle cx="${point.x}" cy="${point.y}" r="${point.isCurrentPoint ? 11 : 7}"></circle>
                    <text x="${point.x}" y="${point.y - 18}">${formatNumber(point.score, 2)}</text>
                    <text class="process-point-label" x="${point.x}" y="${height - 14}">M${point.index + 1}</text>
                  </g>
                `
              )
              .join("")}
          </svg>
        </div>
        <div class="process-overview-summary-grid">
          ${points
            .map(
              (point) => `
                <button type="button" class="process-summary-card ${point.isCurrentPoint ? "is-current" : ""}" data-process-view="${escape(point.milestone.id)}">
                  <span>M${point.index + 1}</span>
                  <strong>${escape(point.milestone.label)}</strong>
                  <small>${escape(App.formatRange(point.milestone.startDate, point.milestone.endDate))}</small>
                  <em>평균 ${formatNumber(point.score, 2)}</em>
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
    const rows = processRows(milestones);
    const currentId = currentMilestoneId(milestones);
    const currentRow = rows.find((row) => row.milestone.id === currentId) || rows[0];
    const progress = courseProgress();
    const avgProfile = average(activeCourseStudents(), (student) => student.derived?.profileIndex);
    const totalEvents = rows.reduce(
      (acc, row) => {
        Object.entries(row.aggregate.eventCounts || {}).forEach(([key, value]) => {
          acc[key] = (acc[key] || 0) + (Number(value) || 0);
        });
        return acc;
      },
      { project: 0, counseling: 0, attendanceRisk: 0, career: 0 }
    );
    return `
      <section class="process-overview-hero">
        ${renderMetric("진행률", formatPercent(progress.percent), `${progress.currentWeek}/${progress.totalWeeks}주차`, "brand")}
        ${renderMetric("현재 구간", currentRow ? `M${currentRow.index + 1}` : "-", currentRow?.milestone.label || "현재 구간 없음", "success")}
        ${renderMetric("평균 프로파일", formatNumber(avgProfile, 1), "진행 학생 기준", "mint")}
        ${renderMetric("프로젝트 기록", `${totalEvents.project || 0}건`, `상담 ${totalEvents.counseling || 0}건`, "violet")}
        ${renderMetric("위험 출결", `${totalEvents.attendanceRisk || 0}건`, "늦잠 지각/무단 결석 기준", "warning")}
      </section>
      ${renderProcessOverviewGraph(rows)}
      <section class="process-timeline compact">
        ${rows.map((row) => renderProcessStage(row.milestone, row.index)).join("")}
      </section>
    `;
  }

  function renderProcessStage(milestone, index) {
    const aggregate = milestoneAggregate(milestone);
    const eventCounts = aggregate.eventCounts;
    const current = isCurrentMilestone(milestone);
    return `
      <article class="process-stage-card ${current ? "is-current" : ""}">
        <div class="process-stage-index">${index + 1}</div>
        <div class="process-stage-main">
          <div class="process-stage-head">
            <div>
              <span>${escape(App.formatRange(milestone.startDate, milestone.endDate))}${milestone.isEstimated ? " · 예정" : ""}</span>
              <h3>${escape(milestone.label)}</h3>
            </div>
            ${current ? `<strong class="current-badge">현재 구간</strong>` : ""}
          </div>
          <div class="process-stage-stats">
            <span>평균 프로필 ${formatNumber(aggregate.avgProfile, 2)}</span>
            <span>성장 변화 ${aggregate.avgGrowth >= 0 ? "+" : ""}${formatNumber(aggregate.avgGrowth, 2)}</span>
            <span>프로젝트 ${eventCounts.project || 0}건</span>
            <span>상담 ${eventCounts.counseling || 0}건</span>
            <span>위험출결 ${eventCounts.attendanceRisk || 0}건</span>
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
      { key: "project", label: "프로젝트", tone: "brand" },
      { key: "counseling", label: "상담", tone: "violet" },
      { key: "attendance", label: "출결", tone: "warning" },
      { key: "attendanceRisk", label: "위험출결", tone: "danger" },
      { key: "career", label: "진로", tone: "mint" },
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

  function renderMilestoneStudentSamples(milestone) {
    const samples = activeCourseStudents()
      .map((student) => ({
        student,
        snapshot: student.milestones?.find((item) => item.id === milestone.id),
        cases: (student.learningFlowCases || []).filter((item) => overlaps(item.startDate, item.endDate, milestone.startDate, milestone.endDate)),
      }))
      .filter((item) => item.snapshot)
      .sort((a, b) => {
        const caseDelta = b.cases.length - a.cases.length;
        if (caseDelta) return caseDelta;
        return (a.snapshot.profileAverage || 0) - (b.snapshot.profileAverage || 0);
      })
      .slice(0, 8);
    return `
      <div class="milestone-student-sample-list">
        ${samples
          .map(
            ({ student, snapshot, cases }) => `
              <a href="${App.studentPageHref(student.id)}" class="milestone-student-sample">
                <strong>${escape(student.name)}</strong>
                <span>평균 ${formatNumber(snapshot.profileAverage, 2)} · 성장 ${snapshot.growthDelta >= 0 ? "+" : ""}${formatNumber(snapshot.growthDelta, 2)}</span>
                <small>${escape(cases[0]?.label || snapshot.note || "특이 케이스 없음")}</small>
              </a>
            `
          )
          .join("") || `<p class="empty-state compact">표시할 학생 기록이 없습니다.</p>`}
      </div>
    `;
  }

  function renderMilestonePager(index) {
    const milestones = App.rawData.milestones || [];
    const previous = milestones[index - 1];
    const next = milestones[index + 1];
    return `
      <nav class="milestone-pager" aria-label="마일스톤 이동">
        <button type="button" class="soft-action" data-process-view="overview">과정 개요</button>
        <button type="button" class="soft-action" data-process-view="${escape(previous?.id || "")}" ${previous ? "" : "disabled"}>
          이전 ${previous ? `M${index}` : ""}
        </button>
        <button type="button" class="primary-action" data-process-view="${escape(next?.id || "")}" ${next ? "" : "disabled"}>
          다음 ${next ? `M${index + 2}` : ""}
        </button>
      </nav>
    `;
  }

  function renderMilestoneDetail(milestone, index) {
    if (!milestone) return `<section class="panel"><p class="empty-state">선택된 마일스톤을 찾을 수 없습니다.</p></section>`;
    const aggregate = milestoneAggregate(milestone);
    const eventCounts = aggregate.eventCounts;
    const current = isCurrentMilestone(milestone);
    const caseExamples = aggregate.caseRows
      .slice()
      .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")))
      .slice(0, 8);
    return `
      <section class="panel milestone-detail-hero ${current ? "is-current" : ""}">
        <div class="milestone-detail-title">
          <span>M${index + 1}${current ? " · 현재 구간" : ""}</span>
          <h2>${escape(milestone.label)}</h2>
          <p>${escape(App.formatRange(milestone.startDate, milestone.endDate))}${milestone.isEstimated ? " · 예정/추정 구간" : ""}</p>
          ${renderMilestonePager(index)}
        </div>
        <div class="milestone-detail-metrics">
          ${renderMetric("평균 프로파일", formatNumber(aggregate.avgProfile, 2), `${aggregate.snapshots.length}명 기준`, "brand")}
          ${renderMetric("성장 변화", `${aggregate.avgGrowth >= 0 ? "+" : ""}${formatNumber(aggregate.avgGrowth, 2)}`, "이전 구간 대비 평균", "success")}
          ${renderMetric("프로젝트", `${eventCounts.project || 0}건`, `진로 ${eventCounts.career || 0}건`, "mint")}
          ${renderMetric("상담/출결", `${eventCounts.counseling || 0}/${eventCounts.attendance || 0}건`, `위험출결 ${eventCounts.attendanceRisk || 0}건`, "warning")}
        </div>
      </section>
      <section class="milestone-detail-grid">
        <article class="panel milestone-detail-card">
          <div class="panel-head compact">
            <div>
              <span class="panel-kicker">Event Mix</span>
              <h2>구간 기록 구성</h2>
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
        <article class="panel milestone-detail-card">
          <div class="panel-head compact">
            <div>
              <span class="panel-kicker">Watch Areas</span>
              <h2>관찰 영역</h2>
            </div>
          </div>
          ${renderCountList(aggregate.cautionCounts, "뚜렷한 관찰 영역이 없습니다.")}
        </article>
      </section>
      <section class="panel milestone-case-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Case Examples</span>
            <h2>학생별 케이스 예시</h2>
          </div>
          <p class="panel-copy">선택한 구간과 날짜가 겹치는 복합 케이스를 먼저 보여줍니다.</p>
        </div>
        <div class="milestone-case-list">
          ${caseExamples.length
            ? caseExamples
                .map(
                  (item) => `
                    <article class="learning-case-summary ${App.toneClass(item.severity === "warning" ? "warning" : item.severity === "success" ? "success" : "neutral")}">
                      <strong>${escape(item.studentName)} · ${escape(item.label)}</strong>
                      <span>${escape(item.startDate || "-")}</span>
                      <p>${escape(item.summary)}</p>
                      <small>${escape((item.evidence || []).slice(0, 3).join(" · "))}</small>
                    </article>
                  `
                )
                .join("")
            : `<p class="empty-state">이 구간에 연결된 복합 케이스 예시가 없습니다.</p>`}
        </div>
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
          <p class="panel-copy">각 단계는 학생 프로필 변화, 프로젝트 기록, 상담, 출결, 복합 케이스를 시간순으로 묶어 보여줍니다.</p>
        </div>
        ${renderProcessSubnav(milestones)}
      </section>
      ${state.processView === "overview" ? renderProcessOverview() : renderMilestoneDetail(selectedMilestone, selectedIndex)}
    `;
  }

  function renderStatusFilter() {
    const counts = statusCounts();
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
    const students = App.rawData.students.filter((student) => state.statusFilter === "all" || statusGroup(student) === state.statusFilter);
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

  function sortGlyph(key) {
    if (state.sortKey !== key) return "";
    return state.sortDirection === "asc" ? " ▲" : " ▼";
  }

  function renderStudentRow(student) {
    const derived = student.derived || {};
    const stats = student.stats || {};
    const primaryTag = derived.primaryTag || "steady_path";
    return `
      <tr data-student-id="${escape(student.id)}">
        <td>
          <a class="student-name-link" href="${App.studentPageHref(student.id)}">${escape(student.name)}</a>
          <small>${escape(student.education || "학력 미기재")}</small>
        </td>
        <td>${statusPill(statusGroup(student))}</td>
        <td>${tagPill(primaryTag)}</td>
        <td>${formatNumber(derived.profileRankScore || derived.profileIndex, 1)}</td>
        <td>${formatNumber(derived.growthRankScore || derived.growthIndex, 1)}</td>
        <td>${formatNumber(derived.supportRankScore || derived.supportIndex, 1)}</td>
        <td>${formatNumber(derived.collaborationRankScore || derived.collaborationReadiness?.collaborationReadinessScore, 1)}</td>
        <td>${formatNumber(derived.careerRankScore || derived.careerReadiness?.careerReadinessScore, 1)}</td>
        <td>${stats.attendanceRiskIssues || 0}</td>
        <td>${formatPercent(stats.projectSubmissionRate || 0, 1)}</td>
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
      ${renderStatusFilter()}
      ${renderCategoryOverview()}
      <section class="panel student-management-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Student Management</span>
            <h2>학생 리스트와 상태 데이터</h2>
          </div>
          <p class="panel-copy">학생은 기본 가나다순이며, 표 머리글의 수치를 누르면 해당 값으로 정렬됩니다.</p>
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
          question: "지원 직무와 진로 목적이 구체적으로 드러나는가?",
        },
        {
          key: "strength_awareness",
          label: "자기 강점 인식",
          question: "자신의 강점과 근거 경험을 스스로 이해하고 있는가?",
        },
        {
          key: "personal_color",
          label: "자기 스타일/색깔",
          question: "다른 지원자와 구분되는 관점, 취향, 문제 해결 방식이 보이는가?",
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
        "협업 평가는 프로젝트 데일리체크인, 회고, 역할 수행을 중심으로 참고한다.",
        "진로 평가는 문서 제출량보다 목적, 강점, 자기 스타일의 선명도를 우선한다.",
        "병가와 건강형 출결은 태도 문제가 아니라 건강 관리 신호로 분리한다.",
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
          profile: derived.profileRankScore,
          growth: derived.growthRankScore,
          support: derived.supportRankScore,
          collaboration: derived.collaborationRankScore,
          career: derived.careerRankScore,
        },
        stats: student.stats || {},
        careerReadiness: derived.careerReadiness || {},
        collaborationReadiness: {
          ...(derived.collaborationReadiness || {}),
          interpretation: "협업은 반복 팀원이나 선호/비선호가 아니라 체크인, 회고, 역할 수행, 지각 여부를 중심으로 해석합니다.",
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
      `${student.name} 학생은 현재 '${tag}' 분류로 보고 있으며, 자기소개서에서는 목적의 명확성, 자기 강점, 자기만의 스타일이 학생 데이터와 맞게 드러나는지 우선 확인합니다.`,
      "",
      "## 데이터상 먼저 볼 지점",
      `- 진로 목적성 점수: ${formatNumber(career.careerReadinessScore || bridge.student.rankScores.career, 1)}`,
      `- 목적 명확성: ${formatNumber(career.purposeClarity, 1)} / 강점 인식: ${formatNumber(career.selfStrengthAwareness, 1)} / 자기 색깔: ${formatNumber(career.personalColor, 1)}`,
      `- 주요 케이스: ${(bridge.student.learningFlowCases || []).slice(0, 3).map((item) => item.label).join(", ") || "특이 케이스 없음"}`,
      "",
      "## 피드백 방향",
      "1. 지원동기 첫 문단에서 직무 목적을 더 빠르게 드러냅니다.",
      "2. 강점은 성격 표현보다 프로젝트, 회고, 문서 수정 이력 같은 근거와 연결합니다.",
      "3. 자기만의 색깔은 취향 나열이 아니라 문제를 바라보는 방식으로 정리합니다.",
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

  function render() {
    document.body.dataset.page = "lobby";
    appRoot.dataset.activePage = state.activePage;
    if (searchInput && searchInput.value !== state.query) searchInput.value = state.query;
    App.setTheme(state.theme, themeToggle);
    syncTopNav();

    if (state.activePage === "process") appRoot.innerHTML = renderProcessPage();
    else if (state.activePage === "students") appRoot.innerHTML = renderStudentsPage();
    else if (state.activePage === "feedback") appRoot.innerHTML = renderFeedbackPage();
    else appRoot.innerHTML = renderOverviewPage();
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
      render();
      return;
    }

    const statusButton = event.target.closest("[data-status-filter]");
    if (statusButton) {
      state.statusFilter = statusButton.dataset.statusFilter || "all";
      render();
      return;
    }

    const processButton = event.target.closest("[data-process-view]");
    if (processButton) {
      navigateProcessView(processButton.dataset.processView || "overview");
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
    });
  }

  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    state.activePage = route.page;
    state.processView = route.processView;
    render();
  });

  render();
})();
