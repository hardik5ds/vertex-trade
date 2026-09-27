import { createSlice } from '@reduxjs/toolkit'
const slice = createSlice({
  name: 'wallet',
  initialState: { selectedWallet: 'VIRTUAL' },
  reducers: {
    setSelectedWallet(state, action) {
      if (['VIRTUAL', 'REAL'].includes(action.payload)) state.selectedWallet = action.payload
    },
  },
})
export const { setSelectedWallet } = slice.actions
export default slice.reducer
