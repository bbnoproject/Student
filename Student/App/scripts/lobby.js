(function () {
  const App = window.StudentAppCommon;
  const appRoot = document.getElementById("app-root");
  const searchInput = document.getElementById("global-search");
  const quickSearch = document.getElementById("quick-search");
  const themeToggle = document.getElementById("theme-toggle");

  const state = {
    theme: App.getSavedTheme(),
    query: "",
    activeTag: "all",
    managementStatus: "general",
    sortKey: "profile",
  };

  function filteredStudents() {
    const query = state.query.trim().toLowerCase();
    let students = [...App.rawData.students];

    if (state.managementStatus === "general") {
      students = students.filter((student) => !App.hasDropoutRecord(student));
    } else if (state.managementStatus === "dropout") {
      students = students.filter((student) => App.hasDropoutRecord(student));
    }

    if (state.activeTag !== "all") {
      students = students.filter((student) => (student.derived?.tags || []).includes(state.activeTag));
    }

    if (query) {
      students = students.filter((student) => App.studentSearchPool(student).includes(query));
    }

    const sortKey = App.SORT_OPTIONS[state.sortKey]?.key || App.SORT_OPTIONS.profile.key;
    students.sort((a, b) => (b.derived?.[sortKey] || 0) - (a.derived?.[sortKey] || 0));
    return students;
  }

  function renderRankList(title, items, tone) {
    return `
      <section class="panel spotlight-panel">
        <div class="panel-head">
          <span class="panel-kicker">학생 분류</span>
          <h3>${App.escapeHtml(title)}</h3>
        </div>
        <div class="spotlight-list">
          ${items
            .map(
              (item) => `
                <a class="spotlight-item" href="${App.studentPageHref(item.id)}">
                  <div class="spotlight-main">
                    <strong>${App.escapeHtml(item.name)}</strong>
                    <div class="pill-row">
                      ${App.tagBadge(item.primaryTag)}
                    </div>
                  </div>
                  <div class="spotlight-side">
                    <span class="score-chip ${App.toneClass(tone)}">${App.escapeHtml(String(Math.round(item.score)))}</span>
                    <span class="spotlight-caption">${App.domainPills(item.strengthKeys?.slice(0, 1), "관찰")}</span>
                  </div>
                </a>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderLobbyStudentCard(student) {
    const primaryMeta = App.TAG_META[student.derived?.primaryTag] || App.TAG_META.steady_path;
    const managementStatus = App.effectiveManagementStatus(student);
    return `
      <a class="student-tile" href="${App.studentPageHref(student.id)}">
        <div class="student-tile-head">
          <div>
            <span class="tile-name">${App.escapeHtml(student.name)}</span>
            <p class="tile-copy">${App.escapeHtml(student.education || "학력 정보 없음")}</p>
          </div>
          <span class="status-badge ${App.toneClass(App.statusTone(student.stats?.currentStatus))}">
            ${App.escapeHtml(student.stats?.currentStatus || "-")}
          </span>
          ${App.managementStatusBadge(managementStatus)}
        </div>
        <div class="pill-row">
          ${App.tagBadge(student.derived?.primaryTag)}
          ${App.domainPills(student.derived?.strengthKeys?.slice(0, 1), "관찰")}
        </div>
        <div class="student-tile-grid">
          <div>
            <span class="mini-label">종합 프로파일</span>
            <strong>${App.escapeHtml(String(student.derived?.profileIndex || 0))}</strong>
          </div>
          <div>
            <span class="mini-label">성장 곡선</span>
            <strong>${App.escapeHtml(String(student.derived?.growthIndex || 0))}</strong>
          </div>
          <div>
            <span class="mini-label">출결 기록</span>
            <strong>${App.escapeHtml(String(student.stats?.attendanceIssues || 0))}건</strong>
          </div>
          <div>
            <span class="mini-label">프로젝트 제출률</span>
            <strong>${App.escapeHtml(String(student.stats?.projectSubmissionRate || 0))}%</strong>
          </div>
        </div>
        <p class="tile-summary">관리 상태: ${App.escapeHtml(App.managementStatusLabel(managementStatus))}</p>
        <p class="tile-summary">${App.escapeHtml(primaryMeta.description)}</p>
      </a>
    `;
  }

  function renderLobby() {
    const dashboard = App.rawData.dashboard || {};
    const students = filteredStudents();
    const activeSort = App.SORT_OPTIONS[state.sortKey];
    const total = dashboard.studentCount || App.rawData.students.length;
    const managedTotal = dashboard.managedStudentCount ?? App.rawData.students.filter((student) => !App.hasDropoutRecord(student)).length;

    return `
      <section class="hero-panel lobby-hero">
        <div class="hero-copy">
          <p class="eyebrow">Main Lobby</p>
          <h2>메인 로비 = 전체 학생 대시보드</h2>
          <p>학생 검색, 분류, 비교를 한 화면에서 빠르게 확인합니다.</p>
        </div>
        <div class="hero-stats">
          ${App.metricCard("전체 학생", `${total}명`, "현재 분석 대상 전체 학생 수", "brand")}
          ${App.metricCard("관리 대상", `${managedTotal}명`, "이탈을 제외하고 현재 관리가 필요한 학생", "success")}
          ${App.metricCard("일반", `${dashboard.generalCount || 0}명`, "일반 교육 운영 대상 학생", "mint")}
          ${App.metricCard("취업", `${dashboard.employedCount || 0}명`, "취업 또는 채용 연계 확인 학생", "violet")}
          ${App.metricCard("과정이탈", `${dashboard.dropoutCount || 0}명`, "관리 제외 상태지만 통계에 포함되는 학생", "neutral")}
        </div>
      </section>

      <section class="panel control-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Filter & Sort</span>
            <h3>학생 필터와 정렬</h3>
          </div>
          <p class="panel-copy">${App.escapeHtml(activeSort.label)} 기준으로 정렬 중</p>
        </div>
        <div class="chip-filter-row">
          <button type="button" class="filter-chip ${state.managementStatus === "general" ? "is-active" : ""}" data-management="general">일반 인원</button>
          <button type="button" class="filter-chip ${state.managementStatus === "dropout" ? "is-active" : ""}" data-management="dropout">과정이탈 인원</button>
          <button type="button" class="filter-chip ${state.managementStatus === "all" ? "is-active" : ""}" data-management="all">전체 인원</button>
        </div>
        <div class="chip-filter-row">
          <button type="button" class="filter-chip ${state.activeTag === "all" ? "is-active" : ""}" data-tag="all">전체</button>
          ${Object.entries(App.TAG_META)
            .map(
              ([tag, meta]) => `
                <button type="button" class="filter-chip ${state.activeTag === tag ? "is-active" : ""}" data-tag="${App.escapeHtml(tag)}">
                  ${App.escapeHtml(meta.label)}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="chip-filter-row">
          ${Object.entries(App.SORT_OPTIONS)
            .map(
              ([key, meta]) => `
                <button type="button" class="sort-chip ${state.sortKey === key ? "is-active" : ""}" data-sort="${App.escapeHtml(key)}">
                  ${App.escapeHtml(meta.label)}
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="spotlight-grid">
        ${renderRankList("종합 우수 학생", dashboard.topOverall || [], "success")}
        ${renderRankList("성장 우수 학생", dashboard.topGrowth || [], "brand")}
        ${renderRankList("집중 지원 필요", dashboard.supportPriority || [], "danger")}
        ${renderRankList("협업 강점 학생", dashboard.collaborationStrength || [], "mint")}
        ${renderRankList("진로 준비 진전", dashboard.careerProgress || [], "violet")}
      </section>

      <section class="panel scatter-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Comparison Map</span>
            <h3>전체 학생 분포</h3>
          </div>
          <p class="panel-copy">좌우는 성장 곡선, 상하는 현재 프로파일입니다.</p>
        </div>
        ${App.scatterPlot(students)}
      </section>

      <section class="panel student-grid-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Student List</span>
            <h3>학생 선택</h3>
          </div>
          <p class="panel-copy">${App.escapeHtml(String(students.length))}명의 학생이 현재 필터에 포함됩니다.</p>
        </div>
        <div class="student-grid">
          ${students.length
            ? students.map((student) => renderLobbyStudentCard(student)).join("")
            : `<div class="empty-state">검색 또는 필터 조건에 맞는 학생이 없습니다.</div>`}
        </div>
      </section>
    `;
  }

  function render() {
    document.body.dataset.page = "lobby";
    document.title = "학생 분석 대시보드";
    App.renderQuickSearch(quickSearch, state.query);
    appRoot.innerHTML = renderLobby();
  }

  document.addEventListener("click", (event) => {
    const managementButton = event.target.closest("[data-management]");
    if (managementButton) {
      state.managementStatus = managementButton.getAttribute("data-management") || "general";
      render();
      return;
    }

    const tagButton = event.target.closest("[data-tag]");
    if (tagButton) {
      state.activeTag = tagButton.getAttribute("data-tag") || "all";
      render();
      return;
    }

    const sortButton = event.target.closest("[data-sort]");
    if (sortButton) {
      state.sortKey = sortButton.getAttribute("data-sort") || "profile";
      render();
      return;
    }
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    render();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const [firstResult] = App.quickSearchResults(state.query);
    if (!firstResult) return;
    window.location.href = App.studentPageHref(firstResult.id);
  });

  themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    App.setTheme(state.theme, themeToggle);
  });

  App.setTheme(state.theme, themeToggle);
  render();
})();
