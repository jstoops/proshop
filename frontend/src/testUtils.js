import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { apiSlice } from './slices/apiSlice';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';

export function makeStore(preloadedState) {
  return configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      cart: cartReducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState,
  });
}

export function renderWithProviders(
  ui,
  { preloadedState, route = '/', store = makeStore(preloadedState) } = {}
) {
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>
  );

  return { store, ...result };
}
