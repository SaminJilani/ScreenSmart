import {
  Button,
  FlatList,
  Image,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import {styles} from './styles';
import React, {useCallback, useEffect, useState} from 'react';
import {NativeModules} from 'react-native';
import {useSelector} from 'react-redux';
import {
  convertTime,
  convertTimestamp,
  sortSectionsByDate,
} from '../../HelperFunctions/helperFunctions';
import {ListItem} from '@react-native-material/core';
import {colors, fonts} from '../../assets';
import {height, width} from '../../units';

const {AppUsageModule} = NativeModules;

const UsageSessionInfo = ({route, navigation: {navigate}, navigation}) => {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  const handleIncrement = () => {
    setCount(prevCount => 0 + 1);
  };
  const selectedDate = useSelector(state => state?.reducer?.selected_date);
  const [appSessions, setAppSessions] = useState([]);
  useEffect(() => {
    fetchUsageSessions();
  }, []);

  useEffect(() => {
    fetchUsageSessions();
  }, [selectedDate]);

  const fetchUsageSessions = async () => {
    try {
      const response = await AppUsageModule.getUsageSessionInfo(
        selectedDate.start,
        selectedDate.end,
      );

      // console.log(`response: ${JSON.stringify(response)}`);
      const sortedData = sortSectionsByDate(response);
      setAppSessions(sortedData);
      // console.log(`response: ${JSON.stringify(response)}`);
    } catch (error) {
      console.log(`response error: ${error}`);
    }

    // response.forEach(element => {
    //   console.log(`Session ID: ${element.session_id}`);
    //   console.log(
    //     `sessionStartTime ${convertTimestamp(element.sessionStartTime)}`,
    //   );
    //   console.log(`sessionEndTime ${convertTimestamp(element.sessionEndTime)}`);
    //   console.log(`totalTimeSpent ${convertTime(element.totalTimeSpent)}`);
    // });
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
                source={{uri: `data:image/png;base64,${item.appIcon}`}}
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

  // const ChildComponent = React.memo(
  //   ({onClick}) => {
  //     console.log('ChildComponent rendered');
  //     return <Button title="Increment" onPress={()} />;
  //   },
  //   (prevProps, nextProps) => {
  //     // Custom comparison function to prevent re-render if onClick hasn't changed
  //     return true;
  //   },
  // );

  return (
    <View style={styles.container}>
      <FlatList
        style={{marginTop: height * 3}}
        contentContainerStyle={{paddingVertical: height * 2}}
        data={appSessions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />

      <SectionList
        sections={appSessions}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingVertical: height * 2}}
        keyExtractor={(item, index) => String(index)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false} // Optional: if you don't want sticky headers
      />
    </View>
  );
};

export default UsageSessionInfo;

// <View style={styles.container}>
/* <FlatList
        style={{marginTop: height * 3}}
        contentContainerStyle={{paddingVertical: height * 2}}
        data={appSessions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      /> */

/* 
      <SectionList
        sections={appSessions}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingVertical: height * 2}}
        keyExtractor={(item, index) => String(index)}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false} // Optional: if you don't want sticky headers
      /> */

// </View>
