/**
 * HTTP client for BRM Renewal Calendar API.
 * Respects VITE_API_BASE_URL when provided; defaults to http://localhost:8000.
 */
import axios from 'axios';
import { Contract, CalendarEvent, UploadResponse, ContractUpdate } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const contractsApi = {
  /** Upload one or more PDF files for processing */
  uploadContracts: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const response = await api.post<UploadResponse>('/contracts', formData, {
      headers: {
        'Accept': 'application/json',
      }
    });
    return response.data;
  },

  /** List all contracts */
  getContracts: async (): Promise<Contract[]> => {
    const response = await api.get<Contract[]>('/contracts');
    return response.data;
  },

  /** Fetch a single contract by id */
  getContract: async (id: number): Promise<Contract> => {
    const response = await api.get<Contract>(`/contracts/${id}`);
    return response.data;
  },

  /** Return OCR/text-extracted content for a contract's PDF */
  getContractOCRText: async (id: number): Promise<string> => {
    const response = await api.get<{ text: string }>(`/contracts/${id}/ocr_text`);
    return response.data.text;
  },

  /** Update editable fields and recompute notice deadline */
  updateContract: async (id: number, data: ContractUpdate): Promise<Contract> => {
    const response = await api.put<Contract>(`/contracts/${id}`, data);
    return response.data;
  },

  /** Get derived calendar events */
  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    const response = await api.get<{ events: CalendarEvent[] }>('/calendar');
    return response.data.events;
  },

  /** Download ICS file, optionally with a reminder alarm offset in days */
  downloadICS: async (reminderDays?: number) => {
    const params = new URLSearchParams()
    if (typeof reminderDays === 'number') params.set('reminder_days', String(reminderDays))
    const url = `/calendar.ics${params.toString() ? `?${params.toString()}` : ''}`
    const response = await api.get(url, { responseType: 'blob' })
    return response.data
  },

  /** Delete a single contract */
  deleteContract: async (id: number): Promise<void> => {
    await api.delete(`/contracts/${id}`);
  },

  /** Delete all contracts and their files */
  clearAllContracts: async (): Promise<void> => {
    await api.delete('/contracts');
  },

  /** Email ICS to recipients (requires SMTP configuration on backend) */
  emailCalendar: async (to: string[], reminderDays?: number): Promise<void> => {
    await api.post('/calendar/email', {
      to,
      reminder_days: reminderDays ?? null
    })
  }
};