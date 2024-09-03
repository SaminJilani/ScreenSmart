import {combineReducers} from 'redux';
import appReducer from "./reducer";

const rootReducer = combineReducers({
    reducer: appReducer,
  });

  export default rootReducer;