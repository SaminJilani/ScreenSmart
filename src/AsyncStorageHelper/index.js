import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import {MMKV} from 'react-native-mmkv';

export const storage = new MMKV();

// export const storeTotalUsageLocally = async (key, value) => {
//   try {
//       await AsyncStorage.setItem(key, value.toString());
//   } catch (error) {
//     console.log(error);
//   }
// };

// export const storeAppUsageLocally = async (key, value) => {
//   try {
//       await AsyncStorage.setItem(key, JSON.stringify(value));
//   } catch (error) {
//     console.log(error);
//   }
// };

export const storeTotalUsageLocally = async (key, value) => {
  try {
    storage.set(key, value.toString());
  } catch (error) {
    console.log(error);
  }
};

export const storeAppUsageLocally = async (key, value) => {
  try {
    storage.set(key, JSON.stringify(value));
  } catch (error) {
    console.log(error);
  }
};

export const storeData = (key, value) => {
  try {
    storage.set(key, value);
  } catch (error) {
    console.log(`Error storing data: ${error}`);
  }
};

// Function to retrieve data from MMKV
export const retrieveStringData = key => {
  try {
    const value = storage.getString(key);
    return value;
  } catch (error) {
    console.log(`Error retrieving data: ${error}`);
  }
  return null;
};
