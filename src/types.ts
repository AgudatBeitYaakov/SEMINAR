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
}

export type UserRole = 'guest' | 'director' | 'secretary' | 'coordinator';

export interface AuthState {
  role: UserRole;
  track: string | null;
}
