/* ============================================
   PROGRESS MANAGER — ProgressManager
   Progress/completion calculations.
   Respects:
   - showIf conditions (branch engine)
   - spaceActivation (excluded spaces)
   ============================================ */

const ProgressManager = (function () {
  'use strict';

  // Required questions in a space that are currently visible
  function getSpaceProgress(spaceId) {
    const space = AppState.getSpaceData(spaceId);
    if (!space) return { answered: 0, total: 0 };
    let total = 0, answered = 0;
    space.sections.forEach(sec => {
      AppState.getVisibleQuestions(sec).forEach(q => {
        if (q.required) {
          total++;
          if (AppState.hasAnswer(q.id)) answered++;
        }
      });
    });
    return { answered, total };
  }

  function isSpaceComplete(spaceId) {
    const { answered, total } = getSpaceProgress(spaceId);
    return total > 0 && answered >= total;
  }

  // Count all answered questions in a section (visible only)
  function getSectionAnswerCount(section) {
    return AppState.getVisibleQuestions(section)
      .filter(q => AppState.hasAnswer(q.id)).length;
  }

  // Total answered across all active spaces (visible questions only)
  function getTotalAnswered() {
    let count = 0;
    AppState.getActiveSpaces().forEach(sp =>
      sp.sections.forEach(sec =>
        AppState.getVisibleQuestions(sec).forEach(q => {
          if (AppState.hasAnswer(q.id)) count++;
        })
      )
    );
    return count;
  }

  // Overall required progress across all active spaces (visible only)
  function getOverallProgress() {
    let total = 0;
    let answered = 0;
    AppState.getActiveSpaces().forEach(sp =>
      sp.sections.forEach(sec =>
        AppState.getVisibleQuestions(sec).forEach(q => {
          if (!q.required) return;
          total++;
          if (AppState.hasAnswer(q.id)) answered++;
        })
      )
    );
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { answered, total, pct };
  }

  return {
    getSpaceProgress,
    isSpaceComplete,
    getSectionAnswerCount,
    getTotalAnswered,
    getOverallProgress
  };
})();
