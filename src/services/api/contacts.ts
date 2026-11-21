import axios from 'axios';
import { ApiClient, apiClient } from './client';
import {
  Contact,
  CreateContactRequest,
  UpdateContactRequest,
  ApiResponse,
} from '@/types';

const isAxiosLike = (error: unknown): error is { response?: { status?: number } } =>
  axios.isAxiosError(error) || (typeof error === 'object' && error !== null && 'response' in error);

export class ContactsApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    try {
      const response = await this.client.api.get<ApiResponse<Contact[]>>(
        '/contacts',
      );

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: true,
          data: [],
          message:
            'Contact management is available through the chat interface',
        };
      }

      throw error;
    }
  }

  async createContact(
    data: CreateContactRequest,
  ): Promise<ApiResponse<Contact>> {
    try {
      const response = await this.client.api.post<ApiResponse<Contact>>(
        '/contacts',
        data,
      );

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: false,
          status: 404,
          message:
            'Contact creation is available through the chat interface. Try: "Add John as a contact with address 0x123..."',
        };
      }

      throw error;
    }
  }

  async updateContact(
    id: string,
    data: UpdateContactRequest,
  ): Promise<ApiResponse<Contact>> {
    try {
      const response = await this.client.api.put<ApiResponse<Contact>>(
        `/contacts/${encodeURIComponent(id)}`,
        data,
      );

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: false,
          status: 404,
          message:
            'Contact updates are available through the chat interface',
        };
      }

      throw error;
    }
  }

  async deleteContact(
    id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await this.client.api.delete<
        ApiResponse<{ message: string }>
      >(`/contacts/${encodeURIComponent(id)}`);

      return response.data;
    } catch (error: unknown) {
      if (isAxiosLike(error) && error.response?.status === 404) {
        return {
          success: false,
          status: 404,
          message:
            'Contact deletion is available through the chat interface. Try: "Remove John from my contacts"',
        };
      }

      throw error;
    }
  }
}

export const contactsApi = new ContactsApi();
