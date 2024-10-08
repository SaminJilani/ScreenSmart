import {BackHandler, Image, SectionList, Text, View} from 'react-native';
import {styles} from './styles';
import {height, screenWidth, width} from '../../units';
import {colors, fonts} from '../../assets';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {Pressable} from '@react-native-material/core';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import {useSelector} from 'react-redux';
import {
  convertDateFormat,
  convertHourFormat,
  convertTime,
  convertTimestamp,
  fetchDailyAppChartData,
  fetchHourlyAppChartData,
  fetchHourlyChartData,
  sortSectionsByDate,
} from '../../HelperFunctions/helperFunctions';
import {NativeModules} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {format, isToday} from 'date-fns';
import {LineChart} from 'react-native-chart-kit';
import {BarChart} from 'react-native-gifted-charts';
const {AppUsageModule} = NativeModules;

const AppUsageDetails = ({route, navigation: {navigate}, navigation}) => {
  const {appitem} = route.params;

  const iconUri = useMemo(() => `data:image/png;base64,${appitem.appIcon}`, []);
  const selectedDate = useSelector(state => state?.reducer?.selected_date);
  const [appusageDetails, setAppUsageDetails] = useState({});
  const [appSessions, setAppSessions] = useState([]);
  const [totalUsageHeading, settotalUsageHeading] = useState('');
  const [dailyAverageHeading, setdailyAverageHeading] = useState('');
  // BOTTOM SHEET
  const bottomSheetRef = useRef(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const snapPoints = useMemo(() => ['25%', '99%', '100%'], []);
  // CHART
  const [chartData, setChartData] = useState([
    {hour: '', usage: 0},
    {hour: '', usage: 0},
    {hour: '', usage: 0},
  ]);
  const [loading, setLoading] = useState(false);
  const [formattedChartData, setRormattedChartData] = useState({
    labels: chartData.map(item => item.hour), // This should match your data points
    datasets: [
      {
        data: chartData.map(item => item.usage), // Example data; replace with chartData.map(item => item.usage)
      },
    ],
    legend: ['Usage Time (minutes)'],
  });
  const chartWidth = screenWidth - width * 8;
  const [isLineChart, setisLineChart] = useState(true);
  const [formattedBarChartData, setFormattedBarChartData] = useState(
    {value: 0, label: ''},
    {value: 0, label: ''},
  );
  const [barStyleObject, setbarStyleObject] = useState({
    barWidth: width * 3,
  });

  useEffect(() => {
    const backAction = () => {
      if (isBottomSheetOpen) {
        handleClosePress();
        return true;
      }
      handleClosePress();
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [isBottomSheetOpen]);

  useEffect(() => {
    fetchAppUsageDetails();
    headingStates();
  }, []);

  useEffect(() => {
    fetchAppUsageDetails();
    headingStates();
  }, [selectedDate]);

  useEffect(() => {
    fetchAppSessions();
  }, []);

  useEffect(() => {
    fetchAppSessions();
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      fetchHourlyAppChartData(selectedDate, setChartData, appitem.packageName);
    } else {
      fetchDailyAppChartData(selectedDate, setChartData, appitem.packageName);
    }
  }, []);

  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      fetchHourlyAppChartData(selectedDate, setChartData, appitem.packageName);
    } else {
      fetchDailyAppChartData(selectedDate, setChartData, appitem.packageName);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      const formattedChartData = {
        labels: chartData.map(item => item.hour), // This should match your data points
        datasets: [
          {
            data: chartData.map(item => item.usage), // Example data; replace with chartData.map(item => item.usage)
          },
        ],
        legend: ['App Usage Times'],
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
      console.log(`formattedData Bar: ${JSON.stringify(formattedData)}`);
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
      console.log(`formattedData Bar2: ${JSON.stringify(formattedData)}`);
      setFormattedBarChartData(formattedData);
    }
  }, [chartData]);

  console.log(`packageName ${appitem.packageName}`);
  const fetchAppUsageDetails = async () => {
    const result = await AppUsageModule.getAppUsageDetailsForApp(
      selectedDate.start,
      selectedDate.end,
      appitem.packageName,
    );

    setAppUsageDetails(result);

    console.log(`fetchAppUsageDetSails ${JSON.stringify(result)}`);
    console.log(`totalTimeSpent ${convertTime(result.totalTimeSpent)}`);
    console.log(`appDailyAverage ${convertTime(result.appDailyAverage)}`);
    console.log(`appMonthlyAverage ${convertTime(result.appMonthlyAverage)}`);
  };

  const fetchAppSessions = async () => {
    const response = await AppUsageModule.getAppSessionInfo(
      selectedDate.start,
      selectedDate.end,
      appitem.packageName,
    );

    console.log(`response: ${JSON.stringify(response)}`);
    const sortedData = sortSectionsByDate(response);
    setAppSessions(sortedData);

    // response.forEach(element => {
    //   console.log(`Session ID: ${element.session_id}`);
    //   console.log(
    //     `sessionStartTime ${convertTimestamp(element.sessionStartTime)}`,
    //   );
    //   console.log(`sessionEndTime ${convertTimestamp(element.sessionEndTime)}`);
    //   console.log(`totalTimeSpent ${convertTime(element.totalTimeSpent)}`);
    // });
  };

  const navigateToAppSessions = async () => {
    navigate('AppSessionInfo', {
      appitem: item,
    });
  };

  const renderItem = ({item, index, section}) => {
    const isLastItem = index === section.data.length - 1;
    return (
      <View>
        {index == 0 ? <View style={styles.circle} /> : null}

        <View style={styles.line} />

        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 10,
            marginHorizontal: width * 10,
            marginVertical: height * 1,
            backgroundColor: colors.white,
            overflow: 'hidden',
          }}>
          <View style={styles.itemContainer}>
            <View style={styles.content}>
              <Text style={styles.itemText}>
                {convertTimestamp(item.sessionStartTime)}
              </Text>
              <Image
                source={{uri: `data:image/png;base64,${appitem.appIcon}`}}
                style={styles.appIcon}
              />
              <Text style={styles.itemText}>
                {convertTimestamp(item.sessionEndTime)}
              </Text>
            </View>
          </View>
          <Text style={styles.itemText2}>
            {convertTime(item.totalTimeSpent)}
          </Text>
        </View>
        {isLastItem ? <View style={styles.circle2} /> : null}
      </View>
    );
  };
  const renderSectionHeader = ({section: {title}}) => (
    <Text
      style={{
        alignSelf: 'center',
        marginVertical: height * 2,
        fontFamily: fonts.notosansBold,
        fontSize: 18,
        color: colors.black,
      }}>
      {title}
    </Text>
  );

  const renderBottomSheetContent = useCallback(
    () => (
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container2}>
        <SectionList
          scrollEnabled={false}
          sections={appSessions}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: height * 1,
            paddingBottom: height * 3,
          }}
          keyExtractor={(item, index) => String(index)}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false} // Optional: if you don't want sticky headers
        />
      </ScrollView>
    ),
    [appSessions],
  );

  const handleOpenPress = useCallback(() => {
    bottomSheetRef.current?.expand();
    setIsBottomSheetOpen(true);
  }, []);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsBottomSheetOpen(false);
  }, []);

  const headingStates = async () => {
    const isTodayDate = isToday(selectedDate.start);
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      if (isTodayDate) {
        settotalUsageHeading('Todays Usage');
        setdailyAverageHeading('Daily Average Usage');
        console.log(
          `selectedDate1 strt ${selectedDate.start} end ${selectedDate.end}`,
        );
      } else {
        let text = `Usage on ${format(selectedDate.start, 'MMM d')}`;
        settotalUsageHeading(text);
        setdailyAverageHeading('Daily Average Usage');
        console.log(
          `selectedDate2 strt ${selectedDate.start} end ${selectedDate.end}`,
        );
      }
    } else {
      let text = `Usage ${format(selectedDate.start, 'MMM d')} - ${format(
        selectedDate.end,
        'MMM d',
      )}`;
      let text2 = `Average Usage ${format(
        selectedDate.start,
        'MMM d',
      )} - ${format(selectedDate.end, 'MMM d')}`;
      settotalUsageHeading(text);
      setdailyAverageHeading(text2);
      console.log(
        `selectedDate3 strt ${selectedDate.start} end ${selectedDate.end}`,
      );
    }
  };

  const prepareBarChartData = () => {
    if (selectedDate.start == selectedDate.end || !selectedDate.end) {
      const formattedData = chartData.map(item => ({
        value: item.usage,
        label: convertHourFormat(item.hour),
        frontColor: colors.primary,
      }));
      console.log(`formattedData Bar: ${JSON.stringify(formattedData)}`);
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
      console.log(`formattedData Bar2: ${JSON.stringify(formattedData)}`);
      setFormattedBarChartData(formattedData);
      setisLineChart(false);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: width * 7,
        }}>
        <Image source={{uri: iconUri}} style={styles.appIcon2} />
        <Text
          style={{
            fontFamily: fonts.notosansSemiBold,
            color: colors.black,
            fontSize: 16,
            textAlign: 'center',
            marginTop: width * 2,
          }}>
          {appitem.appName}
        </Text>
      </View>
      <View style={{flexDirection: 'row'}}>
        <View
          style={{
            flex: 1,
            height: height * 12.5,
            backgroundColor: colors.white,
            marginHorizontal: width * 0.23,
            marginVertical: width * 0.23,
            borderRadius: 3,
          }}>
          <Text style={styles.headingText}>{totalUsageHeading}</Text>
          <Text style={styles.reading}>
            {convertTime(appusageDetails.totalTimeSpent)}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            handleOpenPress();
          }}
          style={{
            flex: 1,
            height: height * 12.5,
            backgroundColor: colors.white,
            marginHorizontal: width * 0.23,
            marginVertical: width * 0.23,
            borderRadius: 3,
          }}>
          <AntDesign
            color={colors.black}
            size={18}
            name={'arrowright'}
            style={{position: 'absolute', right: 30, top: 8}}
          />
          <Text style={styles.headingText}>Today's Sessions</Text>
          <Text style={styles.reading}>{appusageDetails.totalAppSessions}</Text>
        </Pressable>
      </View>
      <View style={{flexDirection: 'row'}}>
        <View
          style={{
            flex: 1,
            height: height * 12.5,
            backgroundColor: colors.white,
            marginHorizontal: width * 0.23,
            marginVertical: width * 0.23,
            borderRadius: 3,
          }}>
          <Text style={styles.headingText}>{dailyAverageHeading}</Text>
          <Text style={styles.reading}>
            {convertTime(appusageDetails.appDailyAverage)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            height: height * 12.5,
            backgroundColor: colors.white,
            marginHorizontal: width * 0.23,
            marginVertical: width * 0.23,
            borderRadius: 3,
          }}>
          <Text style={styles.headingText}>Monthly Usage</Text>
          <Text style={styles.reading}>
            {convertTime(appusageDetails.appMonthlyAverage)}
          </Text>
        </View>
      </View>

      <Text
        style={{
          fontFamily: fonts.notosansSemiBold,
          color: colors.black,
          fontSize: 16,
          textAlign: 'left',
          marginTop: width * 2,
          marginLeft: width * 2,
        }}>
        {'Charts'}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignSelf: 'flex-start',
          marginLeft: width * 4,
          marginBottom: width * 4,
          marginTop: width * 4,
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

      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {chartData.length > 0 && (
          <View>
            {/* <Text style={{color:'black'}}>ZZZZZZZZZZZZZZZZZZZZ</Text> */}
            {isLineChart ? (
              <LineChart
                data={formattedChartData}
                width={chartWidth} // from react-native
                height={height * 26}
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
                        return format(value, 'MMM d');
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
                    return '';
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
                yAxisLabelTextStyle={{color: colors.primary, fontSize: 5}} // Customize y-axis label color
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
        )}
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        // onChange={(it) => {
        //   it < 2 ? handleClosePress():null;
        //   // console.log(`bottom sheet: ${it}`)
        // }}
      >
        {renderBottomSheetContent()}
      </BottomSheet>
    </ScrollView>
  );
};

export default AppUsageDetails;
