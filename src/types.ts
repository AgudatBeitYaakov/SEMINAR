/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SalaryRecord {
  id: number;
  track: string;
  year: string;
  teacherName: string;
  subject: string;
  semester: string;
  paymentMethod: string;
  shash: number;
  meetings: number;
  totalHours: number;
  rate: number;
  employerOverhead: number;
  totalAnnual: number;
  tz: string;
  phone: string;
  email: string;
  isApproved: boolean;
  isContractReady: boolean;
  travel?: string;
  gradeTiming?: string;
  monthlyHours?: Record<string, number>;
}

export type UserRole = 'guest' | 'director' | 'secretary' | 'coordinator';

export interface AuthState {
  role: UserRole;
  track: string | null;
}

export interface ChangeRequestSnapshot {
  teacherName: string;
  subject: string;
  semester: string;
  paymentMethod: string;
  shash: number;
  meetings: number;
  rate: number;
  totalHours?: number;
  employerOverhead?: number;
  totalAnnual: number;
  travel?: string;
}

export interface ChangeRequest {
  requestId: number;
  rowId: number;
  track: string;
  current: ChangeRequestSnapshot;
  proposed: ChangeRequestSnapshot;
  timestamp: string;
  /** "change" = עדכון משרה, "delete" = בקשת מחיקת משרה */
  requestType?: "change" | "delete";
}
