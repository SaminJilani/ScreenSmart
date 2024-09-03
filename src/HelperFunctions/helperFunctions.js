import {Alert, NativeModules, Platform, ToastAndroid} from 'react-native';
const {AppUsageModule} = NativeModules;
import {format} from 'date-fns';
import {useSelector} from 'react-redux';

export const convertTime = inMilli => {
  if (!inMilli || inMilli == '') {
    return '';
  }
  const seconds = Math.floor(inMilli / 1000) % 60;
  const minutes = Math.floor(inMilli / (1000 * 60)) % 60;
  const hours = Math.floor(inMilli / (1000 * 60 * 60));

  let timeStringBuilder = '';

  if (hours > 0) {
    timeStringBuilder += `${hours}hr `;
  }
  if (minutes > 0) {
    timeStringBuilder += `${minutes}m `;
  }
  if (seconds > 0) {
    timeStringBuilder += `${seconds}s`;
  }

  return timeStringBuilder.trim();
};

export const calculatePercentage = (totalUsage, appUsage) => {
  if (totalUsage === 0) {
    return '0.0%';
  }
  const percentage = (appUsage / totalUsage) * 100;
  return `${percentage.toFixed(1)}%`;
};

export const calculatePercentageForProgress = (totalUsage, appUsage) => {
  if (totalUsage === 0 || totalUsage === '') {
    return 0;
  }
  const percentage = (appUsage / totalUsage) * 100;
  // console.log(`calculatePercentageForProgress TYPE ${appUsage} ${totalUsage} ${percentage}`)
  return percentage * 0.01;
};

export const convertHourFormat = timeString => {
  if (!timeString || timeString == '') {
    return '';
  }
  // Split the time string into hours and minutes
  const [hours, minutes] = timeString.split(':').map(Number);

  // Determine the period (am/pm)
  const period = hours < 12 ? 'am' : 'pm';

  // Convert hours to 12-hour format
  const convertedHours = hours % 12 === 0 ? 12 : hours % 12;

  // Return the formatted time
  return `${convertedHours}${period}`;
};
export const convertDateFormat = timeString => {
  if (!timeString || timeString == '') {
    return '';
  }
  return format(timeString, 'MMM d');
};

export const fetchHourlyChartData = async (
  selectedDate,
  setData,
  setLoading,
) => {
  const date = new Date().toISOString().split('T')[0];
  try {
    const result = await AppUsageModule.getHourlyUsageData(selectedDate?.start);
    const formattedData = result.map(item => ({
      hour: item.hour,
      usage: item.usage,
    }));
    console.log('formattedData:', formattedData);
    if (formattedData.length > 0) {
      setData(formattedData);
    } else {
      setData([
        {hour: '', usage: 0},
        {hour: '', usage: 0},
        {hour: '', usage: 0},
      ]);
    }
  } catch (error) {
    console.error('Error fetching hourly usage data:', error);
  } finally {
    setLoading(false);
  }
};

export const fetchDailyChartData = async (
  selectedDate,
  setData,
  setLoading,
) => {
  try {
    const result = await AppUsageModule.getChartUsageDataForDateRange(
      selectedDate.start,
      selectedDate.end,
    );
    const formattedData = result.map(item => ({
      date: item.date,
      usage: item.usage,
    }));
    console.log('fetchDailyChartData:', formattedData);
    if (formattedData.length > 0) {
      setData(formattedData);
    } else {
      setData([
        {hour: '', usage: 0},
        {hour: '', usage: 0},
        {hour: '', usage: 0},
      ]);
    }
  } catch (error) {
    console.error('Error fetching daily chart usage data:', error);
  } finally {
    setLoading(false);
  }
};

export const fetchHourlyAppChartData = async (
  selectedDate,
  setData,
  packageName,
) => {
  try {
    const result = await AppUsageModule.getHourlyAppUsageData(
      selectedDate?.start,
      packageName,
    );
    const formattedData = result.map(item => ({
      hour: item.hour,
      usage: item.usage,
    }));
    // console.log('formattedData:', formattedData);
    if (formattedData.length > 0) {
      setData(formattedData);
    } else {
      setData([
        {hour: '', usage: 0},
        {hour: '', usage: 0},
        {hour: '', usage: 0},
      ]);
    }
  } catch (error) {
    console.error('Error fetching hourly usage data:', error);
  } finally {
  }
};

export const fetchDailyAppChartData = async (
  selectedDate,
  setData,
  packageName,
) => {
  try {
    const result = await AppUsageModule.getAppChartUsageDataForDateRange(
      selectedDate?.start,
      selectedDate?.end,
      packageName,
    );
    const formattedData = result.map(item => ({
      date: item.date,
      usage: item.usage,
    }));
    // console.log('fetchDailyAppChartData:', formattedData);
    if (formattedData.length > 0) {
      setData(formattedData);
    } else {
      setData([
        {hour: '', usage: 0},
        {hour: '', usage: 0},
        {hour: '', usage: 0},
      ]);
    }
  } catch (error) {
    console.error('Error fetching hourly usage data:', error);
  } finally {
  }
};

export const isCurrentDate = (value, current) => {
  // Create Date objects from the date strings
  const valueDate = new Date(value);
  const currentDate = new Date(current);

  // Compare the two dates
  return valueDate.toDateString() === currentDate.toDateString();
};

export const mergeAppUsage = async (date, appUsageLocal) => {
  try {
    const usageData = await AppUsageModule.getAppUsage(date.start, date.end);
    const notInArray1 = appUsageLocal.filter(
      obj2 => !usageData.some(obj1 => obj1.packageName == obj2.packageName),
    );
    // console.log(`notInArray1: ${JSON.stringify(notInArray1)}`);
    const final_AppUsage = usageData.map(item => {
      let app_object = appUsageLocal.find(
        obj => obj.packageName === item.packageName,
      );
      if (!app_object) {
        return item;
      }
      if (item.totalTimeSpent >= app_object.totalTimeSpent) {
        return item;
      } else {
        app_object.totalTimeSpent =
          item.totalTimeSpent + app_object.totalTimeSpent;
        return app_object;
      }
    });

    const result = [...final_AppUsage, ...notInArray1];
    //   console.log(`result: ---->  ${result}`)

    return Promise.resolve(result);
  } catch (e) {
    return Promise.reject(e);
  }
};

export const initiateAppUsageLimits = async appLimits => {
  try {
    if (appLimits.length > 0) {
      const isRunning = await AppUsageModule.isServiceRunning();
      console.log('Service running:', isRunning);
      if (isRunning) {
        const serviceStopped = await AppUsageModule.stopService();
        console.log('Service stopped:', serviceStopped);
        if (serviceStopped) {
          await AppUsageModule.checkAndStartService(appLimits);
          console.log('Service has started');
        } else {
          console.log('Failed to stop the service');
        }
      } else {
        await AppUsageModule.checkAndStartService(appLimits);
        console.log('Service has started');
      }
    } else {
      console.log('No apps remaining service needs to close');
      await AppUsageModule.stopService();
    }
  } catch (error) {
    console.error('Error checking or starting service:', error);
  }
};

export const sanitizeData = data => {
  return data.filter(item => !isNaN(item.usage) && isFinite(item.usage));
};

export const convertTimestamp = timestamp => {
  return format(new Date(timestamp), 'hh:mm:ss a');
};

export const sortSectionsByDate = sections => {
  return sections?.sort((a, b) => new Date(a.title) - new Date(b.title));
};

export const notifyMessage = msg => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert(msg);
  }
};
