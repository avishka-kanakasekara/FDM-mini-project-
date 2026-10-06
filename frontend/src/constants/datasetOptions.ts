export interface Choice {
  value: string;
  label: string;
}

export const JOB_OPTIONS: Choice[] = [
  { value: "admin.", label: "Administration" },
  { value: "blue-collar", label: "Blue-collar" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "housemaid", label: "Housemaid" },
  { value: "management", label: "Management" },
  { value: "retired", label: "Retired" },
  { value: "self-employed", label: "Self-employed" },
  { value: "services", label: "Services" },
  { value: "student", label: "Student" },
  { value: "technician", label: "Technician" },
  { value: "unemployed", label: "Unemployed" },
  { value: "unknown", label: "Unknown" },
];

export const MARITAL_OPTIONS: Choice[] = [
  { value: "divorced", label: "Divorced" },
  { value: "married", label: "Married" },
  { value: "single", label: "Single" },
  { value: "unknown", label: "Unknown" },
];

export const EDUCATION_OPTIONS: Choice[] = [
  { value: "basic.4y", label: "Basic (4 years)" },
  { value: "basic.6y", label: "Basic (6 years)" },
  { value: "basic.9y", label: "Basic (9 years)" },
  { value: "high.school", label: "High school" },
  { value: "illiterate", label: "Illiterate" },
  { value: "professional.course", label: "Professional course" },
  { value: "university.degree", label: "University degree" },
  { value: "unknown", label: "Unknown" },
];

export const YES_NO_UNKNOWN: Choice[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "unknown", label: "Unknown" },
];

export const CONTACT_OPTIONS: Choice[] = [
  { value: "cellular", label: "Cellular" },
  { value: "telephone", label: "Telephone" },
];

export const MONTH_OPTIONS: Choice[] = [
  { value: "mar", label: "March" },
  { value: "apr", label: "April" },
  { value: "may", label: "May" },
  { value: "jun", label: "June" },
  { value: "jul", label: "July" },
  { value: "aug", label: "August" },
  { value: "sep", label: "September" },
  { value: "oct", label: "October" },
  { value: "nov", label: "November" },
  { value: "dec", label: "December" },
];

export const DAY_OPTIONS: Choice[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
];

export const POUTCOME_OPTIONS: Choice[] = [
  { value: "failure", label: "Failure" },
  { value: "nonexistent", label: "No previous campaign" },
  { value: "success", label: "Success" },
];

export function valuesOf(options: Choice[]): string[] {
  return options.map((option) => option.value);
}
