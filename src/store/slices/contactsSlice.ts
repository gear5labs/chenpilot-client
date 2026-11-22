import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Contact, ContactsState, CreateContactRequest, UpdateContactRequest } from '@/types';
import apiService from '@/services/api';
import { normalizeApiError } from '@/services/apiErrors';
import { PAGINATION } from '@/constants';

export const paginateContacts = (
  contacts: Contact[],
  page: number,
  pageSize = PAGINATION.CONTACTS_PAGE_SIZE,
): Contact[] => {
  const start = Math.max(0, page - 1) * pageSize;
  return contacts.slice(start, start + pageSize);
};
export const hasContactAddressChanged = (savedAddress: string, proposedAddress: string): boolean =>
  proposedAddress.trim() !== savedAddress;

export const filterContacts = (contacts: Contact[], searchTerm: string): Contact[] => {
  const normalizedTerm = searchTerm.trim().toLowerCase();
  if (!normalizedTerm) return contacts;

  return contacts.filter((contact) =>
    contact.name.toLowerCase().includes(normalizedTerm) ||
    contact.address.toLowerCase().includes(normalizedTerm) ||
    (contact.note ?? '').toLowerCase().includes(normalizedTerm)
  );
};

interface ContactsState {
  list: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedContact: Contact | null;
  /** Contacts optimistically removed pending backend confirmation. */
  pendingDeletion: Contact[];
}

const initialState: ContactsState = {
  list: [],
  isLoading: false,
  error: null,
  selectedContact: null,
  mutating: {
    create: false,
    update: [],
    delete: [],
  },
  mutationError: {
    create: null,
    update: {},
    delete: {},
  },
  pendingDeletion: [],
};

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

export const getContacts = createAsyncThunk(
  'contacts/getContacts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getContacts();
      if (!response.success) {
        return rejectWithValue(response.message);
      }
      return response.data as Contact[];
    } catch (error: unknown) {
      const normalized = normalizeApiError(error, 'Failed to load contacts');
      return rejectWithValue(normalized.message);
    }
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: CreateContactRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.createContact(contactData);
      if (!response.success) {
        return rejectWithValue(response.message);
      }
      return response.data as Contact;
    } catch (error: unknown) {
      const normalized = normalizeApiError(error, 'Failed to create contact');
      return rejectWithValue(normalized.message);
    }
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ id, data }: { id: string; data: UpdateContactRequest }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateContact(id, data);
      if (!response.success) {
        return rejectWithValue({ id, message: response.message });
      }
      return response.data as Contact;
    } catch (error: unknown) {
      const normalized = normalizeApiError(error, 'Failed to update contact');
      return rejectWithValue({ id, message: normalized.message });
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteContact(id);
      if (!response.success) {
        return rejectWithValue({ id, message: response.message });
      }
      return id;
    } catch (error: unknown) {
      const normalized = normalizeApiError(error, 'Failed to delete contact');
      return rejectWithValue({ id, message: normalized.message });
    }
  }
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------
/**
 * Optimistically flips isFavorite then persists via PUT /contacts/{id}.
 * On failure the original value is restored and an error is set.
 */
export const toggleFavorite = createAsyncThunk(
  'contacts/toggleFavorite',
  async (id: string, { getState, rejectWithValue }) => {
    const state = (getState() as { contacts: ContactsState }).contacts;
    const contact = state.list.find((c) => c.id === id);
    if (!contact) return rejectWithValue('Contact not found');

    const newValue = !contact.isFavorite;
    try {
      const result = await apiService.updateContact(id, { isFavorite: newValue });
      if (!result.success) {
        return rejectWithValue((result as { message?: string }).message ?? 'Failed to update favorite');
      }
      // Return the server-confirmed contact if available, otherwise a minimal patch.
      return result.success ? result.data : { ...contact, isFavorite: newValue };
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { message?: string }).message ?? 'Failed to update favorite',
      );
    }
  },
);

/**
 * Commits a soft-deleted contact to the backend.
 * On failure the contact is restored to `list` automatically.
 */
export const commitDeleteContact = createAsyncThunk(
  'contacts/commitDeleteContact',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiService.deleteContact(id);
      return id;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { message?: string }).message ?? 'Failed to delete contact',
      );
    }
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.mutationError = { create: null, update: {}, delete: {} };
    },
    clearCreateError: (state) => {
      state.mutationError.create = null;
    },
    clearUpdateError: (state, action: PayloadAction<string>) => {
      delete state.mutationError.update[action.payload];
    },
    clearDeleteError: (state, action: PayloadAction<string>) => {
      delete state.mutationError.delete[action.payload];
    },
    setSelectedContact: (state, action: PayloadAction<Contact | null>) => {
      state.selectedContact = action.payload;
    },
    clearSelectedContact: (state) => {
      state.selectedContact = null;
    },
    searchContacts: () => {
      // Filtering is handled in components/selectors; search term is not persisted in Redux.
    },
    /**
     * Optimistically hides the contact from the list while the undo window
     * is open.  The contact is saved in `pendingDeletion` so it can be
     * restored if the user clicks Undo.
     */
    softDeleteContact: (state, action: PayloadAction<string>) => {
      const idx = state.list.findIndex((c) => c.id === action.payload);
      if (idx === -1) return;
      const [removed] = state.list.splice(idx, 1);
      state.pendingDeletion.push(removed);
      if (state.selectedContact?.id === action.payload) {
        state.selectedContact = null;
      }
    },
    /**
     * Moves the contact back from `pendingDeletion` to `list` (undo).
     */
    restoreContact: (state, action: PayloadAction<string>) => {
      const idx = state.pendingDeletion.findIndex((c) => c.id === action.payload);
      if (idx === -1) return;
      const [contact] = state.pendingDeletion.splice(idx, 1);
      state.list.push(contact);
    },
    /**
     * Discards the pending-deletion record without hitting the network
     * (used when the undo window expires and commitDeleteContact is called
     * instead, or when cleaning up after a failed commit that was already
     * restored).
     */
    clearPendingDeletion: (state, action: PayloadAction<string>) => {
      state.pendingDeletion = state.pendingDeletion.filter(
        (c) => c.id !== action.payload,
      );
    },
    /**
     * Optimistically flips isFavorite in-place before the network request
     * completes.  toggleFavorite.rejected restores the previous value.
     */
    optimisticToggleFavorite: (state, action: PayloadAction<string>) => {
      const contact = state.list.find((c) => c.id === action.payload);
      if (contact) {
        contact.isFavorite = !contact.isFavorite;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ── getContacts ──────────────────────────────────────────────────────
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

      // ── createContact ────────────────────────────────────────────────────
      .addCase(createContact.pending, (state) => {
        if (state.mutating) {
          state.mutating.create = true;
          state.mutationError.create = null;
        } else {
          state.isLoading = true;
          state.error = null;
        }
      })
      .addCase(createContact.fulfilled, (state, action) => {
        if (state.mutating) {
          state.mutating.create = false;
          state.mutationError.create = null;
        } else {
          state.isLoading = false;
        }
        state.list.push(action.payload);
      })
      .addCase(createContact.rejected, (state, action) => {
        if (state.mutating) {
          state.mutating.create = false;
          state.mutationError.create = action.payload as string;
        } else {
          state.isLoading = false;
          state.error = action.payload as string;
        }
      })

      // ── updateContact ────────────────────────────────────────────────────
      .addCase(updateContact.pending, (state, action) => {
        const id = action.meta?.arg?.id;
        if (state.mutating) {
          if (id && !state.mutating.update.includes(id)) {
            state.mutating.update.push(id);
          }
          if (id && state.mutationError) {
            delete state.mutationError.update[id];
          }
        } else {
          state.isLoading = true;
          state.error = null;
        }
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        const updated = action.payload;
        if (state.mutating) {
          state.mutating.update = state.mutating.update.filter((id) => id !== updated.id);
          if (state.mutationError) {
            delete state.mutationError.update[updated.id];
          }
        } else {
          state.isLoading = false;
        }
        const index = state.list.findIndex((c) => c.id === updated.id);
        if (index !== -1) {
          state.list[index] = updated;
        }
        if (state.selectedContact?.id === updated.id) {
          state.selectedContact = updated;
        }
      })
      .addCase(updateContact.rejected, (state, action) => {
        const { id, message } = (action.payload as { id: string; message: string }) || {};
        if (state.mutating) {
          if (id) {
            state.mutating.update = state.mutating.update.filter((uid) => uid !== id);
          }
          if (id && state.mutationError) {
            state.mutationError.update[id] = message;
          }
        } else {
          state.isLoading = false;
          state.error = message || (action.payload as string);
        }
      })

      // ── deleteContact ────────────────────────────────────────────────────
      .addCase(deleteContact.pending, (state, action) => {
        const id = action.meta?.arg;
        if (state.mutating) {
          if (id && !state.mutating.delete.includes(id)) {
            state.mutating.delete.push(id);
          }
          if (id && state.mutationError) {
            delete state.mutationError.delete[id];
          }
        } else {
          state.isLoading = true;
          state.error = null;
        }
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.mutating) {
          state.mutating.delete = state.mutating.delete.filter((did) => did !== id);
          if (id && state.mutationError) {
            delete state.mutationError.delete[id];
          }
        } else {
          state.isLoading = false;
        }
        state.list = state.list.filter((c) => c.id !== id);
        if (state.selectedContact?.id === id) {
          state.selectedContact = null;
        }
      })
      .addCase(deleteContact.rejected, (state, action) => {
        const payload = action.payload;
        const id = typeof payload === 'object' && payload !== null && 'id' in payload ? (payload as { id: string }).id : action.meta?.arg;
        const message = typeof payload === 'object' && payload !== null && 'message' in payload ? (payload as { message: string }).message : (payload as string);
        if (state.mutating) {
          if (id) {
            state.mutating.delete = state.mutating.delete.filter((did) => did !== id);
          }
          if (id && state.mutationError) {
            state.mutationError.delete[id] = message;
          }
        } else {
          state.isLoading = false;
          state.error = message || 'Delete failed';
        }
      })
      // Commit Delete Contact
      .addCase(commitDeleteContact.fulfilled, (state, action) => {
        // Remove from pending — contact is already gone from list.
        state.pendingDeletion = state.pendingDeletion.filter(
          (c) => c.id !== action.payload,
        );
        state.error = null;
      })
      .addCase(commitDeleteContact.rejected, (state, action) => {
        // Restore the contact back into the list so the user doesn't lose data.
        const idx = state.pendingDeletion.findIndex(
          (c) => c.id === (action.meta.arg as string),
        );
        if (idx !== -1) {
          const [contact] = state.pendingDeletion.splice(idx, 1);
          state.list.push(contact);
        }
        state.error = action.payload as string;
      })
      // Toggle Favorite
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        // Overwrite with server-confirmed value if the server returned a full contact.
        const idx = state.list.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) {
          state.list[idx] = { ...state.list[idx], ...action.payload };
        }
        state.error = null;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        // Revert the optimistic flip.
        const id = action.meta.arg as string;
        const contact = state.list.find((c) => c.id === id);
        if (contact) {
          contact.isFavorite = !contact.isFavorite;
        }
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  setSelectedContact,
  clearSelectedContact,
  searchContacts,
  softDeleteContact,
  restoreContact,
  clearPendingDeletion,
  optimisticToggleFavorite,
} = contactsSlice.actions;
export default contactsSlice.reducer;
