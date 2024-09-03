
import * as types from './types';

export const changeSelectedDate = (date) => {
    return async (dispatch, getState) => {
      try {
        let updatedDateObj = {start:date.start, end: date.end };
        console.log('selectedDate changed in actions: ', updatedDateObj);
        dispatch({type: types.UPDATE_SELECTED_DATE, payload: updatedDateObj});
        // dispatch({type: types.USER_GROUPS, payload: user_groups}); 
        return Promise.resolve(date);
    
      } catch (e) {
        return Promise.reject(e);
      }
    };
  };

  export const changeEndingDate = (date) => {
    return async (dispatch, getState) => {
      try {
        console.log('endingDate changed in actions: ', date);
        dispatch({type: types.UPDATE_ENDING_DATE, payload: date});
        return Promise.resolve(date);
    
      } catch (e) {
        return Promise.reject(e);
      }
    };
  };