import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import inventoryReducer from './inventorySlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    inventory: inventoryReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
