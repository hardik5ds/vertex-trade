import { configureStore } from '@reduxjs/toolkit'
import auth from './slices/authSlice'
import wallet from './slices/walletSlice'
export const store = configureStore({ reducer: { auth, wallet } })
