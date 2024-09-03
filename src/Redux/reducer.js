import * as types from './types';
 const initialState = {
    // selected_date: new Date().toISOString().split('T')[0],
    selected_date: {start: new Date().toISOString().split('T')[0], end: null},
    ending_date: null,
    
  };


  const appReducer = (state = initialState, action) => {
    switch (action.type) {
      case types.UPDATE_SELECTED_DATE:
        return {
          ...state,
          selected_date: action?.payload,
        };
        case types.UPDATE_ENDING_DATE:
        return {
          ...state,
          ending_date: action?.payload,
        };
      default:
        return state;
    }
  };
  
  export default appReducer;