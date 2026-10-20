import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Contact, CreateContactRequest, UpdateContactRequest } from '@/types';
import apiService from '@/services/api';

interface ContactsState {
  list: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
}

const initialState: ContactsState = {
  list: [],
  isLoading: false,
  error: null,
  selectedContact: null,
};

// Async thunks
export const getContacts = createAsyncThunk(
  'contacts/getContacts',
  async (_, { rejectWithValue }) => {
    // Mock contacts
    const mockContacts: Contact[] = [
      {
        id: '1',
        name: 'Mock Contact 1',
        address: '0x1234567890abcdef',
        tokenType: 'STRK',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Mock Contact 2',
        address: '0xabcdef1234567890',
        tokenType: 'ETH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    return mockContacts;
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: CreateContactRequest, { rejectWithValue }) => {
    // Mock create contact
    const mockContact: Contact = {
      id: `mock_${Date.now()}`,
      name: contactData.name,
      address: contactData.address,
      tokenType: contactData.tokenType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockContact;
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ id, data }: { id: string; data: UpdateContactRequest }, { rejectWithValue }) => {
    // Mock update contact
    const mockContact: Contact = {
      id,
      name: data.name || 'Updated Contact',
      address: data.address || '0xupdatedaddress',
      tokenType: data.tokenType || 'STRK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockContact;
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string, { rejectWithValue }) => {
    // Mock delete contact - always succeed
    return id;
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedContact: (state, action: PayloadAction<Contact | null>) => {
      state.selectedContact = action.payload;
    },
    clearSelectedContact: (state) => {
      state.selectedContact = null;
    },
    searchContacts: (state, action: PayloadAction<string>) => {
      // This would typically be handled by a selector, but we can store the search term here
      // The actual filtering would be done in the component or selector
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Contacts
      .addCase(getContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.error = null;
      })
      .addCase(getContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Contact
      .addCase(createContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list.push(action.payload);
        state.error = null;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Contact
      .addCase(updateContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.list.findIndex(contact => contact.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.selectedContact?.id === action.payload.id) {
          state.selectedContact = action.payload;
        }
        state.error = null;
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete Contact
      .addCase(deleteContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = state.list.filter(contact => contact.id !== action.payload);
        if (state.selectedContact?.id === action.payload) {
          state.selectedContact = null;
        }
        state.error = null;
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSelectedContact, clearSelectedContact, searchContacts } = contactsSlice.actions;
export default contactsSlice.reducer;

export function sortContactsDeterministically(
  contacts: Contact[],
  mode: 'alphabetical' | 'recent' = 'alphabetical',
): Contact[] {
  return [...contacts].sort((a, b) => {
    if (mode === 'recent') {
      const aTime = a.lastUsed ? Date.parse(a.lastUsed) : NaN;
      const bTime = b.lastUsed ? Date.parse(b.lastUsed) : NaN;
      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);
      if (aValid && bValid && aTime !== bTime) return bTime - aTime;
      if (aValid !== bValid) return aValid ? -1 : 1;
    }
    const byName = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });
}
