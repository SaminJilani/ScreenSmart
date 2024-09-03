import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from 'react-native-wheel-pick';
import WheelPicker from 'react-native-wheely';


const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

export const TimeSelector = () => {
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const generatePickerData = () => {
    return Array.from({ length: 25 }, (_, i) => ({
      value: (i).toString(), // Use (i + 1) to get values from 1 to 24
      label: `${i} hr`,
    }));
  };

  const pickerData = generatePickerData();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Time</Text>
      <View style={styles.pickersContainer}>

      <Picker
        selectedValue='5765387680'
        selectTextColor='green'
        
        pickerData={[
            { value : '5765387677', label : 'item1' },
            { value : '5765387678', label : 'item2' },
            { value : '5765387679', label : 'item3' },
            { value : '5765387680', label : 'item4' },
            { value : '5765387681', label : 'item5' },
            { value : '5765387682', label : 'item6' },
            { value : '5765387683', label : 'item7' },
        ]}
        onValueChange={value => { console.log(value) }} // '5765387680'
        />
      </View>
      <Text style={styles.selectedTimeText}>
        Selected Time: {hours[selectedHour]}:{minutes[selectedMinute]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  label: {
    fontSize: 18,
    marginBottom: 16,
  },
  pickersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    width: 100,
    height: 150,
  },
  colon: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  selectedTimeText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// export default TimeSelector;
