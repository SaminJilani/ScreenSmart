import {
  BackHandler,
  Button,
  FlatList,
  Image,
  Modal,
  NativeModules,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
const {AppUsageModule} = NativeModules;
import {styles} from './styles';
import {Pressable} from '@react-native-material/core';
import {colors, fonts} from '../../assets';
import BottomSheet from '@gorhom/bottom-sheet';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {TimeSelector} from './TimeSelector';
import {Picker} from 'react-native-wheel-pick';
import {hourPickerData, minutesPickerData} from './utility';
import {retrieveStringData, storage, storeData} from '../../AsyncStorageHelper';
import RNPickerSelect from 'react-native-picker-select';
import FastImage from 'react-native-fast-image';
import {height, screenWidth, width} from '../../units';
import {KEYS, createFilter} from 'react-native-search-filter';
import {
  convertTime,
  initiateAppUsageLimits,
} from '../../HelperFunctions/helperFunctions';
import AntDesign from 'react-native-vector-icons/AntDesign';
import {MMKV} from 'react-native-mmkv';

const AppUsageLimitScreen = ({route, navigation: {navigate}, navigation}) => {
  //  SCREEN RELATED
  // const storage = new MMKV();
  const [usageLimitApps, setUsageLimitApps] = useState([]);

  // BOTTOM SHEET RELATED
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['25%', '68%'], []);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [totalTimeMilli, setTotalTimeMilli] = useState(0);
  const [apps, setApps] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState(null);
  const KEYS_TO_FILTERS = ['appName'];

  const filteredApps = searchText
    ? apps.filter(createFilter(searchText, KEYS_TO_FILTERS))
    : apps;

  // Handle back button press
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

  const getApps = async () => {
    try {
      const installedAppsLocal = await storage.getString('installed_apps');
      if (!installedAppsLocal) {
        const installedApps = await AppUsageModule.getInstalledApps();
        console.log(`installedApps==> ${installedApps.length}`);
        storage.set('installed_apps', JSON.stringify(installedApps));
        setApps(installedApps);
      } else {
        const installedApps = JSON.parse(installedAppsLocal);
        console.log(`installedApps 2==> ${installedApps.length}`);
        setApps(installedApps);
      }
    } catch (error) {
      console.log(`getApps error==> ${error}`);
    }
  };

  useEffect(() => {
    const result = usageLimitApps.map(
      ({appName, packageName, allowedTimeLimit}) => ({
        appName,
        packageName,
        allowedTimeLimit,
      }),
    );

    console.log(`usageLimitApps changed ==> ${JSON.stringify(result)}`);
    initiateAppUsageLimits(result);
  }, [usageLimitApps]);

  useEffect(() => {
    FetchUsageLimitApps();
  }, []);
  const FetchUsageLimitApps = async () => {
    try {
      const list = await storage.getString('usage_limit_apps');
      if (list) {
        setUsageLimitApps(JSON.parse(list));
      }
    } catch (error) {
      console.log(`FetchUsageLimitApps error==> ${error}`);
    }
  };

  // Handle back button press
  useEffect(() => {
    const selectedHourMilli = selectedHour * 60 * 60 * 1000;
    const selectedMinutesMilli = selectedMinute * 60 * 1000;
    const total = selectedHourMilli + selectedMinutesMilli;

    setTotalTimeMilli(total);
  }, [selectedHour, selectedMinute]);

  const handleOpenPress = useCallback(() => {
    getApps();

    bottomSheetRef.current?.expand();
    setIsBottomSheetOpen(true);
  }, []);

  const handleClosePress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsBottomSheetOpen(false);
  }, []);

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        setSelectedApp(item);
        setModalVisible(false);
      }}>
      <Image
        style={styles.icon}
        source={{uri: `data:image/png;base64,${item.appIcon}`}}
        resizeMode="contain"
      />
      <Text style={styles.label}>{item.appName}</Text>
    </TouchableOpacity>
  );

  const renderusageLimitAppsItem = ({item}) => (
    <Pressable
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: width * 4,
      }}
      onPress={() => {
        setSelectedApp(item);
        console.log(`onPress==> ${item}`);
        setSelectedHour(item.selectedHour);
        setSelectedMinute(item.selectedMinute);
        setModalVisible(false);
        handleOpenPress();
      }}>
      <Image
        style={styles.icon}
        source={{uri: `data:image/png;base64,${item.appIcon}`}}
        resizeMode="contain"
      />
      <View>
        <Text
          style={{
            fontFamily: fonts.notosansBold,
            color: colors.black,
            fontSize: 18,
          }}>
          {item.appName}
        </Text>
        <Text
          style={{
            fontFamily: fonts.notosans,
            color: colors.black,
            fontSize: 15,
          }}>
          {`Blocked daily after ${convertTime(item.allowedTimeLimit)} of use `}
        </Text>
      </View>
    </Pressable>
  );

  const AddAppToUsageLimit = () => {
    const selectedHourMilli = selectedHour * 60 * 60 * 1000;
    const selectedMinutesMilli = selectedMinute * 60 * 1000;
    const total = selectedHourMilli + selectedMinutesMilli;

    const app = {
      appName: selectedApp.appName,
      packageName: selectedApp.packageName,
      appIcon: selectedApp.appIcon,
      allowedTimeLimit: total,
      selectedHour: selectedHour,
      selectedMinute: selectedMinute,
    };

    const app_for_service = {
      appName: selectedApp.appName,
      packageName: selectedApp.packageName,
      allowedTimeLimit: total,
    };

    // LOGIC
    setUsageLimitApps(prevState => {
      const index = prevState.findIndex(
        existingApp => existingApp.appName === app.appName,
      );

      if (index !== -1) {
        // If app with the same appName exists, update it
        const updatedApps = [...prevState];
        updatedApps[index] = app;
        storeData('usage_limit_apps', JSON.stringify(updatedApps));
        return updatedApps;
      } else {
        // If app with the same appName doesn't exist, add the new app
        storeData('usage_limit_apps', JSON.stringify([...prevState, app]));
        return [...prevState, app];
      }
    });

    // CLEANUP
    setSelectedApp(null);
    setSelectedMinute(0);
    setSelectedHour(0);
    setTotalTimeMilli(0);
    setApps([]);
    setSearchText(null);
    handleClosePress();
  };

  const DeleteAppFromUsageLimit = () => {
    const selectedHourMilli = selectedHour * 60 * 60 * 1000;
    const selectedMinutesMilli = selectedMinute * 60 * 1000;
    const total = selectedHourMilli + selectedMinutesMilli;

    const app = {
      appName: selectedApp.appName,
      packageName: selectedApp.packageName,
      appIcon: selectedApp.appIcon,
      allowedTimeLimit: total,
      selectedHour: selectedHour,
      selectedMinute: selectedMinute,
    };

    const app_for_service = {
      appName: selectedApp.appName,
      packageName: selectedApp.packageName,
      allowedTimeLimit: total,
    };

    // LOGIC
    setUsageLimitApps(prevState => {
      const apps = usageLimitApps.filter(
        app => app.appName !== selectedApp.appName,
      );
      storeData('usage_limit_apps', JSON.stringify(apps));
      return apps;
    });

    // CLEANUP
    setSelectedApp(null);
    setSelectedMinute(0);
    setSelectedHour(0);
    setTotalTimeMilli(0);
    setApps([]);
    setSearchText(null);
    handleClosePress();
  };

  const handleAddbutton = async () => {
    const granted = await AppUsageModule.checkIfOverlayPermissionGranted();
    if (granted) {
      setSelectedApp(null);
      setSelectedMinute(0);
      setSelectedHour(0);
      handleOpenPress();
    }
  };
  return (
    <View style={styles.container}>
      <Text
        style={{
          fontFamily: fonts.notosansBold,
          color: colors.black,
          fontSize: 17,
          padding: 16,
        }}>
        Daily Usage Limit
      </Text>

      <FlatList
        data={usageLimitApps}
        showsVerticalScrollIndicator={false}
        renderItem={renderusageLimitAppsItem}
        keyExtractor={(item, index) => String(index)}
        style={{marginTop: height * 1, flexGrow: 1, flex: 1}}
      />

      <View style={styles.floatingView}>
        <Pressable
          style={styles.floatingButton}
          pressEffect="android-ripple"
          android_ripple={{borderless: true}}
          onPress={() => {
            handleAddbutton();
          }}>
          <Text
            style={{color: colors.white, fontFamily: fonts.notosansSemiBold}}>
            + Add Usage Limit
          </Text>
        </Pressable>
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
        <View style={styles.sheetcontainer}>
          {selectedApp ? (
            <Pressable
              style={styles.deleteButton}
              onPress={() => {
                DeleteAppFromUsageLimit();
              }}>
              <AntDesign name={'delete'} size={30} color={colors.black} />
            </Pressable>
          ) : null}

          <Pressable
            style={styles.dropdown}
            onPress={() => setModalVisible(true)}>
            {selectedApp ? (
              <Image
                style={styles.icon}
                source={{uri: `data:image/png;base64,${selectedApp.appIcon}`}}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.selectedText}>
              {selectedApp ? selectedApp.appName : 'Select an App'}
            </Text>
          </Pressable>

          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  value={searchText}
                  onChangeText={setSearchText}
                />
                <FlatList
                  data={filteredApps}
                  showsVerticalScrollIndicator={false}
                  renderItem={renderItem}
                  keyExtractor={item => item.packageName}
                  contentContainerStyle={styles.listContainer}
                  style={{flexGrow: 1}}
                />
              </View>
            </View>
          </Modal>

          <Text
            style={{
              fontFamily: fonts.notosans,
              color: colors.black,
              fontSize: 15,
              marginTop: height * 4,
            }}>
            {'Limit Time'}
          </Text>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              alignSelf: 'stretch',
              marginTop: height * 2,
            }}>
            <Picker
              selectedValue={selectedHour}
              selectTextColor={colors.black}
              pickerData={hourPickerData}
              textSize={13}
              onValueChange={value => {
                setSelectedHour(value);
              }}
            />

            <Picker
              selectedValue={selectedMinute}
              selectTextColor={colors.black}
              pickerData={minutesPickerData}
              textSize={13}
              onValueChange={value => {
                setSelectedMinute(value);
              }}
            />
          </View>
          <Pressable style={styles.saveButton} onPress={AddAppToUsageLimit}>
            <Text
              style={{
                color: colors.primary,
                fontFamily: fonts.notosansSemiBold,
                fontSize: 16,
              }}>
              Save
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
};

export default AppUsageLimitScreen;
