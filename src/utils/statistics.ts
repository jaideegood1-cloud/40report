import { FormSetId, SurveySubmissionPayload } from '../types/survey';

export interface CategoryStats {
  id: string;
  no: number;
  title: string;
  category: string;
  count: number;
  mean: number;
  standardDeviation: number;
  favorablePercent: number; // 4 or 5
  distribution: { [level: number]: number };
}

export function calculateMean(values: number[]): number {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && v >= 1 && v <= 5);
  if (valid.length === 0) return 0;
  return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
}

export function calculateSD(values: number[], mean: number): number {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && v >= 1 && v <= 5);
  if (valid.length <= 1) return 0;
  const variance = valid.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (valid.length - 1);
  return Number(Math.sqrt(variance).toFixed(2));
}

export function calculateFavorablePercent(values: number[]): number {
  const valid = values.filter((v) => typeof v === 'number' && !isNaN(v) && v >= 1 && v <= 5);
  if (valid.length === 0) return 0;
  const count45 = valid.filter((v) => v >= 4).length;
  return Number(((count45 / valid.length) * 100).toFixed(1));
}

export function calculateDistribution(values: number[]): { [level: number]: number } {
  const dist: { [level: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  values.forEach((v) => {
    if (v >= 1 && v <= 5) {
      dist[v] = (dist[v] || 0) + 1;
    }
  });
  return dist;
}

export function computeSurveyStats(
  submissions: SurveySubmissionPayload[],
  filterSet?: FormSetId | 'all'
) {
  const filtered = filterSet && filterSet !== 'all'
    ? submissions.filter((s) => s.form_set === filterSet)
    : submissions;

  const totalCount = filtered.length;

  const byFormSet: { [key in FormSetId]: number } = {
    1: submissions.filter((s) => s.form_set === 1).length,
    2: submissions.filter((s) => s.form_set === 2).length,
    3: submissions.filter((s) => s.form_set === 3).length,
    4: submissions.filter((s) => s.form_set === 4).length,
  };

  // Collect all ratings from filtered (including Set 1 work_ratings and Set 3 comm_ratings)
  const allScores: number[] = [];
  filtered.forEach((sub) => {
    const vals = [
      ...Object.values(sub.ratings || {}),
      ...Object.values(sub.work_ratings || {}),
      ...Object.values(sub.comm_ratings || {}),
    ];
    vals.forEach((val) => {
      const num = Number(val);
      if (typeof num === 'number' && !isNaN(num) && num >= 1 && num <= 5) {
        allScores.push(num);
      }
    });
  });

  const overallMean = calculateMean(allScores);
  const overallFavorablePercent = calculateFavorablePercent(allScores);

  return {
    totalCount,
    byFormSet,
    overallMean,
    overallFavorablePercent,
    filteredSubmissions: filtered,
  };
}

export function generateSampleData(): SurveySubmissionPayload[] {
  // Demo data generation permanently disabled: strictly real user submissions only
  return [];
}
