import { createSlice } from '@reduxjs/toolkit'
const slice = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user
    },
    logoutSuccess(state) {
      state.user = null
    },
  },
})
export const { loginSuccess, logoutSuccess } = slice.actions
export default slice.reducer
