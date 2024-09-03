import {FlatList, Image, SectionList, Text, View} from 'react-native';
import {styles} from './styles';
import {useEffect, useState} from 'react';
import {NativeModules} from 'react-native';
import {useSelector} from 'react-redux';
import {
  convertTime,
  convertTimestamp,
} from '../../HelperFunctions/helperFunctions';
import {ListItem} from '@react-native-material/core';
import {colors, fonts} from '../../assets';
import {height, width} from '../../units';

const {AppUsageModule} = NativeModules;

const AppSessionInfo = ({route, navigation: {navigate}, navigation}) => {
  const {appitem} = route.params;
  const selectedDate = useSelector(state => state?.reducer?.selected_date);
  const [appSessions, setAppSessions] = useState([]);
  useEffect(() => {
    fetchAppSessions();
  }, []);

  useEffect(() => {
    fetchAppSessions();
  }, [selectedDate]);

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

  const sortSectionsByDate = sections => {
    return sections.sort((a, b) => new Date(a.title) - new Date(b.title));
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

  return (
    <View style={styles.container}>
      {/* <FlatList
        style={{marginTop: height * 3}}
        contentContainerStyle={{paddingVertical: height * 2}}
        data={appSessions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      /> */}

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

export default AppSessionInfo;
