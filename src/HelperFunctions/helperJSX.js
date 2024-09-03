import {useEffect, useState} from 'react';
import {
  Button,
  Modal,
  NativeModules,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Calendar, CalendarList} from 'react-native-calendars';
import ModalDropdown from 'react-native-modal-dropdown';
import {format, addDays, subDays, parseISO, isValid} from 'date-fns';
import {height, width} from '../units';
import {changeEndingDate, changeSelectedDate} from '../Redux/actions';
import {useDispatch} from 'react-redux';
import {colors, fonts} from '../assets';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {Pressable} from '@react-native-material/core';
import {notifyMessage} from './helperFunctions';
const {AppUsageModule} = NativeModules;

export const CustomTabBar = ({state, descriptors, navigation}) => {
  const date = new Date().toISOString().split('T')[0];
  const dateObj = {start: date, end: null};
  const formatted0 = format(new Date(date), 'MMMM dd, yyyy');
  const [selectedDate, setSelectedDate] = useState(dateObj);
  const [formattedCurrentDate, setFormattedCurrentDate] = useState(formatted0);
  const [isModalVisible, setModalVisible] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [installDate, setInstallDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);
  const options = ['Today', 'Yesterday', 'Choose date'];
  const dispatch = useDispatch();
  const maxDate = format(new Date(), 'yyyy-MM-dd');
  const minDate = installDate
    ? format(subDays(installDate, 5), 'yyyy-MM-dd')
    : null;

  useEffect(() => {
    console.log('selectedDate changed:', selectedDate.start);
    if (selectedDate.start) {
      if (selectedDate.start == selectedDate.end || !selectedDate.end) {
        const formatted0 = format(
          new Date(selectedDate.start),
          'MMMM dd, yyyy',
        );
        setFormattedCurrentDate(formatted0);
        changeSD(selectedDate);
      } else {
        // do your work here
        const formattedStart = format(
          new Date(selectedDate.start),
          'MMM dd, yyyy',
        );
        const formattedEnd = format(new Date(selectedDate.end), 'MMM dd, yyyy');
        setFormattedCurrentDate(`${formattedStart} - ${formattedEnd}`);
        changeSD(selectedDate);
      }
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchInstallDate = async () => {
      try {
        const date = await AppUsageModule.getAppInstallationDate();
        const dateObject = parseISO(date);
        console.log('getAppInstallationDate :', date);
        setInstallDate(dateObject);
      } catch (error) {
        console.log('fetchInstallDate err:', error);
      }
    };

    fetchInstallDate();
  }, []);
  useEffect(() => {
    console.log('tempStartDate:', tempStartDate);
    console.log('tempEndDate:', tempEndDate);
  }, [tempStartDate, tempEndDate]);

  const changeSD = async date => {
    await dispatch(changeSelectedDate(date));
    // await dispatch(changeEndingDate(enddate));
  };

  const handleDateChange = (index, value) => {
    let updatedDateObj;
    switch (value) {
      case 'Today':
        updatedDateObj = {
          ...selectedDate,
          start: format(new Date(), 'yyyy-MM-dd'),
          end: null,
        };
        setSelectedDate(updatedDateObj);
        setTempStartDate(null);
        setTempEndDate(null);
        break;
      case 'Yesterday':
        updatedDateObj = {
          ...selectedDate,
          start: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
          end: null,
        };
        setSelectedDate(updatedDateObj);
        setTempStartDate(null);
        setTempEndDate(null);
        break;
      // case 'Last 12 days':
      //   updatedDateObj = {
      //     ...selectedDate,
      //     start: format(new Date(), 'yyyy-MM-dd'),
      //     end: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
      //   };
      //   setSelectedDate(updatedDateObj);
      //   setTempStartDate(null);
      //   setTempEndDate(null);
      //   break;
      // case 'Last month':
      //   updatedDateObj = {
      //     ...selectedDate,
      //     start: format(new Date(), 'yyyy-MM-dd'),
      //     end: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      //   };
      //   setSelectedDate(updatedDateObj);
      //   setTempStartDate(null);
      //   setTempEndDate(null);
      //   break;
      case 'Choose date':
        setModalVisible(true);
        return;
    }
  };

  const handleRightArrowPress = () => {
    console.log(`${selectedDate.start}-- ${selectedDate.end}`);

    // Parse minDate and maxDate to compare
    const parsedMinDate = minDate ? parseISO(minDate) : null;
    const parsedMaxDate = parseISO(maxDate);

    if (
      (selectedDate.start && !selectedDate.end) ||
      selectedDate.start === selectedDate.end
    ) {
      const currentStartDate = parseISO(selectedDate.start);
      const newStartDate = addDays(currentStartDate, 1);

      // Check if the newStartDate is within the allowed range
      if (parsedMinDate && newStartDate < parsedMinDate) {
        notifyMessage('New date is less than the minimum date allowed');
        return;
      }

      if (newStartDate > parsedMaxDate) {
        notifyMessage('New date cannot be a future date.');
        return;
      }

      const formattedNewStartDate = format(newStartDate, 'yyyy-MM-dd');
      const updatedDateObj = {
        ...selectedDate,
        start: formattedNewStartDate,
        end: null,
      };
      console.log(`updatedDateObj ${JSON.stringify(updatedDateObj)}`);
      setSelectedDate(updatedDateObj);
    } else {
      console.log(`double dates right navigation`);
      const currentStartDate = parseISO(selectedDate.start);
      const currentEndDate = parseISO(selectedDate.end);
      const newStartDate = addDays(currentStartDate, 1);
      const newEndDate = addDays(currentEndDate, 1);

      // Check if the newStartDate and newEndDate are within the allowed range
      if (
        parsedMinDate &&
        (newStartDate < parsedMinDate || newEndDate < parsedMinDate)
      ) {
        console.log('New date range is less than minDate. Not updating state.');
        return;
      }

      if (newStartDate > parsedMaxDate || newEndDate > parsedMaxDate) {
        console.log(
          'New date range is greater than maxDate. Not updating state.',
        );
        return;
      }

      const formattedNewStartDate = format(newStartDate, 'yyyy-MM-dd');
      const formattedNewEndDate = format(newEndDate, 'yyyy-MM-dd');
      const updatedDateObj = {
        ...selectedDate,
        start: formattedNewStartDate,
        end: formattedNewEndDate,
      };
      setSelectedDate(updatedDateObj);
    }
  };

  const handleLeftArrowPress = () => {
    console.log(`${selectedDate.start}-- ${selectedDate.end}`);

    // Parse minDate and maxDate to compare
    const parsedMinDate = minDate ? parseISO(minDate) : null;
    const parsedMaxDate = parseISO(maxDate);

    if (
      (selectedDate.start && !selectedDate.end) ||
      selectedDate.start === selectedDate.end
    ) {
      const currentStartDate = parseISO(selectedDate.start);
      const newStartDate = subDays(currentStartDate, 1);

      // Check if the newStartDate is within the allowed range
      if (parsedMinDate && newStartDate < parsedMinDate) {
        notifyMessage('New date is less than the minimum date allowed');
        return;
      }

      if (newStartDate > parsedMaxDate) {
        console.log(
          'New start date is greater than maxDate. Not updating state.',
        );
        return;
      }

      const formattedNewStartDate = format(newStartDate, 'yyyy-MM-dd');
      console.log(`newStartDate: ${formattedNewStartDate}`);
      const updatedDateObj = {
        ...selectedDate,
        start: formattedNewStartDate,
        end: null,
      };
      console.log(`updatedDateObj ${JSON.stringify(updatedDateObj)}`);
      setSelectedDate(updatedDateObj);
    } else {
      const currentStartDate = parseISO(selectedDate.start);
      const currentEndDate = parseISO(selectedDate.end);
      const newStartDate = subDays(currentStartDate, 1);
      const newEndDate = subDays(currentEndDate, 1);

      // Check if the newStartDate and newEndDate are within the allowed range
      if (
        parsedMinDate &&
        (newStartDate < parsedMinDate || newEndDate < parsedMinDate)
      ) {
        console.log('New date range is less than minDate. Not updating state.');
        return;
      }

      if (newStartDate > parsedMaxDate || newEndDate > parsedMaxDate) {
        notifyMessage('New date cannot be a future date.');
        return;
      }

      const formattedNewStartDate = format(newStartDate, 'yyyy-MM-dd');
      const formattedNewEndDate = format(newEndDate, 'yyyy-MM-dd');
      const updatedDateObj = {
        ...selectedDate,
        start: formattedNewStartDate,
        end: formattedNewEndDate,
      };
      setSelectedDate(updatedDateObj);
    }
  };

  const handleDateSelect = day => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(day.dateString);
      setTempEndDate(null);
      setMarkedDates({
        [day.dateString]: {selected: true, startingDay: true, color: 'green'},
      });
    } else if (
      tempStartDate &&
      !tempEndDate &&
      day.dateString >= tempStartDate
    ) {
      setTempEndDate(day.dateString);
      const newMarkedDates = {...markedDates};
      let currentDate = tempStartDate;

      while (currentDate <= day.dateString) {
        newMarkedDates[currentDate] = {
          selected: true,
          color: 'green',
          textColor: 'white',
        };
        currentDate = format(addDays(parseISO(currentDate), 1), 'yyyy-MM-dd');
      }
      newMarkedDates[tempStartDate].startingDay = true;
      newMarkedDates[day.dateString].endingDay = true;
      setMarkedDates(newMarkedDates);
    } else {
      setTempStartDate(day.dateString);
      setTempEndDate(null);
      setMarkedDates({
        [day.dateString]: {selected: true, startingDay: true, color: 'green'},
      });
    }
  };

  const handleSelect = () => {
    // setStartDate(tempStartDate);
    // setEndDate(tempEndDate);
    if (tempStartDate) {
      const updatedDateObj = {
        ...selectedDate,
        start: tempStartDate,
        end: tempEndDate,
      };
      setSelectedDate(updatedDateObj);
    }
    setModalVisible(false);
  };

  const handleClearSelection = () => {
    setStartDate(null);
    setEndDate(null);
    setTempStartDate(null);
    setTempEndDate(null);
    setMarkedDates({});
  };

  return (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={{width: '13%'}}
        onPress={() => handleLeftArrowPress()}>
        <Text style={styles.arrow}>{'<<'}</Text>
      </TouchableOpacity>
      <ModalDropdown
        options={options}
        onSelect={handleDateChange}
        saveScrollPosition={false}
        renderRow={(option, index, isSelected) => (
          <View style={{padding: 10, backgroundColor: colors.white}}>
            <Text style={{color: isSelected ? colors.primary : 'black'}}>
              {option}
            </Text>
          </View>
        )}
        dropdownTextStyle={{height: height * 7, color: colors.black}}
        textStyle={{color: colors.black}}>
        <View style={{flexDirection: 'row'}}>
          <Text
            style={{
              color: 'black',
              fontFamily: fonts.notosansBold,
              marginRight: width * 3,
            }}>
            {formattedCurrentDate}
          </Text>
          <FontAwesome name={'calendar'} size={18} color={colors.black} />
        </View>
      </ModalDropdown>
      <TouchableOpacity
        style={{width: '13%', alignItems: 'flex-end'}}
        onPress={() => handleRightArrowPress()}>
        <Text style={styles.arrow}>{'>>'}</Text>
      </TouchableOpacity>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modal}>
          <Calendar
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            markingType={'period'}
            minDate={minDate}
            maxDate={maxDate}
          />
          <Button title="Select" onPress={handleSelect} />
          <Button title="Clear" onPress={handleClearSelection} />
          <Button title="Close" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    height: 60,
    alignItems: 'center',
  },
  arrow: {
    fontSize: 24,
    fontFamily: fonts.notosansLight,
    color: 'black',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  calendar: {
    width: '100%',
  },
});
