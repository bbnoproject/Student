(function () {
  const App = window.StudentAppCommon;
  const appRoot = document.getElementById("app-root");
  const searchInput = document.getElementById("global-search");
  const quickSearch = document.getElementById("quick-search");
  const themeToggle = document.getElementById("theme-toggle");

  const fallbackStudentId = App.rawData.students[0]?.id || "";

  const state = {
    theme: App.getSavedTheme(),
    query: "",
    studentId: App.getQueryParam("id") || fallbackStudentId,
    studentTab: "dashboard",
    detailMilestoneId: "all",
  };

  function currentStudent() {
    return App.studentById(state.studentId) || App.rawData.students[0] || null;
  }

  function renderStudentHeader(student) {
    const primaryMeta = App.TAG_META[student.derived?.primaryTag] || App.TAG_META.steady_path;
    const profileScore = Math.round(student.derived?.profileIndex || App.averageScore(student.currentProfile) * 25);
    return `
      <section class="hero-panel student-hero">
        <div class="student-hero-top">
          <a class="back-link" href="${App.lobbyPageHref()}">메인 로비로 돌아가기</a>
          <div class="pill-row">
            <span class="status-badge ${App.toneClass(App.statusTone(student.stats?.currentStatus))}">
              ${App.escapeHtml(student.stats?.currentStatus || "-")}
            </span>
            ${App.tagBadge(student.derived?.primaryTag)}
          </div>
        </div>

        <div class="student-hero-grid">
          <section class="student-basic-panel">
            <p class="eyebrow">Student Page</p>
            <h2>${App.escapeHtml(student.name)}</h2>
            <p class="student-intro">${App.escapeHtml(primaryMeta.description)}</p>

            <div class="student-basic-grid">
              <div><span>성별</span><strong>${App.escapeHtml(student.gender || "-")}</strong></div>
              <div><span>생년월일</span><strong>${App.escapeHtml(App.formatDate(student.birthDate))}</strong></div>
              <div><span>거주지역</span><strong>${App.escapeHtml(student.address || "-")}</strong></div>
              <div><span>연락처</span><strong>${App.escapeHtml(student.phone || "-")}</strong></div>
              <div><span>학력</span><strong>${App.escapeHtml(student.education || "-")}</strong></div>
              <div><span>과정/기수</span><strong>${App.escapeHtml(`${student.course || "-"} / ${student.cohort || "-"}`)}</strong></div>
            </div>

            <div class="pill-row">
              ${App.domainPills(student.derived?.strengthKeys, "강점 추출 없음")}
              ${App.domainPills(student.derived?.cautionKeys, "관찰 없음")}
            </div>
          </section>

          <section class="student-profile-panel">
            <div class="profile-score-ring">
              <span>종합 프로파일</span>
              <strong>${App.escapeHtml(String(profileScore))}</strong>
            </div>
            ${App.radarChart(student.currentProfile)}
            <p class="student-profile-copy">
              최신 해석: ${App.escapeHtml(student.currentProfile?.note || "-")}
            </p>
          </section>
        </div>
      </section>
    `;
  }

  function renderStudentDashboard(student) {
    return `
      <section class="snapshot-grid">
        ${App.metricCard("현재 상태", student.stats?.currentStatus || "-", "현재 운영 신호", App.statusTone(student.stats?.currentStatus))}
        ${App.metricCard("프로젝트 제출률", `${student.stats?.projectSubmissionRate || 0}%`, "프로젝트 데일리 기록 기준", "brand")}
        ${App.metricCard("출결 기록", `${student.stats?.attendanceIssues || 0}건`, `판단 반영 위험 ${student.stats?.attendanceRiskIssues || 0}건`, "warning")}
        ${App.metricCard("면담", `${student.stats?.counselingCount || 0}건`, "기록된 전체 면담 수", "mint")}
        ${App.metricCard("반복 협업 팀원", `${student.stats?.repeatedPeerCount || 0}명`, "두 번 이상 함께한 팀원", "violet")}
        ${App.metricCard("진로 문서 라운드", `${student.stats?.careerDocumentRounds || 0}회`, "이력서/자기소개 학습 이력", "neutral")}
      </section>

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Dashboard</span>
            <h3>현재 능력치와 성향 프로파일</h3>
          </div>
          <p class="panel-copy">6개 교육학 준거를 동시에 읽습니다.</p>
        </div>
        ${App.renderProfileBars(student.currentProfile)}
      </section>

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Timeline</span>
            <h3>마일스톤 성장 곡선</h3>
          </div>
          <p class="panel-copy">모집부터 종강까지 6개 마일스톤 기준</p>
        </div>
        ${App.growthChart(student.milestones || [])}
        <div class="milestone-row">
          ${(student.milestones || [])
            .map(
              (milestone, index) => `
                <article class="milestone-card ${milestone.growthDelta > 0 ? "is-up" : milestone.growthDelta < 0 ? "is-down" : ""}">
                  <div class="milestone-head">
                    <span class="milestone-index">M${index + 1}</span>
                    ${milestone.isEstimated ? `<span class="pill tone-warning">추정 구간</span>` : ""}
                  </div>
                  <h4>${App.escapeHtml(milestone.label)}</h4>
                  <p class="milestone-period">${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</p>
                  <div class="milestone-score-row">
                    <strong>${App.escapeHtml(milestone.profileAverage.toFixed(2))}</strong>
                    <span class="growth-chip ${milestone.growthDelta > 0 ? "is-up" : milestone.growthDelta < 0 ? "is-down" : ""}">
                      ${milestone.growthDelta > 0 ? "+" : ""}${App.escapeHtml(milestone.growthDelta.toFixed(2))}
                    </span>
                  </div>
                  <p class="milestone-note">${App.escapeHtml(milestone.note)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Growth Story</span>
            <h3>마일스톤별 성장 스토리</h3>
          </div>
          <p class="panel-copy">그래프를 운영 해석으로 번역한 카드입니다.</p>
        </div>
        <div class="story-grid">
          ${(student.milestones || [])
            .map(
              (milestone, index) => `
                <article class="story-card">
                  <div class="story-head">
                    <span class="story-index">M${index + 1}</span>
                    <strong>${App.escapeHtml(milestone.label)}</strong>
                  </div>
                  <p class="story-copy">${App.escapeHtml(App.milestoneStory(milestone))}</p>
                  <div class="pill-row">
                    ${App.domainPills(milestone.strengthKeys, "강점 없음")}
                    ${App.domainPills(milestone.cautionKeys, "관찰 없음")}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="two-column-grid">
        <section class="panel section-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">Recent Events</span>
              <h3>최근 주요 이벤트</h3>
            </div>
          </div>
          <div class="event-list">
            ${App.recentEventCards(student)}
          </div>
        </section>

        <section class="panel section-panel">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">Interpretation</span>
              <h3>현재 해석 포인트</h3>
            </div>
          </div>
          <div class="interpretation-card">
            <p><strong>주 분류:</strong> ${App.escapeHtml(App.primaryMetaLabel(student))}</p>
            <p><strong>강점:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.strengthKeys))}</p>
            <p><strong>관찰:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.cautionKeys))}</p>
            <p><strong>최신 면담:</strong> ${App.escapeHtml(App.formatDate(student.stats?.latestCounselingDate))}</p>
            <p><strong>반복 협업 팀원:</strong> ${App.escapeHtml(String(student.stats?.repeatedPeerCount || 0))}명</p>
            <p><strong>진로 문서:</strong> ${App.escapeHtml(String(student.stats?.careerDocumentRounds || 0))}회</p>
          </div>
        </section>
      </section>
    `;
  }

  function renderMilestoneDetailCard(milestone, index) {
    return `
      <article class="detail-milestone-card">
        <div class="detail-milestone-head">
          <div>
            <span class="milestone-index">M${index + 1}</span>
            <h4>${App.escapeHtml(milestone.label)}</h4>
            <p class="milestone-period">${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</p>
          </div>
          <div class="detail-milestone-side">
            ${milestone.isEstimated ? `<span class="pill tone-warning">추정 경계</span>` : ""}
            <span class="score-chip tone-brand">${App.escapeHtml(milestone.profileAverage.toFixed(2))}</span>
          </div>
        </div>

        <div class="detail-milestone-grid">
          <div class="detail-block">
            <span class="mini-label">핵심 해석</span>
            <p>${App.escapeHtml(milestone.note)}</p>
          </div>
          <div class="detail-block">
            <span class="mini-label">변화량</span>
            <p>${milestone.growthDelta > 0 ? "+" : ""}${App.escapeHtml(milestone.growthDelta.toFixed(2))}</p>
          </div>
          <div class="detail-block">
            <span class="mini-label">이벤트 수</span>
            <p>
              출결 기록 ${App.escapeHtml(String(milestone.eventCounts.attendance))}건 / 위험 ${App.escapeHtml(String(milestone.eventCounts.attendanceRisk || 0))}건 / 프로젝트 ${App.escapeHtml(String(milestone.eventCounts.project))}건 /
              면담 ${App.escapeHtml(String(milestone.eventCounts.counseling))}건
            </p>
          </div>
          <div class="detail-block">
            <span class="mini-label">강점과 관찰</span>
            <div class="pill-row">
              ${App.domainPills(milestone.strengthKeys, "강점 없음")}
              ${App.domainPills(milestone.cautionKeys, "관찰 없음")}
            </div>
          </div>
        </div>

        <div class="detail-section-grid">
          <section class="detail-section-card">
            <h5>학생 이벤트 히스토리</h5>
            <div class="detail-event-list">
              ${milestone.events.length
                ? milestone.events
                    .map(
                      (event) => `
                        <article class="detail-event-item">
                          <div class="event-head">
                            <strong>${App.escapeHtml(event.title)}</strong>
                            <span class="event-meta">${App.escapeHtml(App.formatDate(event.date))}</span>
                          </div>
                          <p>${App.escapeHtml(event.summary)}</p>
                        </article>
                      `
                    )
                    .join("")
                : `<div class="empty-state compact">이 구간에 연결된 대표 이벤트가 없습니다.</div>`}
            </div>
          </section>

          <section class="detail-section-card">
            <h5>운영 메모용 요약</h5>
            <p>${App.escapeHtml(App.milestoneStory(milestone))}</p>
            <p>프로젝트 역할 기록: ${App.escapeHtml(milestone.roles.length ? milestone.roles.join(", ") : "없음")}</p>
            <p>진로 문서 라운드: ${App.escapeHtml(String(milestone.careerRoundCount || 0))}회</p>
          </section>
        </div>
      </article>
    `;
  }

  function renderStudentDetail(student) {
    const milestones = student.milestones || [];
    const visibleMilestones =
      state.detailMilestoneId === "all"
        ? milestones
        : milestones.filter((milestone) => milestone.id === state.detailMilestoneId);

    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Detail</span>
            <h3>마일스톤별 상세 정보</h3>
          </div>
          <p class="panel-copy">특이사항, 히스토리, 운영 메모를 구간별로 모아봅니다.</p>
        </div>
        <div class="chip-filter-row">
          <button type="button" class="filter-chip ${state.detailMilestoneId === "all" ? "is-active" : ""}" data-milestone="all">전체 구간</button>
          ${milestones
            .map(
              (milestone, index) => `
                <button
                  type="button"
                  class="filter-chip ${state.detailMilestoneId === milestone.id ? "is-active" : ""}"
                  data-milestone="${App.escapeHtml(milestone.id)}"
                >
                  M${index + 1}
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <div class="detail-milestone-stack">
        ${visibleMilestones.map((milestone) => renderMilestoneDetailCard(milestone, milestones.indexOf(milestone))).join("")}
      </div>
    `;
  }

  function renderStudentPage(student) {
    if (!student) {
      return `<div class="empty-state">학생 데이터를 불러오지 못했습니다.</div>`;
    }

    return `
      ${renderStudentHeader(student)}

      <nav class="student-tabs">
        <button type="button" class="tab-chip ${state.studentTab === "dashboard" ? "is-active" : ""}" data-tab="dashboard">대시보드</button>
        <button type="button" class="tab-chip ${state.studentTab === "detail" ? "is-active" : ""}" data-tab="detail">상세정보</button>
      </nav>

      ${state.studentTab === "dashboard" ? renderStudentDashboard(student) : renderStudentDetail(student)}
    `;
  }

  function render() {
    const student = currentStudent();
    document.body.dataset.page = "student";
    document.title = student ? `${student.name} | 학생 분석 대시보드` : "학생 분석 대시보드";
    App.renderQuickSearch(quickSearch, state.query);
    appRoot.innerHTML = renderStudentPage(student);
  }

  document.addEventListener("click", (event) => {
    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      state.studentTab = tabButton.getAttribute("data-tab") || "dashboard";
      render();
      return;
    }

    const milestoneButton = event.target.closest("[data-milestone]");
    if (milestoneButton) {
      state.detailMilestoneId = milestoneButton.getAttribute("data-milestone") || "all";
      render();
    }
  });

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value || "";
    App.renderQuickSearch(quickSearch, state.query);
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
