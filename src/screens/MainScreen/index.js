import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {styles} from './styles';
import {
  calculatePercentage,
  calculatePercentageForProgress,
  convertDateFormat,
  convertHourFormat,
  convertTime,
  fetchChartData,
  fetchDailyChartData,
  fetchHourlyChartData,
  isCurrentDate,
  mergeAppUsage,
  sanitizeData,
} from '../../HelperFunctions/helperFunctions';

import {height, screenWidth, width} from '../../units';
import {ProgressBar} from 'react-native-paper';

import {LineChart} from 'react-native-chart-kit';
import {NativeModules} from 'react-native';
import {useSelector} from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import {
  storage,
  storeAppUsageLocally,
  storeLocalData,
  storeTotalUsageLocally,
} from '../../AsyncStorageHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Pressable} from '@react-native-material/core';
import {colors, fonts} from '../../assets';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {excludedKeywords} from '../Utilities';
import {ScrollView} from 'react-native-gesture-handler';
import {format} from 'date-fns';
import {BarChart} from 'react-native-gifted-charts';
import {PERMISSIONS, request, RESULTS} from 'react-native-permissions';

const {AppUsageModule} = NativeModules;

const MainScreen = ({route, navigation: {navigate}, navigation}) => {
  // defining states for this screen
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setpermissionGranted] = useState(false);
  const [appUsageData, setAppUsageData] = useState([]);
  const [totalUsage, setTotalUsage] = useState('');
  const selectedDate = useSelector(state => state?.reducer?.selected_date);
  const [error, setError] = useState(null);
  const filteredApps = appUsageData.filter(
    item =>
      !excludedKeywords.some(keyword => item.packageName.includes(keyword)) &&
      !(item.totalTimeSpent < 1000),
  );

  const alertShownRef = useRef(false); // Ref to track if alert has been shown

  // CHART
  const [chartData, setChartData] = useState([
    {hour: '', usage: 0},
    {hour: '', usage: 0},
    {hour: '', usage: 0},
  ]);
  // const sanitizedData = sanitizeData(chartData);
  const [formattedChartData, setRormattedChartData] = useState({
    labels: chartData.map(item => item.hour), // This should match your data points
    datasets: [
      {
        data: chartData.map(item => item.usage),
      },
    ],
    legend: ['Usage Time (minutes)'],
  });

  const [isLineChart, setisLineChart] = useState(true);
  // state for bar chart data
  const [formattedBarChartData, setFormattedBarChartData] = useState(
    {value: 0, label: ''},
    {value: 0, label: ''},
  );
  // state for bar chart style
  const [barStyleObject, setbarStyleObject] = useState({
    barWidth: width * 3,
  });
  const chartWidth = screenWidth - width * 8;
  const isDataValid = chartData.length > 0 && formattedChartData != null;

  // side effect hook to ask for permissions and fetching of data when the screen loads
  useEffect(() => {
    if (selectedDate.start) {
      checkAndRequestPermission();
    } else {
      console.log(`selectedDate is undefined`);
    }
  }, []);

  // side effect hook for fetching of chart data when the screen loads

  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      fetchHourlyChartData(selectedDate, setChartData, setLoading);
    } else {
      fetchDailyChartData(selectedDate, setChartData, setLoading);
    }
  }, []);

  // side effect hook for fetching of chart data when the states in the dependency change
  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      fetchHourlyChartData(selectedDate, setChartData, setLoading);
    } else {
      fetchDailyChartData(selectedDate, setChartData, setLoading);
    }
  }, [selectedDate, permissionGranted]);

  // side effect hook for fetching of data when the states in the dependency change

  useEffect(() => {
    checkAndRequestPermission();
  }, [selectedDate]);

  // side effect hook for fetching of data when the states in the dependency change

  useEffect(() => {
    if (totalUsage != '' && totalUsage > 0) {
      checkAppUsageLocally();
      // fetchAppUsage(selectedDate);
    }
  }, [totalUsage]);

  // side effect hook for formatting chart data when the states in the dependency change

  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      const formattedChartData = {
        labels: chartData.map(item => item.hour), // This should match your data points
        datasets: [
          {
            data: chartData.map(item => item.usage), // Example data; replace with chartData.map(item => item.usage)
          },
        ],
        legend: ['Usage Time (minutes)'],
      };
      setRormattedChartData(formattedChartData);
    } else {
      const formattedChartData = {
        labels: chartData.map(item => item.date), // This should match your data points
        datasets: [
          {
            data: chartData.map(item => item.usage), // Example data; replace with chartData.map(item => item.usage)
          },
        ],
        legend: ['Usage Time (hours)'],
      };
      setRormattedChartData(formattedChartData);
    }
  }, [chartData]);

  // side effect hook for setting style state when the states in the dependency change

  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      const formattedData = chartData.map(item => ({
        value: item.usage,
        label: convertHourFormat(item.hour),
        frontColor: colors.primary,
      }));
      setbarStyleObject(prevState => {
        let barwidth = width * (screenWidth / formattedData.length - 20);
        return (prevState.barWidth = barwidth);
      });
      // console.log(`formattedData Bar: ${JSON.stringify(formattedData)}`);
      setFormattedBarChartData(formattedData);
    } else {
      const formattedData = chartData.map(item => ({
        value: item.usage,
        label: convertDateFormat(item.date),
        frontColor: colors.primary,
      }));
      setbarStyleObject(prevState => {
        let barwidth = width * (screenWidth / formattedData.length - 20);
        return (prevState.barWidth = barwidth);
      });
      // console.log(`formattedData Bar2: ${JSON.stringify(formattedData)}`);
      setFormattedBarChartData(formattedData);
    }
  }, [chartData]);

  const checkTotalUsageLocally = async () => {
    const DeviceId = await DeviceInfo.getDeviceId();
    let key;
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      key = `${selectedDate.start}_${DeviceId}_ttlusage`;
    } else {
      key = `${selectedDate.start}_${selectedDate.end}_${DeviceId}_ttlusage`;
    }
    // const value = await AsyncStorage.getItem(key);
    const value = storage.getString(key);
    const date = new Date().toISOString().split('T')[0];
    console.log(`total_usage in local: ---->  ${value}`);
    if (value != null || value != undefined) {
      if (isCurrentDate(selectedDate.start, date)) {
        fetchTotalUsage(selectedDate);
      } else {
        const total_usage = parseInt(value, 10);
        setTotalUsage(total_usage);
      }
    } else {
      fetchTotalUsage(selectedDate);
    }
  };

  const checkAppUsageLocally = async () => {
    const DeviceId = await DeviceInfo.getDeviceId();
    // const key =  `${selectedDate.start}_${selectedDate.end}_${DeviceId}_appusage`;
    let key;
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      key = `${selectedDate.start}_${DeviceId}_appusage`;
    } else {
      key = `${selectedDate.start}_${selectedDate.end}_${DeviceId}_appusage`;
    }
    // const value = await AsyncStorage.getItem(key);
    const value = storage.getString(key);
    const date = new Date().toISOString().split('T')[0];
    // console.log(`app_usage_data: ---->  ${key}`)
    if (value != null || value != undefined) {
      if (isCurrentDate(selectedDate.start, date)) {
        // fetchAppUsage(selectedDate);
        try {
          const app_usage_data = await mergeAppUsage(
            selectedDate,
            JSON.parse(value),
          );
          setAppUsageData(app_usage_data);
          storeAppUsageLocally(key, app_usage_data);
          console.log(`app_usage_data fetched and mergeed ---->  ${key}`);
        } catch (error) {
          console.log(`mergeAppUsage error: ---->  ${error}`);
        }
      } else {
        const app_usage_data = JSON.parse(value);
        setAppUsageData(app_usage_data);
        console.log(`app_usage_data available ---->  ${key}`);
      }
    } else {
      console.log(`app_usage_data not found in local: fetched new`);
      fetchAppUsage(selectedDate);
    }
  };

  const checkAndRequestPermission = () => {
    const getPermissionStatus = async () => {
      try {
        const response = await AppUsageModule.requestUsageStatsPermission();
        return response;
      } catch (error) {
        return 'not granted';
      }
    };
    try {
      // await AsyncStorage.clear();
      getPermissionStatus().then(response => {
        console.log(`getPermissionStatus ${response}`);
        if (response == 'Permission already granted') {
          console.log(`alertShownRef.current 1 ${alertShownRef.current}`);
          // const date = "2024-07-28";
          console.log(`date ---->  ${selectedDate.start}`);
          // selectedDate.start ? fetchTotalUsage(selectedDate):null;
          checkTotalUsageLocally();
        } else {
          console.log(`alertShownRef.current 2 ${alertShownRef.current}`);
          if (!alertShownRef.current) {
            alertShownRef.current = true;
            Alert.alert(
              'Permission Required',
              'Please grant usage access permission to this app.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    checkAndRequestPermission();
                    setpermissionGranted(prev => !prev);
                    alertShownRef.current = false;
                    requestNotificationPermission();
                  },
                },
              ],
              {cancelable: false},
            );
          }
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      // For iOS, use PERMISSIONS.IOS.NOTIFICATIONS
      // For Android, use PERMISSIONS.ANDROID.POST_NOTIFICATIONS if targetSdkVersion is 33 or higher
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.NOTIFICATIONS
          : PERMISSIONS.ANDROID.POST_NOTIFICATIONS;

      // Request permission
      const result = await request(permission);

      switch (result) {
        case RESULTS.GRANTED:
          Alert.alert(
            'Permission Granted',
            'You can now receive notifications.',
          );
          break;
        case RESULTS.DENIED:
          Alert.alert(
            'Permission Denied',
            'You can change this setting in the app settings.',
          );
          break;
        case RESULTS.BLOCKED:
          Alert.alert(
            'Permission Blocked',
            'Notifications are blocked. Please enable them in the app settings.',
          );
          break;
        case RESULTS.UNAVAILABLE:
          Alert.alert(
            'Permission Unavailable',
            'This feature is not available on this device.',
          );
          break;
        default:
          Alert.alert(
            'Permission Status Unknown',
            'The permission status is unknown.',
          );
          break;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert(
        'Error',
        'There was an error requesting notification permission.',
      );
    }
  };

  const fetchTotalUsage = async date => {
    try {
      const DeviceId = await DeviceInfo.getDeviceId();
      const totalUsageData = await AppUsageModule.getTotalUsage(
        date.start,
        date.end,
      );
      let key;
      if (date.start == date.end || !date.end) {
        key = `${date.start}_${DeviceId}_ttlusage`;
      } else {
        key = `${date.start}_${date.end}_${DeviceId}_ttlusage`;
      }
      // console.log(`totalUsageData: ${JSON.stringify(totalUsageData)}`);
      setTotalUsage(totalUsageData.totalUsageTime);
      // storing data locally after obtaining
      storeTotalUsageLocally(key, totalUsageData.totalUsageTime);
    } catch (e) {
      console.log(e);
    } finally {
      // fetchAppUsage(date);
    }
  };

  const fetchAppUsage = async date => {
    setLoading(true);
    try {
      const DeviceId = await DeviceInfo.getDeviceId();
      const usageData = await AppUsageModule.getAppUsage(date.start, date.end);
      let key;
      if (date.start == date.end || !date.end) {
        key = `${date.start}_${DeviceId}_appusage`;
      } else {
        key = `${date.start}_${date.end}_${DeviceId}_appusage`;
      }
      setAppUsageData(usageData);

      // storing data locally after obtaining
      storeAppUsageLocally(key, usageData);
      // console.log(`appUsageData: ${JSON.stringify(usageData)}`);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const navigateToAppDetails = async item => {
    navigate('AppUsageDetails', {appitem: item});
  };
  const navigateToUsageStatistics = () => {
    navigate('UsageStatistics');
  };
  const prepareBarChartData = () => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      const formattedData = chartData.map(item => ({
        value: item.usage,
        label: convertHourFormat(item.hour),
        frontColor: colors.primary,
      }));
      // console.log(`formattedData Bar: ${JSON.stringify(formattedData)}`);
      setFormattedBarChartData(formattedData);
      setbarStyleObject(prevState => {
        let barwidth = width * (screenWidth / formattedData.length - 20);
        return (prevState.barWidth = barwidth);
      });
      setisLineChart(false);
    } else {
      const formattedData = chartData.map(item => ({
        value: item.usage,
        label: convertDateFormat(item.date),
        frontColor: colors.primary,
      }));
      // console.log(`formattedData Bar2: ${JSON.stringify(formattedData)}`);
      setFormattedBarChartData(formattedData);
      setisLineChart(false);
    }
  };
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      {/* <Button
        title="Refresh"
        onPress={async () => await AppUsageModule.stopService()}
      /> */}
      {/* {loading && <ActivityIndicator size="large" color="#0000ff" />} */}

      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'flex-end',
          marginRight: width * 7,
        }}>
        <Pressable
          onPress={() => setisLineChart(true)}
          android_ripple={null}
          style={{
            width: width * 10,
            height: height * 3,
            backgroundColor: isLineChart ? colors.primary : colors.white,
            borderTopStartRadius: 5,
            borderBottomStartRadius: 5,
            borderWidth: 1,
            borderColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AntDesign
            color={isLineChart ? colors.white : colors.primary}
            size={16}
            name={'linechart'}
          />
        </Pressable>
        <Pressable
          onPress={() => prepareBarChartData()}
          android_ripple={null}
          style={{
            width: width * 10,
            height: height * 3,
            backgroundColor: isLineChart ? colors.white : colors.primary,
            borderTopEndRadius: 5,
            borderBottomEndRadius: 5,
            borderWidth: 1,
            borderColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <AntDesign
            color={isLineChart ? colors.primary : colors.white}
            size={16}
            name={'barschart'}
          />
        </Pressable>
      </View>

      <View style={{justifyContent: 'center', alignItems: 'center'}}>
        {isDataValid ? (
          <View>
            {isLineChart ? (
              <LineChart
                data={formattedChartData}
                width={chartWidth} // from react-native
                height={height * 25}
                // style={{marginLeft: width * 120}}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={1} // optional, defaults to 1
                chartConfig={{
                  backgroundColor: '#f7f7f7',
                  backgroundGradientFrom: '#f7f7f7',
                  backgroundGradientTo: '#f7f7f7',
                  decimalPlaces: 0,
                  barPercentage: 0.4,
                  color: (opacity = 1) => colors.primary,
                  labelColor: (opacity = 1) => colors.primary,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#f75e00',
                  },
                  propsForLabels: {
                    fontSize: width * 2,
                  },
                }}
                bezier
                style={{
                  // marginVertical: 8,
                  borderRadius: 16,
                }}
                formatXLabel={(value, index) => {
                  // Only show specific labels
                  if (chartData.length > 0) {
                    if (
                      selectedDate.start == selectedDate.end ||
                      !selectedDate.end
                    ) {
                      let middle = Math.floor(chartData.length / 2);
                      let last = chartData.length - 1;
                      if (chartData[0].hour == value) {
                        return convertHourFormat(value);
                      } else if (chartData[middle].hour == value) {
                        return convertHourFormat(value);
                      } else if (chartData[last].hour == value) {
                        return convertHourFormat(value);
                      } else {
                        return '';
                      }
                    } else {
                      try {
                        // console.log(`value  ${value}`);
                        return convertDateFormat(value);
                      } catch (error) {
                        return '';
                      }
                    }
                  }
                  return '';
                }}
                formatYLabel={(value, index) => {
                  // console.log(`formatYLabel running1`);
                  if (
                    selectedDate.start == selectedDate.end ||
                    !selectedDate.end
                  ) {
                    // console.log(`formatYLabel running2`);
                    return convertTime(value);
                  } else {
                    // console.log(`formatYLabel running3`);
                    return convertTime(value);
                  }
                }}
              />
            ) : (
              <BarChart
                data={formattedBarChartData}
                width={chartWidth}
                height={height * 25}
                barWidth={barStyleObject.barWidth}
                initialSpacing={width * 3}
                yAxisLabelWidth={width * 8}
                spacing={width * 3}
                yAxisLabelTextStyle={{
                  color: colors.primary,
                  fontSize: 5,
                  fontFamily: fonts.notosansBold,
                }} // Customize y-axis label color
                xAxisLabelTextStyle={{
                  color: colors.primary,
                  fontSize: 5,
                  fontFamily: fonts.notosansBold,
                }}
                formatYLabel={value => {
                  // console.log(`formatYLabel: ${value}`);
                  return convertTime(value);
                }}
                // isAnimated={true}
                adjustToWidth={true}
                hideOrigin={false} // Ensures the labels start from the origin
                showYAxisIndices={false} // Optional: Hide the indices on Y-axis
              />
            )}
          </View>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: width * 4,
          marginVertical: width * 5,
        }}>
        <Text
          style={{
            fontFamily: fonts.notosans,
            color: colors.black,
            fontSize: 16,
          }}>
          Total Usage:{'  '}
        </Text>
        <Text style={styles.totalUsage}>{convertTime(totalUsage)}</Text>
        <Pressable
          style={{
            alignSelf: 'flex-end',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            right: 0,
          }}
          onPress={() => navigateToUsageStatistics()}>
          <Text
            style={{
              fontFamily: fonts.notosansSemiBold,
              color: colors.primary,
              fontSize: 13,
              marginRight: width,
            }}>
            {'Usage Statistics'}
          </Text>
          <AntDesign color={colors.primary} size={16} name={'arrowright'} />
        </Pressable>
      </View>
      {!loading && !error && (
        <FlatList
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          data={filteredApps}
          keyExtractor={(item, index) => String(index)}
          style={{paddingHorizontal: width * 4}}
          renderItem={({item}) => {
            const prog = calculatePercentageForProgress(
              totalUsage,
              item.totalTimeSpent,
            );

            // console.log(`progress TYPE ${prog}`)
            return (
              <Pressable
                pressEffectColor={colors.pressEffectLight}
                onPress={() => navigateToAppDetails(item)}
                activeOpacity={0.5}
                style={styles.itemContainer}>
                {item.appIcon ? (
                  <Image
                    source={{uri: `data:image/png;base64,${item.appIcon}`}}
                    style={styles.appIcon}
                  />
                ) : null}
                <View style={styles.appNameContainer}>
                  <Text style={styles.appName}>{item.appName}</Text>
                  <ProgressBar
                    color={colors.primary}
                    style={{
                      width: 55 * width,
                      height: 0.7 * height,
                      marginRight: 20 * width,
                      borderRadius: 30,
                      backgroundColor: 'grey',
                      marginTop: 0.3 * height,
                    }}
                    progress={prog}
                  />
                </View>
                <View>
                  <Text style={styles.appTime}>
                    {convertTime(item.totalTimeSpent)}
                  </Text>
                  <Text style={styles.appTime}>
                    {calculatePercentage(totalUsage, item.totalTimeSpent)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ScrollView>
  );
};

export default MainScreen;
