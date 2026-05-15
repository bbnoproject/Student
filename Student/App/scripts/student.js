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
    activeCriterion: "",
  };

  function currentStudent() {
    return App.studentById(state.studentId) || App.rawData.students[0] || null;
  }

  function renderStudentHeader(student) {
    const primaryMeta = App.TAG_META[student.derived?.primaryTag] || App.TAG_META.steady_path;
    const profileAverage = App.averageScore(student.currentProfile);
    return `
      <section class="hero-panel student-hero">
        <div class="student-hero-top">
          <a class="back-link" href="${App.lobbyPageHref()}">과정 개요로 돌아가기</a>
          <div class="pill-row">
            ${App.managementStatusBadge(student.managementStatus)}
            <span class="status-badge ${App.toneClass(App.statusTone(student.stats?.currentStatus))}">
              ${App.escapeHtml(student.stats?.currentStatus || "-")}
            </span>
            ${App.tagBadge(student.derived?.primaryTag)}
            ${
              state.studentTab === "management"
                ? `<button type="button" class="secondary-action compact-action" data-tab="dashboard">개요로 돌아가기</button>`
                : `<button type="button" class="primary-action compact-action" data-tab="management">정보 수정</button>`
            }
          </div>
        </div>

        <section class="student-basic-panel">
          <div class="student-summary-head">
            <div>
              <p class="eyebrow">개인정보 개요</p>
              <h2>${App.escapeHtml(student.name)}</h2>
              <p class="student-intro">${App.escapeHtml(primaryMeta.description)}</p>
            </div>
            <div class="compact-profile-score">
              <span>프로파일 평균</span>
              <strong>${App.escapeHtml(profileAverage.toFixed(2))}</strong>
            </div>
          </div>

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
      </section>
    `;
  }

  function renderStudentDashboard(student) {
    const actualMilestones = (student.milestones || []).filter((milestone) => !milestone.isEstimated);
    const collaborationReadiness = student.derived?.collaborationReadiness || {};
    return `
      <section class="snapshot-grid compact-snapshot-grid">
        ${App.metricCard("현재 상태", student.stats?.currentStatus || "-", "현재 운영 신호", App.statusTone(student.stats?.currentStatus))}
        ${App.metricCard("관리 상태", student.managementStatus || "일반", student.managementStatus === "이탈" ? "관리 제외, 통계 포함" : "현재 관리 분류", App.statusTone(student.managementStatus))}
        ${App.metricCard("프로젝트 제출률", `${student.stats?.projectSubmissionRate || 0}%`, "프로젝트 데일리 기록 기준", "brand")}
        ${App.metricCard("출결 기록", `${student.stats?.attendanceIssues || 0}건`, `늦잠/무단 ${student.stats?.attendanceRiskIssues || 0}건 · 건강 ${student.stats?.healthAttendanceIssues || 0}건`, "warning")}
        ${App.metricCard("면담", `${student.stats?.counselingCount || 0}건`, "기록된 전체 면담 수", "mint")}
        ${App.metricCard("프로젝트 협업", `${Math.round(collaborationReadiness.collaborationReadinessScore || 0)}점`, `변화 ${collaborationReadiness.trajectory?.label || "유지"} ${collaborationReadiness.trajectory?.delta || 0}`, "violet")}
      </section>

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Status Reason</span>
            <h3>현재 상태 판단 이유</h3>
          </div>
          <p class="panel-copy">${App.escapeHtml(student.currentProfile?.note || "최근 운영 해석 없음")}</p>
        </div>
        <div class="reason-box">
          <strong>${App.escapeHtml(student.stats?.currentStatus || "안정")}</strong>
          <p>${App.escapeHtml(App.statusReason(student))}</p>
        </div>
      </section>

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Dashboard</span>
            <h3>현재 능력치와 성향 프로파일</h3>
          </div>
          <p class="panel-copy">6개 교육학 준거와 근거 문장을 함께 읽습니다.</p>
        </div>
        ${App.renderProfileReasonBars(student)}
      </section>

      ${App.renderCollaborationTrajectory(student)}

      ${App.renderLearningFlowCases(student)}

      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Timeline</span>
            <h3>마일스톤 성장 곡선</h3>
          </div>
          <p class="panel-copy">아직 진행되지 않은 추정 구간은 제외합니다.</p>
        </div>
        ${App.growthChart(actualMilestones)}
        <div class="milestone-analysis-list">
          ${actualMilestones
            .map(
              (milestone, index) => `
                <article class="milestone-analysis-row ${milestone.growthDelta > 0 ? "is-up" : milestone.growthDelta < 0 ? "is-down" : ""}">
                  <div class="milestone-analysis-name">
                    <span class="milestone-index">M${index + 1}</span>
                    <strong>${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}</strong>
                    <small>${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</small>
                  </div>
                  <div class="milestone-score-row">
                    <strong>${App.escapeHtml(milestone.profileAverage.toFixed(2))}</strong>
                    <span class="growth-chip ${milestone.growthDelta > 0 ? "is-up" : milestone.growthDelta < 0 ? "is-down" : ""}">
                      ${milestone.growthDelta > 0 ? "+" : ""}${App.escapeHtml(milestone.growthDelta.toFixed(2))}
                    </span>
                  </div>
                  <p>${App.escapeHtml(milestone.note)} ${App.escapeHtml(App.milestoneStory(milestone))}</p>
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
            <p><strong>관리 상태:</strong> ${App.escapeHtml(student.managementStatus || "일반")}</p>
            <p><strong>강점:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.strengthKeys))}</p>
            <p><strong>관찰:</strong> ${App.escapeHtml(App.profileKeyText(student.derived?.cautionKeys))}</p>
            <p><strong>최신 면담:</strong> ${App.escapeHtml(App.formatDate(student.stats?.latestCounselingDate))}</p>
            <p><strong>협업 흐름:</strong> 체크인 정시율 ${App.escapeHtml(String(collaborationReadiness.checkinOnTimeRate || 0))}% · 회고 ${App.escapeHtml(String(collaborationReadiness.retroCount || 0))}건 · 변화 ${App.escapeHtml(String(collaborationReadiness.trajectory?.label || "유지"))}</p>
            <p><strong>진로 문서:</strong> ${App.escapeHtml(String(student.stats?.careerDocumentRounds || 0))}회</p>
          </div>
          ${App.renderClassificationReasons(student)}
        </section>
      </section>
    `;
  }

  function formValue(student, key) {
    return App.escapeHtml(student.manual?.[key] ?? student[key] ?? "");
  }

  function renderStudentManagement(student) {
    const manual = student.manual || {};
    return `
      <section class="panel section-panel">
        <div class="panel-head">
          <div>
            <span class="panel-kicker">Profile Editor</span>
            <h3>학생 정보 입력 및 수정</h3>
          </div>
          <button type="button" class="secondary-action compact-action" data-tab="dashboard">개요로 돌아가기</button>
        </div>
        <p class="panel-copy">이 페이지에서 저장한 값은 이 브라우저의 로컬 편집값으로 보관되고, 홈 통계와 검색에 즉시 반영됩니다.</p>

        <form id="student-edit-form" class="student-edit-form">
          <section class="edit-form-section">
            <div class="edit-section-head">
              <h4>기본 정보</h4>
              ${App.managementStatusBadge(student.managementStatus)}
            </div>
            <div class="edit-form-grid">
              <label>
                <span>이름</span>
                <input name="name" type="text" value="${formValue(student, "name")}" />
              </label>
              <label>
                <span>성별</span>
                <input name="gender" type="text" value="${formValue(student, "gender")}" />
              </label>
              <label>
                <span>생년월일</span>
                <input name="birthDate" type="date" value="${formValue(student, "birthDate")}" />
              </label>
              <label>
                <span>연락처</span>
                <input name="phone" type="tel" value="${formValue(student, "phone")}" />
              </label>
              <label>
                <span>거주지역</span>
                <input name="address" type="text" value="${formValue(student, "address")}" />
              </label>
              <label>
                <span>학력</span>
                <input name="education" type="text" value="${formValue(student, "education")}" />
              </label>
              <label>
                <span>과정</span>
                <input name="course" type="text" value="${formValue(student, "course")}" />
              </label>
              <label>
                <span>기수</span>
                <input name="cohort" type="text" value="${formValue(student, "cohort")}" />
              </label>
            </div>
          </section>

          <section class="edit-form-section">
            <div class="edit-section-head">
              <h4>관리 분류</h4>
              <p>이탈 학생은 통계에는 남기고 기본 관리 대상 집계에서는 제외합니다.</p>
            </div>
            <div class="edit-form-grid">
              <label>
                <span>학생 상태</span>
                <select name="managementStatus">
                  ${Object.entries(App.MANAGEMENT_STATUS_META)
                    .map(
                      ([status, meta]) => `
                        <option value="${App.escapeHtml(status)}" ${student.managementStatus === status ? "selected" : ""}>
                          ${App.escapeHtml(meta.label)}
                        </option>
                      `
                    )
                    .join("")}
                </select>
              </label>
              <label>
                <span>취업처</span>
                <input name="employmentCompany" type="text" value="${App.escapeHtml(manual.employmentCompany || "")}" />
              </label>
              <label>
                <span>직무/역할</span>
                <input name="employmentRole" type="text" value="${App.escapeHtml(manual.employmentRole || "")}" />
              </label>
              <label>
                <span>취업일</span>
                <input name="employmentDate" type="date" value="${App.escapeHtml(manual.employmentDate || "")}" />
              </label>
              <label>
                <span>이탈일</span>
                <input name="dropoutDate" type="date" value="${App.escapeHtml(manual.dropoutDate || "")}" />
              </label>
              <label>
                <span>이탈 사유</span>
                <input name="dropoutReason" type="text" value="${App.escapeHtml(manual.dropoutReason || "")}" />
              </label>
            </div>
          </section>

          <section class="edit-form-section">
            <div class="edit-section-head">
              <h4>운영 메모</h4>
              <p>관리자가 수기로 남기는 참고 정보입니다.</p>
            </div>
            <label class="wide-field">
              <span>특이사항</span>
              <textarea name="specialNote" rows="3">${formValue(student, "specialNote")}</textarea>
            </label>
            <label class="wide-field">
              <span>관리 메모</span>
              <textarea name="managementMemo" rows="5">${App.escapeHtml(manual.managementMemo || "")}</textarea>
            </label>
          </section>

          <div class="form-actions">
            <button type="submit" class="primary-action">저장</button>
            <button type="button" class="secondary-action" data-reset-edit>원본으로 되돌리기</button>
          </div>
        </form>
      </section>

      <section class="snapshot-grid">
        ${App.metricCard("관리 상태", student.managementStatus || "일반", App.MANAGEMENT_STATUS_META[student.managementStatus]?.description || "관리 분류", App.statusTone(student.managementStatus))}
        ${App.metricCard("취업 정보", manual.employmentCompany || "-", manual.employmentRole || "입력된 직무 정보 없음", "violet")}
        ${App.metricCard("이탈 정보", manual.dropoutDate || "-", manual.dropoutReason || "입력된 이탈 사유 없음", "neutral")}
      </section>
    `;
  }

  function renderCriterionModal() {
    if (!state.activeCriterion) return "";
    const criterion = App.PROFILE_CRITERIA[state.activeCriterion];
    if (!criterion) return "";
    const label = App.PROFILE_LABELS[state.activeCriterion] || "평가 준거";
    return `
      <div class="modal-backdrop" data-close-modal>
        <section class="criteria-modal" role="dialog" aria-modal="true" aria-label="${App.escapeHtml(label)} 판단기준">
          <div class="modal-head">
            <div>
              <span class="panel-kicker">Evaluation Criteria</span>
              <h3>${App.escapeHtml(label)}</h3>
            </div>
            <button type="button" class="icon-button" data-close-modal aria-label="닫기">×</button>
          </div>
          <div class="criteria-body">
            <p><strong>핵심 질문</strong>${App.escapeHtml(criterion.question)}</p>
            <p><strong>주요 데이터</strong>${App.escapeHtml(criterion.evidence)}</p>
            <p><strong>루브릭 평가</strong>${App.escapeHtml(criterion.rubric)}</p>
            <p><strong>평정 척도</strong>${App.escapeHtml(criterion.rating)}</p>
            <p><strong>판정 유의</strong>${App.escapeHtml(criterion.caution)}</p>
            <p><strong>점수 해석</strong>1점은 관찰과 지원이 시급한 수준, 2점은 형성 중인 수준, 3점은 기대 수행에 도달한 수준, 4점은 전이와 확장이 가능한 수준으로 봅니다.</p>
          </div>
        </section>
      </div>
    `;
  }

  function renderMilestoneDetailCard(milestone, index) {
    return `
      <article class="detail-milestone-card">
        <div class="detail-milestone-head">
          <div>
            <span class="milestone-index">M${index + 1}</span>
            <h4>${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}</h4>
            <p class="milestone-period">${App.escapeHtml(App.formatRange(milestone.startDate, milestone.endDate))}</p>
          </div>
          <div class="detail-milestone-side">
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
    const milestones = (student.milestones || []).filter((milestone) => !milestone.isEstimated);
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
                  ${App.escapeHtml(App.shortMilestoneLabel(milestone.label))}
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

      ${
        state.studentTab === "dashboard"
          ? renderStudentDashboard(student)
          : state.studentTab === "management"
            ? renderStudentManagement(student)
            : renderStudentDetail(student)
      }
      ${renderCriterionModal()}
    `;
  }

  function render() {
    const student = currentStudent();
    document.body.dataset.page = "student";
    document.title = student ? `${student.name} | 학생 분석 대시보드` : "학생 분석 대시보드";
    App.renderQuickSearch(quickSearch, state.query);
    appRoot.innerHTML = renderStudentPage(student);
  }

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("#student-edit-form");
    if (!form) return;
    event.preventDefault();

    const student = currentStudent();
    if (!student) return;

    const formData = new FormData(form);
    const payload = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = String(value || "").trim();
    }

    App.saveStudentEdit(student.id, payload);
    render();
  });

  document.addEventListener("click", (event) => {
    const criterionButton = event.target.closest("[data-criterion]");
    if (criterionButton) {
      state.activeCriterion = criterionButton.getAttribute("data-criterion") || "";
      render();
      return;
    }

    const closeModal = event.target.closest("[data-close-modal]");
    if (closeModal && (event.target === closeModal || event.target.closest(".icon-button"))) {
      state.activeCriterion = "";
      render();
      return;
    }

    const resetButton = event.target.closest("[data-reset-edit]");
    if (resetButton) {
      const student = currentStudent();
      if (!student) return;
      App.clearStudentEdit(student.id);
      render();
      return;
    }

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
