
import {
  persistReducer,
  persistStore,
} from 'redux-persist';
import {configureStore} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import rootReducer  from './rootReducer';

export const persistConfig = {
  key: 'rn-task-storage-root',
  storage: AsyncStorage,
  debug: __DEV__,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
// export const store = createStore(persistedReducer, applyMiddleware(thunk));
export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
export const persistor = persistStore(store);
