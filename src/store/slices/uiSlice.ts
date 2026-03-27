import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';

export interface UIState {
  mode: 'light' | 'dark';
  isRateLimited: boolean;
}

const initialState: UIState = {
  mode: 'dark', // Default to dark mode
  isRateLimited: false,
};

// Create action for initialization
export const initializeUI = createAction('ui/initialize', () => {
  // Get theme from localStorage or use default
  const savedTheme = typeof window !== 'undefined' 
    ? localStorage.getItem('theme') as 'light' | 'dark' | null
    : null;
  
  return {
    payload: savedTheme || 'dark',
  };
});

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', state.mode);
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.mode = action.payload;
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', state.mode);
      }
    },
    setRateLimited: (state, action: PayloadAction<boolean>) => {
      state.isRateLimited = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeUI, (state, action) => {
      state.mode = action.payload;
    });
  },
});

export const { toggleTheme, setTheme, setRateLimited } = uiSlice.actions;
export default uiSlice.reducer;