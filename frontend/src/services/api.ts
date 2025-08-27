import axios from 'axios';
import { Contract, CalendarEvent, UploadResponse, ContractUpdate } from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const contractsApi = {
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

  getContracts: async (): Promise<Contract[]> => {
    const response = await api.get<Contract[]>('/contracts');
    return response.data;
  },

  getContract: async (id: number): Promise<Contract> => {
    const response = await api.get<Contract>(`/contracts/${id}`);
    return response.data;
  },

  updateContract: async (id: number, data: ContractUpdate): Promise<Contract> => {
    const response = await api.put<Contract>(`/contracts/${id}`, data);
    return response.data;
  },

  getCalendarEvents: async (): Promise<CalendarEvent[]> => {
    const response = await api.get<{ events: CalendarEvent[] }>('/calendar');
    return response.data.events;
  },

  deleteContract: async (id: number): Promise<void> => {
    await api.delete(`/contracts/${id}`);
  },

  clearAllContracts: async (): Promise<void> => {
    await api.delete('/contracts');
  },
};